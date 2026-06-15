<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Nota extends Model
{
    protected $table = 'notas';

    protected $fillable = [
        'examen_id',
        'nota',
        'registrado_por',
    ];

    protected $casts = [
        'nota' => 'decimal:2',
    ];

    public function examen()
    {
        return $this->belongsTo(Examen::class, 'examen_id');
    }

    public function registradoPor()
    {
        return $this->belongsTo(User::class, 'registrado_por');
    }
}
