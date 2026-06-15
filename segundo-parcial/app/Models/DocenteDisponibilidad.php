<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DocenteDisponibilidad extends Model
{
    protected $table = 'docente_disponibilidad';

    protected $fillable = [
        'postulante_docente_id',
        'turno_id',
        'horas_disponibles',
        'gestion_id',
    ];

    public function postulanteDocente()
    {
        return $this->belongsTo(PostulanteDocente::class, 'postulante_docente_id');
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
