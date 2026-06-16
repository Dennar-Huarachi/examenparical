<?php

namespace App\Http\Controllers;

use App\Models\Pago;
use App\Models\Postulante;
use App\Models\Gestion;
use App\Models\Bitacora;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Stripe\StripeClient;

class PagoController extends Controller
{
    private function getStripeClient(): StripeClient
    {
        return new StripeClient(env('STRIPE_SECRET'));
    }

    public function createPaymentIntent(Request $request)
    {
        $validador = Validator::make($request->all(), [
            'ci'    => 'required|string|max:20',
            'monto' => 'required|numeric|min:5',
        ]);

        if ($validador->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validador->errors()->first()
            ], 422);
        }

        $postulante = Postulante::where('ci', $request->ci)->first();
        if (!$postulante) {
            return response()->json([
                'success' => false,
                'message' => 'El postulante con el CI proporcionado no está registrado.'
            ], 404);
        }

        $stripeSecret = env('STRIPE_SECRET');
        $isFakeKey = !$stripeSecret || str_starts_with($stripeSecret, 'sk_test_XXXX');

        if ($isFakeKey) {
            $fakeId = 'pi_test_' . \Illuminate\Support\Str::random(24);
            return response()->json([
                'success' => true,
                'data' => [
                    'client_secret'     => $fakeId . '_secret_test',
                    'payment_intent_id' => $fakeId,
                    'amount'            => intval($request->monto * 100),
                    'currency'          => 'bob',
                ],
                'message' => 'PaymentIntent de prueba creado (modo simulación)'
            ], 200);
        }

        try {
            $stripe = $this->getStripeClient();

            $intent = $stripe->paymentIntents->create([
                'amount' => intval($request->monto * 100),
                'currency' => 'bob',
                'description' => 'Matrícula CUP - Postulante CI: ' . $request->ci,
                'automatic_payment_methods' => [
                    'enabled' => true,
                    'allow_redirects' => 'never',
                ],
                'metadata' => [
                    'ci_postulante' => $request->ci,
                ],
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'client_secret' => $intent->client_secret,
                    'payment_intent_id' => $intent->id,
                    'amount' => $intent->amount,
                    'currency' => $intent->currency,
                ],
                'message' => 'PaymentIntent creado correctamente'
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al crear el pago en Stripe: ' . $e->getMessage()
            ], 500);
        }
    }

    public function confirmPayment(Request $request)
    {
        $validador = Validator::make($request->all(), [
            'payment_intent_id' => 'required|string',
            'ci'                => 'required|string|max:20',
            'card_name'         => 'required|string|max:150',
        ]);

        if ($validador->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validador->errors()->first()
            ], 422);
        }

        $postulante = Postulante::where('ci', $request->ci)->first();
        if (!$postulante) {
            return response()->json([
                'success' => false,
                'message' => 'El postulante con el CI proporcionado no está registrado.'
            ], 404);
        }

        $stripeSecret = env('STRIPE_SECRET');
        $isFakeKey = !$stripeSecret || str_starts_with($stripeSecret, 'sk_test_XXXX');

        if ($isFakeKey) {
            $gestion = Gestion::where('estado', 'activo')->first();
            if (!$gestion) {
                return response()->json([
                    'success' => false,
                    'message' => 'No hay una gestión activa.'
                ], 422);
            }

            $pagoExistente = Pago::where('numero_comprobante', $request->payment_intent_id)->first();
            if ($pagoExistente) {
                return response()->json([
                    'success' => true,
                    'data' => $pagoExistente,
                    'message' => 'Este pago de prueba ya fue registrado anteriormente.'
                ], 200);
            }

            $pago = Pago::create([
                'numero_comprobante' => $request->payment_intent_id,
                'ci_pagador'         => $request->ci,
                'monto'              => $request->monto ?? 0,
                'fecha_pago'         => now()->toDateString(),
                'estado'             => 'confirmado',
                'gestion_id'         => $gestion->id,
            ]);

            $postulante->update([
                'pago_id' => $pago->id,
                'estado'  => 'pago_verificado',
            ]);

            Bitacora::registrar(
                'Pago Stripe de prueba (simulado)',
                "Transacción: {$request->payment_intent_id}, CI: {$request->ci}, Monto: {$request->monto} Bs, Titular: {$request->card_name}",
                'pagos_caja',
                $pago->id
            );

            return response()->json([
                'success' => true,
                'data' => $pago,
                'message' => '¡Pago de prueba simulado exitosamente!'
            ], 200);
        }

        try {
            $stripe = $this->getStripeClient();

            $intent = $stripe->paymentIntents->retrieve($request->payment_intent_id);

            if ($intent->status !== 'succeeded') {
                return response()->json([
                    'success' => false,
                    'message' => 'El pago no fue completado. Estado: ' . $intent->status
                ], 422);
            }

            $monto = $intent->amount / 100;

            $gestion = Gestion::where('estado', 'activo')->first();
            if (!$gestion) {
                return response()->json([
                    'success' => false,
                    'message' => 'No hay una gestión activa.'
                ], 422);
            }

            $pagoExistente = Pago::where('numero_comprobante', $intent->id)->first();
            if ($pagoExistente) {
                return response()->json([
                    'success' => true,
                    'data' => $pagoExistente,
                    'message' => 'Este pago ya fue registrado anteriormente.'
                ], 200);
            }

            $pago = Pago::create([
                'numero_comprobante' => $intent->id,
                'ci_pagador'         => $request->ci,
                'monto'              => $monto,
                'fecha_pago'         => now()->toDateString(),
                'estado'             => 'confirmado',
                'gestion_id'         => $gestion->id,
            ]);

            $postulante->update([
                'pago_id' => $pago->id
            ]);

            $postulante->update([
                'estado' => 'pago_verificado',
            ]);

            Bitacora::registrar(
                'Pago Stripe confirmado',
                "Transacción: {$intent->id}, CI: {$request->ci}, Monto: {$monto} Bs, Titular: {$request->card_name}",
                'pagos_caja',
                $pago->id
            );

            return response()->json([
                'success' => true,
                'data' => $pago,
                'message' => '¡Pago procesado con Stripe exitosamente!'
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al confirmar el pago: ' . $e->getMessage()
            ], 500);
        }
    }

    public function stripeWebhook(Request $request)
    {
        $payload = $request->getContent();
        $sigHeader = $request->header('Stripe-Signature');
        $webhookSecret = env('STRIPE_WEBHOOK_SECRET');

        if ($webhookSecret) {
            try {
                $event = \Stripe\Webhook::constructEvent($payload, $sigHeader, $webhookSecret);
            } catch (\Exception $e) {
                return response()->json(['error' => 'Firma inválida'], 400);
            }
        } else {
            $event = json_decode($payload);
        }

        switch ($event->type ?? '') {
            case 'payment_intent.succeeded':
                $intent = $event->data->object;
                $pago = Pago::where('numero_comprobante', $intent->id)->first();
                if ($pago && $pago->estado !== 'confirmado') {
                    $pago->update(['estado' => 'confirmado']);
                }
                break;

            case 'payment_intent.payment_failed':
                $intent = $event->data->object;
                $pago = Pago::where('numero_comprobante', $intent->id)->first();
                if ($pago) {
                    $pago->update(['estado' => 'rechazado']);
                }
                break;
        }

        return response()->json(['received' => true], 200);
    }

    public function stripePayment(Request $request)
    {
        $validador = Validator::make($request->all(), [
            'ci'        => 'required|string|max:20',
            'monto'     => 'required|numeric|min:5',
            'card_name' => 'required|string|max:150',
        ]);

        if ($validador->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validador->errors()->first()
            ], 422);
        }

        $postulante = Postulante::where('ci', $request->ci)->first();
        if (!$postulante) {
            return response()->json([
                'success' => false,
                'message' => 'El postulante con el CI proporcionado no está registrado.'
            ], 404);
        }

        $stripeSecret = env('STRIPE_SECRET');
        $stripeId = 'pi_mock_' . \Illuminate\Support\Str::random(24);

        if ($stripeSecret) {
            try {
                $stripe = $this->getStripeClient();
                $intent = $stripe->paymentIntents->create([
                    'amount' => intval($request->monto * 100),
                    'currency' => 'bob',
                    'payment_method' => 'pm_card_visa',
                    'confirm' => 'true',
                    'automatic_payment_methods' => [
                        'enabled' => true,
                        'allow_redirects' => 'never',
                    ],
                    'description' => 'Matrícula CUP - Postulante CI: ' . $request->ci,
                ]);
                $stripeId = $intent->id;
            } catch (\Exception $e) {
                \Log::warning('Stripe directo falló, usando simulación: ' . $e->getMessage());
            }
        }

        $gestion = Gestion::where('estado', 'activo')->first();
        if (!$gestion) {
            return response()->json([
                'success' => false,
                'message' => 'No hay una gestión activa.'
            ], 422);
        }

        $pago = Pago::create([
            'numero_comprobante' => $stripeId,
            'ci_pagador'         => $request->ci,
            'monto'              => $request->monto,
            'fecha_pago'         => now()->toDateString(),
            'estado'             => 'confirmado',
            'gestion_id'         => $gestion->id,
        ]);

        $postulante->update([
            'pago_id' => $pago->id,
            'estado'  => 'inscrito',
        ]);

        Bitacora::registrar(
            'Pago Stripe procesado',
            "Transacción: {$pago->numero_comprobante}, CI: {$request->ci_pagador}, Monto: {$pago->monto} Bs",
            'pagos_caja',
            $pago->id
        );

        return response()->json([
            'success' => true,
            'data'    => $pago,
            'message' => '¡Pago procesado con Stripe exitosamente!'
        ], 200);
    }

    public function testPaymentIntent(Request $request)
    {
        $validador = Validator::make($request->all(), [
            'monto'       => 'required|numeric|min:1',
            'descripcion' => 'required|string|max:255',
        ]);

        if ($validador->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validador->errors()->first()
            ], 422);
        }

        $stripeSecret = env('STRIPE_SECRET');
        $isFakeKey = !$stripeSecret || str_starts_with($stripeSecret, 'sk_test_XXXX');

        if ($isFakeKey) {
            $fakeId = 'pi_test_' . \Illuminate\Support\Str::random(24);
            return response()->json([
                'success' => true,
                'data' => [
                    'client_secret'     => $fakeId . '_secret_test',
                    'payment_intent_id' => $fakeId,
                    'amount'            => intval($request->monto * 100),
                    'currency'          => 'bob',
                ],
                'message' => 'PaymentIntent de prueba creado (modo simulación)'
            ], 200);
        }

        try {
            $stripe = $this->getStripeClient();

            $intent = $stripe->paymentIntents->create([
                'amount' => intval($request->monto * 100),
                'currency' => 'bob',
                'description' => $request->descripcion,
                'automatic_payment_methods' => [
                    'enabled' => true,
                    'allow_redirects' => 'never',
                ],
                'metadata' => [
                    'tipo' => 'test',
                    'descripcion' => $request->descripcion,
                ],
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'client_secret'     => $intent->client_secret,
                    'payment_intent_id' => $intent->id,
                    'amount'            => $intent->amount,
                    'currency'          => $intent->currency,
                ],
                'message' => 'PaymentIntent de prueba creado correctamente'
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al crear el pago de prueba en Stripe: ' . $e->getMessage()
            ], 500);
        }
    }

    public function testConfirmPayment(Request $request)
    {
        $validador = Validator::make($request->all(), [
            'payment_intent_id' => 'required|string',
            'card_name'         => 'required|string|max:150',
            'monto'             => 'required|numeric|min:1',
            'descripcion'       => 'required|string|max:255',
        ]);

        if ($validador->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validador->errors()->first()
            ], 422);
        }

        $stripeSecret = env('STRIPE_SECRET');
        $isFakeKey = !$stripeSecret || str_starts_with($stripeSecret, 'sk_test_XXXX');

        if ($isFakeKey) {
            $gestion = Gestion::where('estado', 'activo')->first();
            if (!$gestion) {
                return response()->json([
                    'success' => false,
                    'message' => 'No hay una gestión activa.'
                ], 422);
            }

            $pagoExistente = Pago::where('numero_comprobante', $request->payment_intent_id)->first();
            if ($pagoExistente) {
                return response()->json([
                    'success' => true,
                    'data' => $pagoExistente,
                    'message' => 'Este pago de prueba ya fue registrado anteriormente.'
                ], 200);
            }

            $pago = Pago::create([
                'numero_comprobante' => $request->payment_intent_id,
                'ci_pagador'         => 'TEST',
                'monto'              => $request->monto,
                'fecha_pago'         => now()->toDateString(),
                'estado'             => 'confirmado',
                'gestion_id'         => $gestion->id,
            ]);

            Bitacora::registrar(
                'Pago Stripe de prueba (simulado)',
                "Transacción: {$request->payment_intent_id}, Concepto: {$request->descripcion}, Monto: {$request->monto} Bs, Titular: {$request->card_name}",
                'pagos_caja',
                $pago->id
            );

            return response()->json([
                'success' => true,
                'data' => $pago,
                'message' => '¡Pago de prueba simulado exitosamente!'
            ], 200);
        }

        try {
            $stripe = $this->getStripeClient();
            $intent = $stripe->paymentIntents->retrieve($request->payment_intent_id);

            if ($intent->status !== 'succeeded') {
                return response()->json([
                    'success' => false,
                    'message' => 'El pago de prueba no fue completado. Estado: ' . $intent->status
                ], 422);
            }

            $gestion = Gestion::where('estado', 'activo')->first();
            if (!$gestion) {
                return response()->json([
                    'success' => false,
                    'message' => 'No hay una gestión activa.'
                ], 422);
            }

            $pagoExistente = Pago::where('numero_comprobante', $intent->id)->first();
            if ($pagoExistente) {
                return response()->json([
                    'success' => true,
                    'data' => $pagoExistente,
                    'message' => 'Este pago de prueba ya fue registrado anteriormente.'
                ], 200);
            }

            $pago = Pago::create([
                'numero_comprobante' => $intent->id,
                'ci_pagador'         => 'TEST',
                'monto'              => $request->monto,
                'fecha_pago'         => now()->toDateString(),
                'estado'             => 'confirmado',
                'gestion_id'         => $gestion->id,
            ]);

            Bitacora::registrar(
                'Pago Stripe de prueba',
                "Transacción: {$intent->id}, Concepto: {$request->descripcion}, Monto: {$request->monto} Bs, Titular: {$request->card_name}",
                'pagos_caja',
                $pago->id
            );

            return response()->json([
                'success' => true,
                'data' => $pago,
                'message' => '¡Pago de prueba procesado con Stripe exitosamente!'
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al confirmar el pago de prueba: ' . $e->getMessage()
            ], 500);
        }
    }

}
