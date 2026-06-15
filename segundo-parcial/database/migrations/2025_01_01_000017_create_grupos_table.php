<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('grupos', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 100);
            $table->integer('capacidad_maxima');
            $table->foreignId('turno_id')->constrained('turnos')->onDelete('restrict');
            $table->string('modalidad', 50);
            $table->foreignId('gestion_id')->constrained('gestiones')->onDelete('restrict');
            $table->integer('total_inscritos')->default(0);
            $table->string('estado', 30)->default('activo');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('grupos');
    }
};
