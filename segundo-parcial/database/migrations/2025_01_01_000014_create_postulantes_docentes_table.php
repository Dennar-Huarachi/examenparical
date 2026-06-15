<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('postulantes_docentes', function (Blueprint $table) {
            $table->id();
            $table->string('ci', 20)->unique();
            $table->string('nombres', 100);
            $table->string('apellidos', 100);
            $table->date('fecha_nacimiento')->nullable();
            $table->string('sexo', 10)->nullable();
            $table->string('telefono', 20)->nullable();
            $table->string('correo', 150)->nullable();
            $table->string('titulo_academico', 200)->nullable();
            $table->string('especialidad', 200)->nullable();
            $table->string('materia_preferida', 150)->nullable();
            $table->string('disponibilidad_horaria', 100)->nullable();
            $table->integer('carga_horaria_maxima')->nullable();
            $table->string('estado', 30)->default('pendiente');
            $table->foreignId('gestion_id')->constrained('gestiones')->onDelete('restrict');
            $table->foreignId('usuario_id')->nullable()->constrained('usuarios')->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('postulantes_docentes');
    }
};
