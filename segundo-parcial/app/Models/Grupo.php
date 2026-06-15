<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Grupo extends Model
{
    protected $table = 'grupos';

    protected $fillable = [
        'nombre',
        'capacidad_maxima',
        'turno_id',
        'modalidad',
        'gestion_id',
        'total_inscritos',
        'estado',
    ];

    protected $casts = [
        'capacidad_maxima' => 'integer',
        'total_inscritos'  => 'integer',
    ];

    public function turno()
    {
        return $this->belongsTo(Turno::class, 'turno_id');
    }

    public function gestion()
    {
        return $this->belongsTo(Gestion::class, 'gestion_id');
    }

    public function postulantes()
    {
        return $this->belongsToMany(Postulante::class, 'grupo_postulante', 'grupo_id', 'postulante_id')
            ->withPivot('fecha_asignacion')
            ->withTimestamps();
    }

    public function horariosBloque()
    {
        return $this->hasMany(HorarioBloque::class, 'grupo_id');
    }
}
