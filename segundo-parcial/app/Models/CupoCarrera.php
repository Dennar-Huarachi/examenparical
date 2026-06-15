<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CupoCarrera extends Model
{
    protected $table = 'cupos_carrera';

    protected $fillable = ['carrera_id', 'gestion_id', 'cupo_maximo', 'cupos_ocupados'];

    /**
     * Conversión automática de tipos al acceder a los atributos del modelo.
     */
    protected $casts = [
        'cupo_maximo'    => 'integer',
        'cupos_ocupados' => 'integer',
    ];

    /**
     * Relación: un cupo pertenece a una carrera.
     */
    public function carrera()
    {
        return $this->belongsTo(Carrera::class, 'carrera_id');
    }

    /**
     * Relación: un cupo pertenece a una gestión académica.
     */
    public function gestion()
    {
        return $this->belongsTo(Gestion::class, 'gestion_id');
    }
}
