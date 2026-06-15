<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('examenes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('postulante_id')->constrained('postulantes')->onDelete('cascade');
            $table->foreignId('materia_id')->constrained('materias')->onDelete('restrict');
            $table->integer('numero_examen');
            $table->date('fecha')->nullable();
            $table->string('estado', 30)->default('pendiente');
            $table->timestamps();

            $table->unique(['postulante_id', 'materia_id', 'numero_examen']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('examenes');
    }
};
