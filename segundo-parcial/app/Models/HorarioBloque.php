<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HorarioBloque extends Model
{
    protected $table = 'horario_bloques';

    protected $fillable = [
        'grupo_id',
        'materia_id',
        'docente_id',
        'aula_id',
        'dia_semana',
        'bloque_inicio',
        'bloque_fin',
        'hora_inicio',
        'hora_fin',
        'turno_id',
        'gestion_id',
    ];

    protected $casts = [
        'hora_inicio' => 'string',
        'hora_fin'    => 'string',
        'bloque_inicio' => 'integer',
        'bloque_fin'    => 'integer',
    ];

    public function grupo()
    {
        return $this->belongsTo(Grupo::class, 'grupo_id');
    }

    public function materia()
    {
        return $this->belongsTo(Materia::class, 'materia_id');
    }

    public function docente()
    {
        return $this->belongsTo(Docente::class, 'docente_id');
    }

    public function aula()
    {
        return $this->belongsTo(Aula::class, 'aula_id');
    }

    public function turno()
    {
        return $this->belongsTo(Turno::class, 'turno_id');
    }

    public function gestion()
    {
        return $this->belongsTo(Gestion::class, 'gestion_id');
    }
}
