<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Docente extends Model
{
    protected $table = 'docentes';

    protected $fillable = [
        'postulante_docente_id',
        'fecha_contratacion',
        'estado',
        'gestion_id',
    ];

    protected $casts = [
        'fecha_contratacion' => 'date',
    ];

    public function gestion()
    {
        return $this->belongsTo(Gestion::class, 'gestion_id');
    }

    public function postulanteDocente()
    {
        return $this->belongsTo(PostulanteDocente::class, 'postulante_docente_id');
    }

    public function horarios()
    {
        return $this->hasMany(Horario::class, 'docente_id');
    }
}
