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
            ['id' => 1, 'nombre' => 'dashboard.ver', 'descripcion' => 'Ver dashboard principal'],
            ['id' => 2, 'nombre' => 'usuarios.ver', 'descripcion' => 'Ver usuarios'],
            ['id' => 3, 'nombre' => 'usuarios.crear', 'descripcion' => 'Crear usuarios'],
            ['id' => 4, 'nombre' => 'usuarios.editar', 'descripcion' => 'Editar usuarios'],
            ['id' => 5, 'nombre' => 'usuarios.eliminar', 'descripcion' => 'Eliminar usuarios'],
            ['id' => 6, 'nombre' => 'postulantes.ver', 'descripcion' => 'Ver postulantes'],
            ['id' => 7, 'nombre' => 'postulantes.crear', 'descripcion' => 'Crear postulantes'],
            ['id' => 8, 'nombre' => 'postulantes.editar', 'descripcion' => 'Editar postulantes'],
            ['id' => 9, 'nombre' => 'postulantes.eliminar', 'descripcion' => 'Eliminar postulantes'],
            ['id' => 10, 'nombre' => 'gestiones.ver', 'descripcion' => 'Ver gestiones'],
            ['id' => 11, 'nombre' => 'gestiones.crear', 'descripcion' => 'Crear gestiones'],
            ['id' => 12, 'nombre' => 'gestiones.editar', 'descripcion' => 'Editar gestiones'],
            ['id' => 13, 'nombre' => 'gestiones.eliminar', 'descripcion' => 'Eliminar gestiones'],
            ['id' => 14, 'nombre' => 'carreras.ver', 'descripcion' => 'Ver carreras y cupos'],
            ['id' => 15, 'nombre' => 'carreras.crear', 'descripcion' => 'Crear carreras'],
            ['id' => 16, 'nombre' => 'carreras.editar', 'descripcion' => 'Editar carreras y cupos'],
            ['id' => 17, 'nombre' => 'carreras.eliminar', 'descripcion' => 'Eliminar carreras'],
            ['id' => 18, 'nombre' => 'materias.ver', 'descripcion' => 'Ver materias y pesos'],
            ['id' => 19, 'nombre' => 'materias.crear', 'descripcion' => 'Crear materias'],
            ['id' => 20, 'nombre' => 'materias.editar', 'descripcion' => 'Editar y reordenar materias'],
            ['id' => 21, 'nombre' => 'materias.eliminar', 'descripcion' => 'Eliminar materias'],
            ['id' => 22, 'nombre' => 'aulas.ver', 'descripcion' => 'Ver aulas'],
            ['id' => 23, 'nombre' => 'aulas.crear', 'descripcion' => 'Crear aulas'],
            ['id' => 24, 'nombre' => 'aulas.editar', 'descripcion' => 'Editar aulas'],
            ['id' => 25, 'nombre' => 'aulas.eliminar', 'descripcion' => 'Eliminar aulas'],
            ['id' => 26, 'nombre' => 'turnos.ver', 'descripcion' => 'Ver turnos'],
            ['id' => 27, 'nombre' => 'turnos.crear', 'descripcion' => 'Crear turnos'],
            ['id' => 28, 'nombre' => 'turnos.editar', 'descripcion' => 'Editar turnos'],
            ['id' => 29, 'nombre' => 'turnos.eliminar', 'descripcion' => 'Eliminar turnos'],
            ['id' => 30, 'nombre' => 'horarios.ver', 'descripcion' => 'Ver horarios'],
            ['id' => 31, 'nombre' => 'horarios.crear', 'descripcion' => 'Crear horarios'],
            ['id' => 32, 'nombre' => 'horarios.editar', 'descripcion' => 'Editar horarios'],
            ['id' => 33, 'nombre' => 'horarios.eliminar', 'descripcion' => 'Eliminar horarios'],
            ['id' => 34, 'nombre' => 'grupos.ver', 'descripcion' => 'Ver grupos'],
            ['id' => 35, 'nombre' => 'grupos.calcular', 'descripcion' => 'Calcular grupos'],
            ['id' => 36, 'nombre' => 'grupos.asignar_postulantes', 'descripcion' => 'Asignar postulantes a grupos'],
            ['id' => 37, 'nombre' => 'grupos.asignar_docentes', 'descripcion' => 'Asignar docentes a grupos'],
            ['id' => 38, 'nombre' => 'notas.ver', 'descripcion' => 'Ver notas'],
            ['id' => 39, 'nombre' => 'notas.registrar', 'descripcion' => 'Registrar y editar notas'],
            ['id' => 40, 'nombre' => 'notas.calcular', 'descripcion' => 'Asignar carrera por cupo'],
            ['id' => 41, 'nombre' => 'reportes.ver', 'descripcion' => 'Ver reportes'],
            ['id' => 42, 'nombre' => 'reportes.exportar', 'descripcion' => 'Exportar reportes'],
            ['id' => 43, 'nombre' => 'auditoria.ver', 'descripcion' => 'Consultar bitácora'],
            ['id' => 44, 'nombre' => 'pagos.ver', 'descripcion' => 'Ver pagos'],
            ['id' => 45, 'nombre' => 'pagos.crear', 'descripcion' => 'Crear pagos'],
            ['id' => 46, 'nombre' => 'pagos.verificar', 'descripcion' => 'Verificar pagos'],
            ['id' => 47, 'nombre' => 'docentes.contratar', 'descripcion' => 'Contratar docentes'],
            ['id' => 48, 'nombre' => 'docentes.ver', 'descripcion' => 'Ver docentes'],
            ['id' => 49, 'nombre' => 'docentes.carga_horaria', 'descripcion' => 'Asignar carga horaria'],
            ['id' => 50, 'nombre' => 'mi_info.ver', 'descripcion' => 'Ver mi carga horaria'],
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
                'privilegios' => ['horarios.ver', 'mi_info.ver', 'notas.ver']
            ],
            3 => [
                'nombre' => 'Coordinador',
                'descripcion' => 'Monitorea avance, grupos y genera reportes',
                'privilegios' => ['gestiones.ver', 'gestiones.crear', 'gestiones.editar', 'carreras.ver', 'materias.ver', 'aulas.ver', 'horarios.ver', 'grupos.ver', 'grupos.calcular', 'notas.ver', 'notas.calcular', 'reportes.ver', 'postulantes.ver']
            ],
            4 => [
                'nombre' => 'Autoridad',
                'descripcion' => 'Acceso de solo consulta gerencial y reportes',
                'privilegios' => ['reportes.ver', 'auditoria.ver', 'dashboard.ver']
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
                'email' => 'rojasgutierrezkristenalexis@gmail.com',
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

        // 7. Seed test data for all functionalities
        $this->call(TestDataSeeder::class);

        // 8. Seed Initial Activity Log
        Bitacora::create([
            'usuario_id' => User::where('email', 'rojasgutierrezkristenalexis@gmail.com')->first()->id,
            'accion' => 'Inicialización del Sistema',
            'tabla_afectada' => 'usuarios',
            'registro_id' => 1,
            'detalle' => 'Nuevo esquema de 24 tablas, roles, privilegios y cupos de carrera sembrados correctamente.',
            'ip' => '127.0.0.1'
        ]);
    }
}