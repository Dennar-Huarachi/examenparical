<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Rol;
use App\Models\Carrera;
use App\Models\Gestion;
use App\Models\CupoCarrera;
use App\Models\Bitacora;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Ejecutar seeder de roles y privilegios
        $this->call(RolesPrivilegiosSeeder::class);

        // 2. Seed Gestiones
        $gestion = Gestion::updateOrCreate(['id' => 1], [
            'codigo' => '1-2026',
            'año' => 2026,
            'numero' => 1,
            'fecha_inicio' => '2026-02-01',
            'fecha_fin' => '2026-06-30',
            'estado' => 'activo',
        ]);

        // 3. Seed Users (usuarios table)
        $usersData = [
            [
                'nombre' => 'Admin',
                'apellido' => 'Principal',
                'email' => 'admin@admin.com',
                'rol' => 'administrador',
            ],
            [
                'nombre' => 'Coordinador',
                'apellido' => 'Admisiones',
                'email' => 'coordinador@admin.com',
                'rol' => 'coordinador',
            ],
            [
                'nombre' => 'Docente',
                'apellido' => 'Preu',
                'email' => 'docente@admin.com',
                'rol' => 'docente',
            ],
            [
                'nombre' => 'Autoridad',
                'apellido' => 'Directiva',
                'email' => 'autoridad@admin.com',
                'rol' => 'autoridad',
            ],
            [
                'nombre' => 'Postulante',
                'apellido' => 'Ejemplo',
                'email' => 'postulante@admin.com',
                'rol' => 'postulante',
            ],
        ];

        $roles = Rol::whereIn('nombre', ['administrador', 'coordinador', 'docente', 'autoridad', 'postulante'])->get()->keyBy('nombre');

        foreach ($usersData as $ud) {
            User::updateOrCreate(
                ['email' => $ud['email']],
                [
                    'nombre' => $ud['nombre'],
                    'apellido' => $ud['apellido'],
                    'password' => Hash::make('12345678'),
                    'rol_id' => $roles[$ud['rol']]->id,
                    'activo' => true,
                ]
            );
        }

        // 4. Seed Carreras
        $carreras = [
            ['id' => 1, 'nombre' => 'Ingeniería Informática', 'modalidad' => 'Presencial'],
            ['id' => 2, 'nombre' => 'Ingeniería de Sistemas', 'modalidad' => 'Presencial'],
            ['id' => 3, 'nombre' => 'Ingeniería en Redes y Telecomunicaciones', 'modalidad' => 'Presencial'],
        ];

        foreach ($carreras as $c) {
            Carrera::updateOrCreate(['id' => $c['id']], [
                'nombre' => $c['nombre'],
                'modalidad' => $c['modalidad'],
                'activo' => true,
            ]);
        }

        // 5. Seed Cupos Carrera
        $cupos = [
            ['carrera_id' => 1, 'cupo_maximo' => 80],
            ['carrera_id' => 2, 'cupo_maximo' => 100],
            ['carrera_id' => 3, 'cupo_maximo' => 60],
        ];

        foreach ($cupos as $cp) {
            CupoCarrera::updateOrCreate(
                ['carrera_id' => $cp['carrera_id'], 'gestion_id' => 1],
                ['cupo_maximo' => $cp['cupo_maximo'], 'cupos_ocupados' => 0]
            );
        }

        // 6. Seed Initial Activity Log
        Bitacora::create([
            'usuario_id' => User::where('email', 'admin@admin.com')->first()->id,
            'accion' => 'Inicialización del Sistema',
            'tabla_afectada' => 'usuarios',
            'registro_id' => 1,
            'detalle' => 'Nuevo esquema de roles y privilegios sembrado correctamente.',
            'ip' => '127.0.0.1',
        ]);
    }
}
