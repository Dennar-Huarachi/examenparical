<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('docentes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('postulante_docente_id')->unique()->constrained('postulantes_docentes')->onDelete('cascade');
            $table->date('fecha_contratacion')->nullable();
            $table->string('estado', 30)->default('activo');
            $table->foreignId('gestion_id')->constrained('gestiones')->onDelete('restrict');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('docentes');
    }
};
