<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NotaMateria extends Model
{
    protected $table = 'notas_materia';

    protected $fillable = ['postulante_id', 'materia_id', 'promedio', 'aprobado'];

    protected $casts = [
        'promedio' => 'decimal:2',
        'aprobado' => 'boolean',
    ];

    public function postulante()
    {
        return $this->belongsTo(Postulante::class, 'postulante_id');
    }

    public function materia()
    {
        return $this->belongsTo(Materia::class, 'materia_id');
    }
}
