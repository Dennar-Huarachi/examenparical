<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Examen extends Model
{
    protected $table = 'examenes';

    protected $fillable = [
        'postulante_id',
        'materia_id',
        'numero_examen',
        'fecha',
        'estado',
    ];

    protected $casts = [
        'numero_examen' => 'integer',
        'fecha' => 'date',
    ];

    public function postulante()
    {
        return $this->belongsTo(Postulante::class, 'postulante_id');
    }

    public function materia()
    {
        return $this->belongsTo(Materia::class, 'materia_id');
    }

    public function nota()
    {
        return $this->hasOne(Nota::class, 'examen_id');
    }
}
