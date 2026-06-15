<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('docente_disponibilidad', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('postulante_docente_id');
            $table->unsignedBigInteger('turno_id');
            $table->integer('horas_disponibles')->default(0);
            $table->unsignedBigInteger('gestion_id');
            $table->timestamps();

            $table->foreign('postulante_docente_id', 'fk_disp_postulante')
                ->references('id')->on('postulantes_docentes')
                ->onDelete('cascade');
            $table->foreign('turno_id')->references('id')->on('turnos')->onDelete('cascade');
            $table->foreign('gestion_id')->references('id')->on('gestiones')->onDelete('cascade');

            $table->unique(['postulante_docente_id', 'turno_id', 'gestion_id'], 'uq_docente_turno_gestion');
        });
    }

    public function down()
    {
        Schema::dropIfExists('docente_disponibilidad');
    }
};
