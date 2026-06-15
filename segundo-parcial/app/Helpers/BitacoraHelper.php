<?php

namespace App\Helpers;

use App\Models\Bitacora;
use Illuminate\Http\Request;

class BitacoraHelper
{
    public static function registrar(
        string $accion,
        ?string $tabla_afectada = null,
        ?int $registro_id = null,
        ?string $detalle = null,
        ?Request $request = null
    ) {
        $usuarioId = null;
        if (auth('sanctum')->check()) {
            $usuarioId = auth('sanctum')->id();
        }

        $request = $request ?? request();
        $ip = $request->ip();
        $sesionId = $request->header('X-Sesion-Id');

        Bitacora::create([
            'usuario_id' => $usuarioId,
            'accion' => $accion,
            'tabla_afectada' => $tabla_afectada,
            'registro_id' => $registro_id,
            'detalle' => $detalle,
            'ip' => $ip,
            'sesion_id' => $sesionId,
        ]);
    }
}
