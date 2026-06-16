<?php

namespace App\Http\Controllers;

use App\Models\Pago;
use App\Models\Gestion;
use App\Models\Postulante;
use App\Models\Bitacora;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PagoCajaController extends Controller
{
    public function index(Request $request)
    {
        $gestion = Gestion::where('estado', 'activo')->first();
        if (!$gestion) {
            return response()->json(['success' => false, 'data' => [], 'message' => 'No hay una gestión activa'], 422);
        }

        $query = Pago::where('gestion_id', $gestion->id);

        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }
        if ($request->filled('ci_pagador')) {
            $query->where('ci_pagador', 'LIKE', '%' . $request->ci_pagador . '%');
        }

        $pagos = $query->orderBy('created_at', 'desc')->get();

        $pagos->each(function ($pago) {
            $pago->postulante = Postulante::where('pago_id', $pago->id)->first();
        });

        $totalRecaudado = Pago::where('gestion_id', $gestion->id)
            ->whereIn('estado', ['verificado', 'confirmado'])
            ->sum('monto');

        $conteos = [
            'pendiente'   => Pago::where('gestion_id', $gestion->id)->where('estado', 'pendiente')->count(),
            'verificado'  => Pago::where('gestion_id', $gestion->id)->where('estado', 'verificado')->count(),
            'confirmado'  => Pago::where('gestion_id', $gestion->id)->where('estado', 'confirmado')->count(),
            'rechazado'   => Pago::where('gestion_id', $gestion->id)->where('estado', 'rechazado')->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => $pagos,
            'total_recaudado' => $totalRecaudado,
            'conteos' => $conteos,
            'message' => 'Listado de pagos'
        ], 200);
    }

    public function store(Request $request)
    {
        $validador = Validator::make($request->all(), [
            'numero_comprobante' => 'required|string|max:50|unique:pagos_caja,numero_comprobante',
            'ci_pagador'         => 'required|string|max:20',
            'monto'              => 'required|numeric|in:700',
            'fecha_pago'         => 'required|date',
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
            'ci_pagador'         => $request->ci_pagador,
            'monto'              => $request->monto,
            'fecha_pago'         => $request->fecha_pago,
            'estado'             => 'pendiente',
            'gestion_id'         => $gestion->id,
        ]);

        Bitacora::registrar(
            'Registro de pago en caja',
            "Comprobante: {$pago->numero_comprobante}, CI: {$pago->ci_pagador}, Monto: {$pago->monto} Bs",
            'pagos_caja',
            $pago->id
        );

        return response()->json([
            'success' => true,
            'data' => $pago,
            'message' => 'Pago registrado correctamente, pendiente de verificación'
        ], 200);
    }

    public function verificar(Request $request)
    {
        $validador = Validator::make($request->all(), [
            'numero_comprobante' => 'required|string|max:50',
            'ci_pagador'         => 'required|string|max:20',
        ]);

        if ($validador->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validador->errors()->first()
            ], 422);
        }

        $pago = Pago::where('numero_comprobante', $request->numero_comprobante)
            ->where('ci_pagador', $request->ci_pagador)
            ->first();

        if (!$pago) {
            return response()->json([
                'success' => true,
                'encontrado' => false,
                'message' => 'Comprobante no encontrado'
            ], 200);
        }

        if ($pago->estado === 'verificado') {
            $postulante = Postulante::where('pago_id', $pago->id)->first();
            return response()->json([
                'success' => true,
                'encontrado' => true,
                'verificado' => true,
                'pago' => $pago,
                'postulante_id' => $postulante?->id,
                'message' => 'Pago encontrado y ya verificado'
            ], 200);
        }

        if ($pago->estado === 'rechazado') {
            return response()->json([
                'success' => true,
                'encontrado' => true,
                'verificado' => false,
                'pago' => $pago,
                'message' => 'El pago fue rechazado anteriormente'
            ], 200);
        }

        return response()->json([
            'success' => true,
            'encontrado' => true,
            'pago' => $pago,
            'message' => 'Pago encontrado, pendiente de verificación'
        ], 200);
    }

    public function confirmarPago($id)
    {
        $pago = Pago::find($id);
        if (!$pago) {
            return response()->json(['success' => false, 'message' => 'Pago no encontrado'], 404);
        }

        if (!in_array($pago->estado, ['pendiente', 'confirmado'])) {
            return response()->json(['success' => false, 'message' => 'El pago ya fue procesado'], 422);
        }

        $pago->update(['estado' => 'verificado']);

        $postulante = Postulante::where('pago_id', $pago->id)->first();
        if ($postulante && $postulante->estado === 'pago_en_verificacion') {
            $postulante->update(['estado' => 'pago_verificado']);
        }

        Bitacora::registrar(
            'Verificación de pago',
            "Comprobante: {$pago->numero_comprobante} verificado correctamente",
            'pagos_caja',
            $pago->id
        );

        return response()->json([
            'success' => true,
            'data' => $pago,
            'message' => 'Pago verificado correctamente'
        ], 200);
    }

    public function rechazarPago(Request $request, $id)
    {
        $pago = Pago::find($id);
        if (!$pago) {
            return response()->json(['success' => false, 'message' => 'Pago no encontrado'], 404);
        }

        if ($pago->estado !== 'pendiente') {
            return response()->json(['success' => false, 'message' => 'El pago ya fue procesado'], 422);
        }

        $pago->update(['estado' => 'rechazado']);

        Bitacora::registrar(
            'Rechazo de pago',
            "Comprobante: {$pago->numero_comprobante} rechazado" . ($request->motivo ? " Motivo: {$request->motivo}" : ''),
            'pagos_caja',
            $pago->id
        );

        return response()->json([
            'success' => true,
            'data' => $pago,
            'message' => 'Pago rechazado'
        ], 200);
    }
}
