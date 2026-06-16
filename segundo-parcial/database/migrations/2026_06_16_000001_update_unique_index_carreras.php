<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('carreras', function (Blueprint $table) {
            $table->dropUnique('carreras_nombre_unique');
            $table->unique(['nombre', 'modalidad']);
        });
    }

    public function down(): void
    {
        Schema::table('carreras', function (Blueprint $table) {
            $table->dropUnique(['nombre', 'modalidad']);
            $table->unique('nombre');
        });
    }
};
