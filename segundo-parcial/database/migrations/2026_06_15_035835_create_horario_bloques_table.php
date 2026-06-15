<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('horario_bloques', function (Blueprint $table) {
            $table->id();
            $table->foreignId('grupo_id')->constrained('grupos')->onDelete('cascade');
            $table->foreignId('materia_id')->constrained('materias')->onDelete('restrict');
            $table->foreignId('docente_id')->constrained('docentes')->onDelete('restrict');
            $table->foreignId('aula_id')->constrained('aulas')->onDelete('restrict');
            $table->string('dia_semana', 15);
            $table->integer('bloque_inicio');
            $table->integer('bloque_fin');
            $table->time('hora_inicio');
            $table->time('hora_fin');
            $table->foreignId('turno_id')->constrained('turnos')->onDelete('restrict');
            $table->foreignId('gestion_id')->constrained('gestiones')->onDelete('restrict');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('horario_bloques');
    }
};
