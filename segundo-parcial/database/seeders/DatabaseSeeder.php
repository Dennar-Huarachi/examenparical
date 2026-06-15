<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Rol;
use App\Models\Privilegio;
use App\Models\Carrera;
use App\Models\Gestion;
use App\Models\CupoCarrera;
use App\Models\Bitacora;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Seed Gestiones
        $gestion = Gestion::updateOrCreate(['id' => 1], [
            'codigo' => '1-2026',
            'año' => 2026,
            'numero' => 1,
            'fecha_inicio' => '2026-02-01',
            'fecha_fin' => '2026-06-30',
            'estado' => 'activo',
        ]);

        // 2. Seed Privilegios
        $privilegiosList = [
            ['id' => 1, 'nombre' => 'gestionar_usuarios', 'descripcion' => 'Permite administrar usuarios, roles y privilegios'],
            ['id' => 2, 'nombre' => 'configurar_cupos', 'descripcion' => 'Permite configurar los cupos por carrera'],
            ['id' => 3, 'nombre' => 'registrar_postulantes', 'descripcion' => 'Permite registrar, editar y dar de baja postulantes'],
            ['id' => 4, 'nombre' => 'registrar_pagos', 'descripcion' => 'Permite registrar y validar pagos de postulantes'],
            ['id' => 5, 'nombre' => 'gestionar_notas', 'descripcion' => 'Permite registrar y subir notas'],
            ['id' => 6, 'nombre' => 'gestionar_grupos', 'descripcion' => 'Permite organizar y ver grupos del curso'],
            ['id' => 7, 'nombre' => 'contratar_docentes', 'descripcion' => 'Permite registrar e interactuar con contratos de docentes'],
            ['id' => 8, 'nombre' => 'consultar_bitacora', 'descripcion' => 'Permite auditar la bitácora de acciones del sistema'],
            ['id' => 9, 'nombre' => 'consultar_reportes', 'descripcion' => 'Permite generar y visualizar reportes en PDF/Excel'],
            ['id' => 10, 'nombre' => 'ver_dashboard', 'descripcion' => 'Permite acceder al panel estadístico principal'],
            ['id' => 11, 'nombre' => 'ver_horarios', 'descripcion' => 'Permite al docente consultar su carga horaria asignada'],
            ['id' => 12, 'nombre' => 'registrar_asistencia', 'descripcion' => 'Permite al docente marcar asistencia en clase'],
        ];

        $privs = [];
        foreach ($privilegiosList as $p) {
            $privs[$p['nombre']] = Privilegio::updateOrCreate(['id' => $p['id']], [
                'nombre' => $p['nombre'],
                'descripcion' => $p['descripcion']
            ]);
        }

        // 3. Seed Roles
        $rolesData = [
            1 => [
                'nombre' => 'Administrador',
                'descripcion' => 'Acceso total al sistema de admisión',
                'privilegios' => array_keys($privs)
            ],
            2 => [
                'nombre' => 'Docente',
                'descripcion' => 'Imparte clases, ve horarios y marca asistencia',
                'privilegios' => ['ver_horarios', 'registrar_asistencia']
            ],
            3 => [
                'nombre' => 'Coordinador',
                'descripcion' => 'Monitorea avance, grupos y genera reportes',
                'privilegios' => ['consultar_reportes', 'gestionar_grupos', 'ver_dashboard']
            ],
            4 => [
                'nombre' => 'Autoridad',
                'descripcion' => 'Acceso de solo consulta gerencial y reportes',
                'privilegios' => ['ver_dashboard', 'consultar_reportes']
            ]
        ];

        $roles = [];
        foreach ($rolesData as $rolId => $data) {
            $rol = Rol::updateOrCreate(['id' => $rolId], [
                'nombre' => $data['nombre'],
                'descripcion' => $data['descripcion']
            ]);
            $roles[$data['nombre']] = $rol;

            // Sincronizar privilegios manualmente
            DB::table('rol_privilegio')->where('rol_id', $rolId)->delete();
            foreach ($data['privilegios'] as $pn) {
                if (isset($privs[$pn])) {
                    DB::table('rol_privilegio')->insert([
                        'rol_id' => $rolId,
                        'privilegio_id' => $privs[$pn]->id,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }

        // 4. Seed Users (usuarios table)
        $usersData = [
            [
                'nombre' => 'Admin',
                'apellido' => 'Principal',
                'email' => 'admin@admin.com',
                'rol' => 'Administrador'
            ],
            [
                'nombre' => 'Docente',
                'apellido' => 'Preu',
                'email' => 'docente@admin.com',
                'rol' => 'Docente'
            ],
            [
                'nombre' => 'Coordinador',
                'apellido' => 'Admisiones',
                'email' => 'coordinador@admin.com',
                'rol' => 'Coordinador'
            ],
            [
                'nombre' => 'Autoridad',
                'apellido' => 'Directiva',
                'email' => 'autoridad@admin.com',
                'rol' => 'Autoridad'
            ]
        ];

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

        // 5. Seed Carreras
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

        // 6. Seed Cupos Carrera
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

        // 7. Seed Initial Activity Log
        Bitacora::create([
            'usuario_id' => User::where('email', 'admin@admin.com')->first()->id,
            'accion' => 'Inicialización del Sistema',
            'tabla_afectada' => 'usuarios',
            'registro_id' => 1,
            'detalle' => 'Nuevo esquema de 24 tablas, roles, privilegios y cupos de carrera sembrados correctamente.',
            'ip' => '127.0.0.1'
        ]);
    }
}