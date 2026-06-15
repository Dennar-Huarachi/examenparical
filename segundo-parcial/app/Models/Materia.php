<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Materia extends Model
{
    protected $table = 'materias';

    protected $fillable = ['nombre', 'peso'];

    /**
     * Conversión automática de tipos al acceder a los atributos del modelo.
     */
    protected $casts = [
        'peso' => 'integer',
    ];

    /**
     * Relación: una materia puede tener muchas notas asociadas.
     */
    public function notas()
    {
        return $this->hasMany(Nota::class, 'materia_id');
    }
}
