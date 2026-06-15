<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Pago extends Model
{
    protected $table = 'pagos_caja';

    protected $fillable = ['numero_comprobante', 'ci_pagador', 'monto', 'fecha_pago', 'estado', 'gestion_id'];

    public function gestion()
    {
        return $this->belongsTo(Gestion::class, 'gestion_id');
    }
}