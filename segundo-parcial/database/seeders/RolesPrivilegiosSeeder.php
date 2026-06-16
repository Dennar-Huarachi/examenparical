<?php

namespace Database\Seeders;

use App\Models\Rol;
use App\Models\Privilegio;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RolesPrivilegiosSeeder extends Seeder
{
    public function run(): void
    {
        $privilegios = [
            // Gestión académica
            ['nombre' => 'gestiones.ver', 'descripcion' => 'Ver gestiones académicas', 'modulo' => 'gestiones'],
            ['nombre' => 'gestiones.crear', 'descripcion' => 'Crear gestiones académicas', 'modulo' => 'gestiones'],
            ['nombre' => 'gestiones.editar', 'descripcion' => 'Editar gestiones académicas', 'modulo' => 'gestiones'],
            ['nombre' => 'gestiones.eliminar', 'descripcion' => 'Eliminar gestiones académicas', 'modulo' => 'gestiones'],
            // Carreras
            ['nombre' => 'carreras.ver', 'descripcion' => 'Ver carreras', 'modulo' => 'carreras'],
            ['nombre' => 'carreras.crear', 'descripcion' => 'Crear carreras', 'modulo' => 'carreras'],
            ['nombre' => 'carreras.editar', 'descripcion' => 'Editar carreras', 'modulo' => 'carreras'],
            ['nombre' => 'carreras.eliminar', 'descripcion' => 'Eliminar carreras', 'modulo' => 'carreras'],
            // Materias
            ['nombre' => 'materias.ver', 'descripcion' => 'Ver materias', 'modulo' => 'materias'],
            ['nombre' => 'materias.crear', 'descripcion' => 'Crear materias', 'modulo' => 'materias'],
            ['nombre' => 'materias.editar', 'descripcion' => 'Editar materias', 'modulo' => 'materias'],
            ['nombre' => 'materias.eliminar', 'descripcion' => 'Eliminar materias', 'modulo' => 'materias'],
            // Aulas
            ['nombre' => 'aulas.ver', 'descripcion' => 'Ver aulas', 'modulo' => 'aulas'],
            ['nombre' => 'aulas.crear', 'descripcion' => 'Crear aulas', 'modulo' => 'aulas'],
            ['nombre' => 'aulas.editar', 'descripcion' => 'Editar aulas', 'modulo' => 'aulas'],
            ['nombre' => 'aulas.eliminar', 'descripcion' => 'Eliminar aulas', 'modulo' => 'aulas'],
            // Turnos y horarios
            ['nombre' => 'turnos.ver', 'descripcion' => 'Ver turnos', 'modulo' => 'turnos'],
            ['nombre' => 'turnos.crear', 'descripcion' => 'Crear turnos', 'modulo' => 'turnos'],
            ['nombre' => 'turnos.editar', 'descripcion' => 'Editar turnos', 'modulo' => 'turnos'],
            ['nombre' => 'turnos.eliminar', 'descripcion' => 'Eliminar turnos', 'modulo' => 'turnos'],
            ['nombre' => 'horarios.ver', 'descripcion' => 'Ver horarios', 'modulo' => 'horarios'],
            ['nombre' => 'horarios.crear', 'descripcion' => 'Crear horarios', 'modulo' => 'horarios'],
            ['nombre' => 'horarios.editar', 'descripcion' => 'Editar horarios', 'modulo' => 'horarios'],
            ['nombre' => 'horarios.eliminar', 'descripcion' => 'Eliminar horarios', 'modulo' => 'horarios'],
            // Usuarios
            ['nombre' => 'usuarios.ver', 'descripcion' => 'Ver usuarios', 'modulo' => 'usuarios'],
            ['nombre' => 'usuarios.crear', 'descripcion' => 'Crear usuarios', 'modulo' => 'usuarios'],
            ['nombre' => 'usuarios.editar', 'descripcion' => 'Editar usuarios', 'modulo' => 'usuarios'],
            ['nombre' => 'usuarios.eliminar', 'descripcion' => 'Eliminar usuarios', 'modulo' => 'usuarios'],
            // Postulantes
            ['nombre' => 'postulantes.ver', 'descripcion' => 'Ver postulantes', 'modulo' => 'postulantes'],
            ['nombre' => 'postulantes.crear', 'descripcion' => 'Registrar postulantes', 'modulo' => 'postulantes'],
            ['nombre' => 'postulantes.editar', 'descripcion' => 'Editar postulantes', 'modulo' => 'postulantes'],
            ['nombre' => 'postulantes.eliminar', 'descripcion' => 'Eliminar postulantes', 'modulo' => 'postulantes'],
            // Pagos
            ['nombre' => 'pagos.ver', 'descripcion' => 'Ver pagos', 'modulo' => 'pagos'],
            ['nombre' => 'pagos.crear', 'descripcion' => 'Registrar pagos', 'modulo' => 'pagos'],
            ['nombre' => 'pagos.verificar', 'descripcion' => 'Verificar y confirmar pagos', 'modulo' => 'pagos'],
            // Docentes
            ['nombre' => 'docentes.ver', 'descripcion' => 'Ver docentes', 'modulo' => 'docentes'],
            ['nombre' => 'docentes.contratar', 'descripcion' => 'Contratar docentes', 'modulo' => 'docentes'],
            ['nombre' => 'docentes.editar', 'descripcion' => 'Editar docentes', 'modulo' => 'docentes'],
            ['nombre' => 'docentes.carga_horaria', 'descripcion' => 'Asignar carga horaria', 'modulo' => 'docentes'],
            // Grupos
            ['nombre' => 'grupos.ver', 'descripcion' => 'Ver grupos', 'modulo' => 'grupos'],
            ['nombre' => 'grupos.crear', 'descripcion' => 'Crear grupos manualmente', 'modulo' => 'grupos'],
            ['nombre' => 'grupos.editar', 'descripcion' => 'Editar grupos', 'modulo' => 'grupos'],
            ['nombre' => 'grupos.eliminar', 'descripcion' => 'Eliminar grupos', 'modulo' => 'grupos'],
            ['nombre' => 'grupos.calcular', 'descripcion' => 'Calcular y crear grupos automáticamente', 'modulo' => 'grupos'],
            ['nombre' => 'grupos.asignar_postulantes', 'descripcion' => 'Asignar postulantes a grupos', 'modulo' => 'grupos'],
            ['nombre' => 'grupos.asignar_docentes', 'descripcion' => 'Asignar docentes y aulas a grupos', 'modulo' => 'grupos'],
            // Exámenes y notas
            ['nombre' => 'notas.ver', 'descripcion' => 'Ver notas de postulantes', 'modulo' => 'notas'],
            ['nombre' => 'notas.registrar', 'descripcion' => 'Registrar y editar notas', 'modulo' => 'notas'],
            ['nombre' => 'notas.calcular', 'descripcion' => 'Calcular promedios y asignar carrera', 'modulo' => 'notas'],
            // Reportes
            ['nombre' => 'reportes.ver', 'descripcion' => 'Ver reportes', 'modulo' => 'reportes'],
            ['nombre' => 'reportes.exportar', 'descripcion' => 'Exportar reportes en PDF/Excel', 'modulo' => 'reportes'],
            // Auditoría
            ['nombre' => 'auditoria.ver', 'descripcion' => 'Ver bitácora de auditoría', 'modulo' => 'auditoria'],
            // Dashboard
            ['nombre' => 'dashboard.ver', 'descripcion' => 'Ver dashboard principal', 'modulo' => 'dashboard'],
            // Mi información (docente)
            ['nombre' => 'mi_info.ver', 'descripcion' => 'Ver mi información y carga horaria', 'modulo' => 'mi_info'],
            // Mi postulación (postulante)
            ['nombre' => 'mi_postulacion.ver', 'descripcion' => 'Ver mi postulación, notas y estado', 'modulo' => 'mi_postulacion'],
            // Mi inscripción (postulante)
            ['nombre' => 'postulante.registro', 'descripcion' => 'Acceder al formulario de inscripción y pago', 'modulo' => 'postulante'],
        ];

        $roles = [
            'administrador' => [
                'descripcion' => 'Acceso total a todo el sistema sin restricciones',
                'privilegios' => '*',
            ],
            'postulante' => [
                'descripcion' => 'Postulante al curso de preparación',
                'privilegios' => [
                    'dashboard.ver',
                    'mi_postulacion.ver',
                    'postulante.registro',
                ],
            ],
            'docente' => [
                'descripcion' => 'Docente contratado del curso',
                'privilegios' => [
                    'dashboard.ver',
                    'mi_info.ver',
                    'horarios.ver',
                    'notas.ver',
                    'notas.registrar',
                    'grupos.ver',
                ],
            ],
            'coordinador' => [
                'descripcion' => 'Coordinador de admisiones con accesos académicos',
                'privilegios' => [
                    'dashboard.ver',
                    // Configuración
                    'gestiones.ver', 'gestiones.crear', 'gestiones.editar', 'gestiones.eliminar',
                    'carreras.ver', 'carreras.crear', 'carreras.editar', 'carreras.eliminar',
                    'materias.ver', 'materias.crear', 'materias.editar', 'materias.eliminar',
                    'aulas.ver', 'aulas.crear', 'aulas.editar', 'aulas.eliminar',
                    'turnos.ver', 'turnos.crear', 'turnos.editar', 'turnos.eliminar',
                    'horarios.ver', 'horarios.crear', 'horarios.editar', 'horarios.eliminar',
                    // Usuarios
                    'usuarios.ver', 'usuarios.crear', 'usuarios.editar', 'usuarios.eliminar',
                    'postulantes.ver', 'postulantes.crear', 'postulantes.editar', 'postulantes.eliminar',
                    'docentes.ver', 'docentes.contratar', 'docentes.editar', 'docentes.carga_horaria',
                    // Proceso académico
                    'grupos.ver', 'grupos.crear', 'grupos.editar', 'grupos.eliminar', 'grupos.calcular', 'grupos.asignar_postulantes', 'grupos.asignar_docentes',
                    'notas.ver', 'notas.registrar', 'notas.calcular',
                    // Reportes
                    'reportes.ver', 'reportes.exportar',
                    // Bitácora
                    'auditoria.ver',
                ],
            ],
            'autoridad' => [
                'descripcion' => 'Autoridad con acceso de consulta y reportes',
                'privilegios' => [
                    'dashboard.ver',
                    'reportes.ver', 'reportes.exportar',
                    'auditoria.ver',
                ],
            ],
        ];

        // Insertar o actualizar privilegios sin borrar existentes
        $privilegioIds = [];
        foreach ($privilegios as $p) {
            $priv = Privilegio::firstOrCreate(
                ['nombre' => $p['nombre']],
                [
                    'descripcion' => $p['descripcion'],
                    'modulo' => $p['modulo'],
                ]
            );
            $privilegioIds[$p['nombre']] = $priv->id;
        }

        // Insertar o actualizar roles sin borrar existentes
        $rolesCreados = [];
        foreach ($roles as $nombre => $data) {
            $rol = Rol::firstOrCreate(
                ['nombre' => $nombre],
                ['descripcion' => $data['descripcion']]
            );
            $rolesCreados[$nombre] = $rol;

            // Asignar privilegios al rol sin duplicar
            if ($data['privilegios'] === '*') {
                foreach ($privilegioIds as $privId) {
                    DB::table('rol_privilegio')->updateOrInsert(
                        ['rol_id' => $rol->id, 'privilegio_id' => $privId],
                        []
                    );
                }
            } else {
                foreach ($data['privilegios'] as $pn) {
                    if (isset($privilegioIds[$pn])) {
                        DB::table('rol_privilegio')->updateOrInsert(
                            ['rol_id' => $rol->id, 'privilegio_id' => $privilegioIds[$pn]],
                            []
                        );
                    }
                }
            }
        }

        $this->command->info('Roles, privilegios y asignaciones actualizadas correctamente.');
    }
}
