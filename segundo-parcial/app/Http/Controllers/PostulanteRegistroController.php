<?php

namespace App\Http\Controllers;

use App\Models\Pago;
use App\Models\Carrera;
use App\Models\Gestion;
use App\Models\Postulante;
use App\Models\Bitacora;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PostulanteRegistroController extends Controller
{
    private function getPostulanteAutenticado()
    {
        $user = request()->user();
        $gestion = Gestion::where('estado', 'activo')->first();
        if (!$gestion) {
            return null;
        }
        return Postulante::where('usuario_id', $user->id)
            ->where('gestion_id', $gestion->id)
            ->first();
    }

    public function miRegistro()
    {
        $postulante = $this->getPostulanteAutenticado();
        if (!$postulante) {
            return response()->json([
                'success' => false,
                'message' => 'No se encontró un registro de postulante para esta gestión activa.'
            ], 404);
        }

        $postulante->load('carreraPrincipal', 'carreraSecundaria', 'pago');

        $pasos = [
            'pendiente_pago'       => ['paso_actual' => 1, 'paso_nombre' => 'Pendiente de pago'],
            'pago_en_verificacion' => ['paso_actual' => 1, 'paso_nombre' => 'Pago en verificación'],
            'pago_verificado'      => ['paso_actual' => 2, 'paso_nombre' => 'Pago verificado'],
            'inscrito'             => ['paso_actual' => 3, 'paso_nombre' => 'Inscripción completada'],
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'postulante' => $postulante,
                'paso'       => $pasos[$postulante->estado] ?? ['paso_actual' => 0, 'paso_nombre' => 'Desconocido'],
            ],
            'message' => 'Estado de registro obtenido'
        ], 200);
    }

    public function carrerasDisponibles()
    {
        $carreras = Carrera::where('activa', true)->orderBy('nombre')->get();
        return response()->json([
            'success' => true,
            'data' => $carreras,
            'message' => 'Carreras disponibles'
        ], 200);
    }

    public function pagoStripe(Request $request)
    {
        $postulante = $this->getPostulanteAutenticado();
        if (!$postulante) {
            return response()->json(['success' => false, 'message' => 'Postulante no encontrado'], 404);
        }

        if ($postulante->estado !== 'pendiente_pago') {
            return response()->json([
                'success' => false,
                'message' => 'El estado actual no permite registrar un pago Stripe.'
            ], 422);
        }

        $validador = Validator::make($request->all(), [
            'payment_intent_id' => 'required|string',
            'monto'             => 'required|numeric|min:1',
        ]);

        if ($validador->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validador->errors()->first()
            ], 422);
        }

        $pagoExistente = Pago::where('numero_comprobante', $request->payment_intent_id)->first();
        if ($pagoExistente) {
            $postulante->update([
                'pago_id' => $pagoExistente->id,
                'estado'  => 'pago_verificado',
            ]);
            return response()->json([
                'success' => true,
                'data' => $pagoExistente,
                'message' => 'Pago Stripe ya registrado anteriormente.'
            ], 200);
        }

        $gestion = Gestion::where('estado', 'activo')->first();
        if (!$gestion) {
            return response()->json(['success' => false, 'message' => 'No hay una gestión activa'], 422);
        }

        $pago = Pago::create([
            'numero_comprobante' => $request->payment_intent_id,
            'ci_pagador'         => $postulante->ci,
            'monto'              => $request->monto,
            'fecha_pago'         => now()->toDateString(),
            'estado'             => 'confirmado',
            'gestion_id'         => $gestion->id,
        ]);

        $postulante->update([
            'pago_id' => $pago->id,
            'estado'  => 'pago_verificado',
        ]);

        Bitacora::registrar(
            'Pago Stripe (autogestión)',
            "Transacción: {$request->payment_intent_id}, Postulante: {$postulante->ci}, Monto: {$request->monto} Bs",
            'pagos_caja',
            $pago->id
        );

        return response()->json([
            'success' => true,
            'data' => $pago,
            'message' => 'Pago Stripe registrado correctamente'
        ], 200);
    }

    public function pagoCaja(Request $request)
    {
        $postulante = $this->getPostulanteAutenticado();
        if (!$postulante) {
            return response()->json(['success' => false, 'message' => 'Postulante no encontrado'], 404);
        }

        if ($postulante->estado !== 'pendiente_pago') {
            return response()->json([
                'success' => false,
                'message' => 'El estado actual no permite registrar un pago en caja.'
            ], 422);
        }

        $validador = Validator::make($request->all(), [
            'numero_comprobante' => 'required|string|max:50|unique:pagos_caja,numero_comprobante',
            'monto'              => 'required|numeric|min:1',
        ]);

        if ($validador->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validador->errors()->first()
            ], 422);
        }

        $gestion = Gestion::where('estado', 'activo')->first();
        if (!$gestion) {
            return response()->json(['success' => false, 'message' => 'No hay una gestión activa'], 422);
        }

        $pago = Pago::create([
            'numero_comprobante' => $request->numero_comprobante,
            'ci_pagador'         => $postulante->ci,
            'monto'              => $request->monto,
            'fecha_pago'         => now()->toDateString(),
            'estado'             => 'pendiente',
            'gestion_id'         => $gestion->id,
        ]);

        $postulante->update([
            'pago_id' => $pago->id,
            'estado'  => 'pago_en_verificacion',
        ]);

        Bitacora::registrar(
            'Pago en caja (autogestión)',
            "Comprobante: {$request->numero_comprobante}, Postulante: {$postulante->ci}, Monto: {$request->monto} Bs",
            'pagos_caja',
            $pago->id
        );

        return response()->json([
            'success' => true,
            'data' => $pago,
            'message' => 'Comprobante registrado correctamente, pendiente de verificación por el administrador.'
        ], 200);
    }

    public function completarFormulario(Request $request)
    {
        $postulante = $this->getPostulanteAutenticado();
        if (!$postulante) {
            return response()->json(['success' => false, 'message' => 'Postulante no encontrado'], 404);
        }

        if ($postulante->estado !== 'pago_verificado') {
            return response()->json([
                'success' => false,
                'message' => 'Debe tener el pago verificado para completar el formulario.'
            ], 422);
        }

        $validador = Validator::make($request->all(), [
            'nombres'              => 'required|string|max:100',
            'apellidos'            => 'required|string|max:100',
            'fecha_nacimiento'     => 'required|date',
            'sexo'                 => 'required|string|max:10',
            'direccion'            => 'required|string|max:255',
            'telefono'             => 'required|string|max:20',
            'colegio_procedencia'  => 'required|string|max:200',
            'ciudad'               => 'required|string|max:100',
            'carrera_principal_id' => 'required|exists:carreras,id',
            'titulo_bachiller'     => 'required|boolean',
            'nota_titulo_bachiller'=> 'nullable|numeric|min:0|max:100',
            'turno_preferido'      => 'required|string|in:Mañana,Tarde,Noche',
            'trabaja'              => 'nullable|boolean',
            'discapacidad'         => 'nullable|boolean',
            'tipo_discapacidad'    => 'nullable|string|max:100',
        ]);

        if ($validador->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validador->errors()->first()
            ], 422);
        }

        $camposActualizar = $request->only([
            'nombres', 'apellidos', 'fecha_nacimiento', 'sexo',
            'direccion', 'telefono', 'colegio_procedencia', 'ciudad',
            'carrera_principal_id', 'titulo_bachiller',
            'nota_titulo_bachiller', 'turno_preferido',
            'trabaja', 'discapacidad', 'tipo_discapacidad',
        ]);

        $camposActualizar['estado'] = 'inscrito';

        $postulante->update($camposActualizar);

        Bitacora::registrar(
            'Formulario de inscripción completado',
            "Postulante: {$postulante->ci}, Carrera: {$request->carrera_principal_id}",
            'postulantes',
            $postulante->id
        );

        $postulante->load('carreraPrincipal');

        return response()->json([
            'success' => true,
            'data' => $postulante,
            'message' => '¡Inscripción completada exitosamente!'
        ], 200);
    }
}
