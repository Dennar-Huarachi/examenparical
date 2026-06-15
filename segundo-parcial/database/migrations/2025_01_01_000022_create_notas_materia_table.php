<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notas_materia', function (Blueprint $table) {
            $table->id();
            $table->foreignId('postulante_id')->constrained('postulantes')->onDelete('cascade');
            $table->foreignId('materia_id')->constrained('materias')->onDelete('restrict');
            $table->decimal('promedio', 5, 2);
            $table->boolean('aprobado')->default(false);
            $table->timestamps();

            $table->unique(['postulante_id', 'materia_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notas_materia');
    }
};
