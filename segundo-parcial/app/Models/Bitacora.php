<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Bitacora extends Model
{
    protected $table = 'bitacoras';

    protected $fillable = ['usuario_id', 'accion', 'tabla_afectada', 'registro_id', 'detalle', 'ip', 'sesion_id'];

    const UPDATED_AT = null;

    public function usuario()
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    public function sesion()
    {
        return $this->belongsTo(SesionBitacora::class, 'sesion_id');
    }

    /**
     * Auxiliar para registrar auditorías
     */
    public static function registrar($accion, $detalle = null, $tablaAfectada = null, $registroId = null)
    {
        $usuarioId = null;
        if (auth('sanctum')->check()) {
            $usuarioId = auth('sanctum')->id();
        }

        self::create([
            'usuario_id' => $usuarioId,
            'accion' => $accion,
            'tabla_afectada' => $tablaAfectada,
            'registro_id' => $registroId,
            'detalle' => $detalle,
            'ip' => request()->ip()
        ]);
    }
}
