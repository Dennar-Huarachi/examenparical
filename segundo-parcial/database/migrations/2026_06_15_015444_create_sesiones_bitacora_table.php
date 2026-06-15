<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sesiones_bitacora', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->constrained('usuarios', 'id')->onDelete('cascade');
            $table->timestamp('inicio')->useCurrent();
            $table->timestamp('cierre')->nullable();
            $table->ipAddress('ip')->nullable();
            $table->integer('duracion')->nullable()->comment('en minutos');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sesiones_bitacora');
    }
};
