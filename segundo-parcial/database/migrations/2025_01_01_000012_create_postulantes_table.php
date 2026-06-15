<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('postulantes', function (Blueprint $table) {
            $table->id();
            $table->string('id_postulante', 30)->unique()->nullable();
            $table->string('ci', 20)->unique();
            $table->string('nombres', 100);
            $table->string('apellidos', 100);
            $table->date('fecha_nacimiento')->nullable();
            $table->string('sexo', 10)->nullable();
            $table->string('direccion', 255)->nullable();
            $table->string('telefono', 20)->nullable();
            $table->string('correo', 150)->nullable();
            $table->string('colegio_procedencia', 200)->nullable();
            $table->string('ciudad', 100)->nullable();
            $table->foreignId('carrera_principal_id')->constrained('carreras')->onDelete('restrict');
            $table->foreignId('carrera_secundaria_id')->nullable()->constrained('carreras')->onDelete('set null');
            $table->boolean('titulo_bachiller')->default(false);
            $table->year('año_bachillerato')->nullable();
            $table->string('turno_preferido', 50)->nullable();
            $table->text('otros')->nullable();
            $table->string('estado', 30)->default('pendiente');
            $table->decimal('nota_final', 5, 2)->nullable();
            $table->foreignId('carrera_admitida_id')->nullable()->constrained('carreras')->onDelete('set null');
            $table->foreignId('pago_id')->nullable()->constrained('pagos_caja')->onDelete('set null');
            $table->foreignId('gestion_id')->constrained('gestiones')->onDelete('restrict');
            $table->foreignId('usuario_id')->nullable()->constrained('usuarios')->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('postulantes');
    }
};
