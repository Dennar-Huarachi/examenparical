<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DocumentoDocente extends Model
{
    protected $table = 'documentos_docente';

    protected $fillable = ['postulante_docente_id', 'tipo_documento', 'nombre_archivo', 'ruta_archivo'];

    public function postulanteDocente()
    {
        return $this->belongsTo(PostulanteDocente::class, 'postulante_docente_id');
    }
}
