<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Postulante extends Model
{
    protected $table = 'postulantes';

    protected $fillable = [
        'id_postulante',
        'ci',
        'nombres',
        'apellidos',
        'fecha_nacimiento',
        'sexo',
        'direccion',
        'telefono',
        'correo',
        'colegio_procedencia',
        'ciudad',
        'carrera_principal_id',
        'carrera_secundaria_id',
        'titulo_bachiller',
        'año_bachillerato',
        'turno_preferido',
        'otros',
        'estado',
        'nota_final',
        'carrera_admitida_id',
        'pago_id',
        'gestion_id',
        'usuario_id',
    ];

    protected $casts = [
        'fecha_nacimiento' => 'date',
        'año_bachillerato' => 'integer',
        'nota_final'       => 'decimal:2',
    ];

    public function carreraPrincipal()
    {
        return $this->belongsTo(Carrera::class, 'carrera_principal_id');
    }

    public function carreraSecundaria()
    {
        return $this->belongsTo(Carrera::class, 'carrera_secundaria_id');
    }

    public function carreraAdmitida()
    {
        return $this->belongsTo(Carrera::class, 'carrera_admitida_id');
    }

    public function pago()
    {
        return $this->belongsTo(Pago::class, 'pago_id');
    }

    public function gestion()
    {
        return $this->belongsTo(Gestion::class, 'gestion_id');
    }

    public function usuario()
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    public function documentos()
    {
        return $this->hasMany(DocumentoPostulante::class, 'postulante_id');
    }

    public function notasMateria()
    {
        return $this->hasMany(NotaMateria::class, 'postulante_id');
    }

    public function grupos()
    {
        return $this->belongsToMany(Grupo::class, 'grupo_postulante', 'postulante_id', 'grupo_id')
            ->withPivot('fecha_asignacion')
            ->withTimestamps();
    }
}
