<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('postulantes', function (Blueprint $table) {
            if (!Schema::hasColumn('postulantes', 'nota_titulo_bachiller')) {
                $table->decimal('nota_titulo_bachiller', 5, 2)->nullable()->after('año_bachillerato');
            }
            if (!Schema::hasColumn('postulantes', 'trabaja')) {
                $table->boolean('trabaja')->nullable()->default(false)->after('turno_preferido');
            }
            if (!Schema::hasColumn('postulantes', 'discapacidad')) {
                $table->boolean('discapacidad')->nullable()->default(false)->after('trabaja');
            }
            if (!Schema::hasColumn('postulantes', 'tipo_discapacidad')) {
                $table->string('tipo_discapacidad', 100)->nullable()->after('discapacidad');
            }
        });
    }

    public function down(): void
    {
        Schema::table('postulantes', function (Blueprint $table) {
            $table->dropColumn(['nota_titulo_bachiller', 'trabaja', 'discapacidad', 'tipo_discapacidad']);
        });
    }
};
