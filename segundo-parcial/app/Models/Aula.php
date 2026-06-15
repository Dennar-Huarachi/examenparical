<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Aula extends Model
{
    protected $table = 'aulas';

    protected $fillable = [
        'numero',
        'nombre',
        'capacidad',
        'piso',
        'edificio',
        'tiene_proyector',
        'modalidad',
        'disponible',
        'gestion_id',
    ];

    protected $casts = [
        'capacidad'       => 'integer',
        'piso'            => 'integer',
        'tiene_proyector' => 'boolean',
        'disponible'      => 'boolean',
    ];

    public function gestion()
    {
        return $this->belongsTo(Gestion::class, 'gestion_id');
    }
}
