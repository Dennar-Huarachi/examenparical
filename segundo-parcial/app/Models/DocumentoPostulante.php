<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DocumentoPostulante extends Model
{
    protected $table = 'documentos_postulante';

    protected $fillable = ['postulante_id', 'tipo_documento', 'nombre_archivo', 'ruta_archivo'];

    public function postulante()
    {
        return $this->belongsTo(Postulante::class, 'postulante_id');
    }
}
