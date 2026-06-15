<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PostulanteDocente extends Model
{
    protected $table = 'postulantes_docentes';

    protected $fillable = [
        'ci',
        'nombres',
        'apellidos',
        'fecha_nacimiento',
        'sexo',
        'telefono',
        'correo',
        'titulo_academico',
        'especialidad',
        'materia_preferida',
        'disponibilidad_horaria',
        'carga_horaria_maxima',
        'estado',
        'gestion_id',
        'usuario_id',
    ];

    protected $casts = [
        'carga_horaria_maxima' => 'integer',
    ];

    public function gestion()
    {
        return $this->belongsTo(Gestion::class, 'gestion_id');
    }

    public function usuario()
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    public function docente()
    {
        return $this->hasOne(Docente::class, 'postulante_docente_id');
    }

    public function documentos()
    {
        return $this->hasMany(DocumentoDocente::class, 'postulante_docente_id');
    }
}
