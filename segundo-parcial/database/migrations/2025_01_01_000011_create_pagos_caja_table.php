<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pagos_caja', function (Blueprint $table) {
            $table->id();
            $table->string('numero_comprobante', 50)->unique();
            $table->string('ci_pagador', 20);
            $table->decimal('monto', 8, 2);
            $table->date('fecha_pago');
            $table->string('estado', 20)->default('confirmado');
            $table->foreignId('gestion_id')->constrained('gestiones')->onDelete('restrict');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pagos_caja');
    }
};
