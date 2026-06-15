<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documentos_docente', function (Blueprint $table) {
            $table->id();
            $table->foreignId('postulante_docente_id')->constrained('postulantes_docentes')->onDelete('cascade');
            $table->string('tipo_documento', 100);
            $table->string('nombre_archivo', 255);
            $table->string('ruta_archivo', 500);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documentos_docente');
    }
};
