<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Carrera extends Model
{
    protected $table = 'carreras';

    protected $fillable = ['id', 'nombre', 'modalidad', 'activo'];

    /**
     * Conversión automática de tipos al acceder a los atributos del modelo.
     */
    protected $casts = [
        'activo' => 'boolean',
    ];

    /**
     * Relación: una carrera tiene muchos registros de cupos (uno por gestión).
     */
    public function cupos()
    {
        return $this->hasMany(CupoCarrera::class, 'carrera_id');
    }

    /**
     * Relación: una carrera puede tener muchos postulantes como carrera principal.
     */
    public function postulantesPrincipal()
    {
        return $this->hasMany(Postulante::class, 'carrera_principal_id');
    }

    /**
     * Relación: una carrera puede tener muchos postulantes como carrera secundaria.
     */
    public function postulantesSecundaria()
    {
        return $this->hasMany(Postulante::class, 'carrera_secundaria_id');
    }
}
