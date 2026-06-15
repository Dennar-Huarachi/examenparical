<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('aulas', function (Blueprint $table) {
            $table->id();
            $table->string('numero', 20);
            $table->string('nombre', 100)->nullable();
            $table->integer('capacidad');
            $table->integer('piso')->nullable();
            $table->string('edificio', 100)->nullable();
            $table->boolean('tiene_proyector')->default(false);
            $table->string('modalidad', 50);
            $table->boolean('disponible')->default(true);
            $table->foreignId('gestion_id')->constrained('gestiones')->onDelete('cascade');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('aulas');
    }
};
