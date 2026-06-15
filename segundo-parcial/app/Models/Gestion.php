<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Gestion extends Model
{
    protected $table = 'gestiones';

    protected $fillable = ['codigo', 'año', 'numero', 'fecha_inicio', 'fecha_fin', 'estado'];

    protected static function boot()
    {
        parent::boot();
        static::saving(function ($model) {
            $model->codigo = $model->numero . '-' . $model->año;
        });
    }
}
