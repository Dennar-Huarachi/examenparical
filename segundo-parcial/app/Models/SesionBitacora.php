<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SesionBitacora extends Model
{
    protected $table = 'sesiones_bitacora';

    protected $fillable = ['usuario_id', 'inicio', 'cierre', 'ip', 'duracion'];

    protected $casts = [
        'inicio' => 'datetime',
        'cierre' => 'datetime',
        'duracion' => 'integer',
    ];

    const UPDATED_AT = null;

    public function usuario()
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    public function acciones()
    {
        return $this->hasMany(Bitacora::class, 'sesion_id');
    }
}
