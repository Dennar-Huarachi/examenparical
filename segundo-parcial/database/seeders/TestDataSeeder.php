<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Materia;
use App\Models\Aula;
use App\Models\Turno;
use App\Models\Pago;
use App\Models\Postulante;
use App\Models\PostulanteDocente;
use App\Models\Docente;
use App\Models\Grupo;
use App\Models\Horario;
use App\Models\HorarioBloque;
use App\Models\Examen;
use App\Models\Nota;
use App\Models\NotaMateria;
use App\Models\DocumentoPostulante;
use App\Models\DocumentoDocente;
use App\Models\DocenteDisponibilidad;
use App\Models\CupoCarrera;
use App\Models\Gestion;
use App\Models\Bitacora;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TestDataSeeder extends Seeder
{
    private array $turnoIds = [];
    private array $materiaIds = [];
    private int $adminId;

    public function run(): void
    {
        $this->adminId = User::where('email', 'rojasgutierrezkristenalexis@gmail.com')->first()->id;
        $this->seedTurnos();
        $this->seedMaterias();

        // Gestiones
        $this->seedGestion('1-2025', 2025, 1, '2025-02-01', '2025-06-30', 'cerrado');
        $this->seedGestion('1-2026', 2026, 1, '2026-02-01', '2026-06-30', 'activo');
        $this->seedGestion('2-2026', 2026, 2, '2026-08-01', '2026-12-20', 'planificado');

        $this->seedGestion2025();
        $this->seedGestion2026();
        $this->seedGestion2026Segundo();

        $this->command->info('');
        $this->command->info('===================================================');
        $this->command->info('DATOS DE PRUEBA COMPLETOS INSERTADOS CORRECTAMENTE');
        $this->command->info('===================================================');
    }

    private function seedTurnos(): void
    {
        $turnos = [
            ['nombre' => 'Mañana', 'hora_inicio' => '07:30', 'hora_fin' => '12:30'],
            ['nombre' => 'Tarde', 'hora_inicio' => '13:30', 'hora_fin' => '18:30'],
            ['nombre' => 'Noche', 'hora_inicio' => '18:30', 'hora_fin' => '22:30'],
        ];
        foreach ($turnos as $t) {
            $turno = Turno::firstOrCreate(['nombre' => $t['nombre']], $t);
            $this->turnoIds[$t['nombre']] = $turno->id;
        }
    }

    private function seedMaterias(): void
    {
        $materias = [
            ['nombre' => 'Razonamiento Lógico Matemático', 'peso' => 1.50],
            ['nombre' => 'Razonamiento Verbal', 'peso' => 1.00],
            ['nombre' => 'Matemáticas', 'peso' => 2.00],
            ['nombre' => 'Física', 'peso' => 1.50],
            ['nombre' => 'Química', 'peso' => 1.00],
            ['nombre' => 'Informática Básica', 'peso' => 1.00],
            ['nombre' => 'Inglés Técnico', 'peso' => 0.50],
            ['nombre' => 'Lenguaje y Comunicación', 'peso' => 1.00],
        ];
        foreach ($materias as $m) {
            $mat = Materia::firstOrCreate(['nombre' => $m['nombre']], $m);
            $this->materiaIds[$m['nombre']] = $mat->id;
        }
    }

    private function seedGestion(string $codigo, int $anio, int $numero, string $inicio, string $fin, string $estado): int
    {
        $g = Gestion::where('codigo', $codigo)->first();
        if ($g) {
            $g->update(['año' => $anio, 'numero' => $numero, 'fecha_inicio' => $inicio, 'fecha_fin' => $fin, 'estado' => $estado]);
            return $g->id;
        }
        // Manually set next ID to avoid sequence issues with PostgreSQL
        $nextId = DB::table('gestiones')->max('id') + 1;
        $g = new Gestion();
        $g->id = $nextId;
        $g->codigo = $codigo;
        $g->año = $anio;
        $g->numero = $numero;
        $g->fecha_inicio = $inicio;
        $g->fecha_fin = $fin;
        $g->estado = $estado;
        $g->save();

        CupoCarrera::updateOrCreate(
            ['carrera_id' => 1, 'gestion_id' => $g->id],
            ['cupo_maximo' => 80, 'cupos_ocupados' => 0]
        );
        CupoCarrera::updateOrCreate(
            ['carrera_id' => 2, 'gestion_id' => $g->id],
            ['cupo_maximo' => 100, 'cupos_ocupados' => 0]
        );
        CupoCarrera::updateOrCreate(
            ['carrera_id' => 3, 'gestion_id' => $g->id],
            ['cupo_maximo' => 60, 'cupos_ocupados' => 0]
        );

        $this->seedAulas($g->id);
        return $g->id;
    }

    private function seedAulas(int $gestionId): void
    {
        $aulas = [
            ['numero' => '101', 'nombre' => 'Aula 101', 'capacidad' => 40, 'piso' => 1, 'edificio' => 'Edificio A', 'tiene_proyector' => true, 'modalidad' => 'Presencial', 'gestion_id' => $gestionId],
            ['numero' => '102', 'nombre' => 'Aula 102', 'capacidad' => 35, 'piso' => 1, 'edificio' => 'Edificio A', 'tiene_proyector' => true, 'modalidad' => 'Presencial', 'gestion_id' => $gestionId],
            ['numero' => '201', 'nombre' => 'Aula 201', 'capacidad' => 45, 'piso' => 2, 'edificio' => 'Edificio A', 'tiene_proyector' => false, 'modalidad' => 'Presencial', 'gestion_id' => $gestionId],
            ['numero' => '202', 'nombre' => 'Aula 202', 'capacidad' => 30, 'piso' => 2, 'edificio' => 'Edificio A', 'tiene_proyector' => true, 'modalidad' => 'Presencial', 'gestion_id' => $gestionId],
            ['numero' => 'Lab-1', 'nombre' => 'Laboratorio de Informática 1', 'capacidad' => 30, 'piso' => 1, 'edificio' => 'Edificio B', 'tiene_proyector' => true, 'modalidad' => 'Presencial', 'gestion_id' => $gestionId],
            ['numero' => 'Lab-2', 'nombre' => 'Laboratorio de Informática 2', 'capacidad' => 30, 'piso' => 2, 'edificio' => 'Edificio B', 'tiene_proyector' => true, 'modalidad' => 'Presencial', 'gestion_id' => $gestionId],
            ['numero' => '301', 'nombre' => 'Aula 301', 'capacidad' => 50, 'piso' => 3, 'edificio' => 'Edificio A', 'tiene_proyector' => true, 'modalidad' => 'Presencial', 'gestion_id' => $gestionId],
        ];
        foreach ($aulas as $a) {
            Aula::firstOrCreate(
                ['numero' => $a['numero'], 'gestion_id' => $a['gestion_id']],
                $a
            );
        }
    }

    // ======================== GESTION 1-2025 (CERRADA) ========================
    private function seedGestion2025(): void
    {
        $gid = Gestion::where('codigo', '1-2025')->first()->id;
        $this->command->info("--- Sembrando gestión 1-2025 (cerrada) ---");

        // Docentes
        $docentes2025 = $this->seedDocentes2025($gid);
        $grupos2025 = $this->seedGrupos($gid, 'Grupo 2025');
        $postulantes2025 = $this->seedPostulantes2025($gid);

        // Asignar postulantes a grupos
        $this->asignarPostulantesAGrupos($postulantes2025, $grupos2025);

        // Asignar docentes a grupos via horarios
        $aulas = Aula::where('gestion_id', $gid)->get();
        $this->seedHorarios($gid, $grupos2025, $docentes2025, $aulas);

        // Examenes y notas completos
        $this->seedExamenesYNotas($gid, $postulantes2025, true);

        // Pagos
        $this->seedPagos($gid, $postulantes2025);

        $this->command->info("Gestión 1-2025 completada: " . count($postulantes2025) . " postulantes");
    }

    private function seedDocentes2025(int $gid): array
    {
        $docentes = [
            ['ci' => '12543678', 'nombres' => 'Marcelo', 'apellidos' => 'Quisbert Fernández', 'titulo_academico' => 'Lic. en Matemáticas', 'especialidad' => 'Álgebra', 'materia_preferida' => 'Matemáticas', 'disponibilidad_horaria' => 'Mañana y Tarde', 'carga_horaria_maxima' => 25],
            ['ci' => '21543678', 'nombres' => 'Patricia', 'apellidos' => 'López Montecinos', 'titulo_academico' => 'Lic. en Física', 'especialidad' => 'Física General', 'materia_preferida' => 'Física', 'disponibilidad_horaria' => 'Mañana', 'carga_horaria_maxima' => 20],
            ['ci' => '31543678', 'nombres' => 'Gonzalo', 'apellidos' => 'Rojas Mérida', 'titulo_academico' => 'Lic. en Informática', 'especialidad' => 'Programación', 'materia_preferida' => 'Informática Básica', 'disponibilidad_horaria' => 'Tarde', 'carga_horaria_maxima' => 22],
        ];
        $created = [];
        foreach ($docentes as $d) {
            $pd = PostulanteDocente::firstOrCreate(
                ['ci' => $d['ci']],
                array_merge($d, ['gestion_id' => $gid, 'usuario_id' => $this->adminId, 'estado' => 'contratado'])
            );
            $doc = Docente::firstOrCreate(
                ['postulante_docente_id' => $pd->id],
                ['postulante_docente_id' => $pd->id, 'fecha_contratacion' => '2025-01-15', 'estado' => 'activo', 'gestion_id' => $gid]
            );
            $created[] = $doc;

            // Disponibilidad
            DocenteDisponibilidad::firstOrCreate(
                ['postulante_docente_id' => $pd->id, 'turno_id' => $this->turnoIds['Mañana'], 'gestion_id' => $gid],
                ['horas_disponibles' => 20]
            );
        }
        return $created;
    }

    private function seedGrupos(int $gid, string $prefix): array
    {
        $grupos = [
            ['nombre' => "$prefix - A", 'capacidad_maxima' => 40, 'turno_id' => $this->turnoIds['Mañana'], 'modalidad' => 'Presencial', 'gestion_id' => $gid, 'total_inscritos' => 0, 'estado' => 'activo'],
            ['nombre' => "$prefix - B", 'capacidad_maxima' => 40, 'turno_id' => $this->turnoIds['Tarde'], 'modalidad' => 'Presencial', 'gestion_id' => $gid, 'total_inscritos' => 0, 'estado' => 'activo'],
            ['nombre' => "$prefix - C", 'capacidad_maxima' => 35, 'turno_id' => $this->turnoIds['Noche'], 'modalidad' => 'Presencial', 'gestion_id' => $gid, 'total_inscritos' => 0, 'estado' => 'activo'],
            ['nombre' => "$prefix - D", 'capacidad_maxima' => 30, 'turno_id' => $this->turnoIds['Mañana'], 'modalidad' => 'Presencial', 'gestion_id' => $gid, 'total_inscritos' => 0, 'estado' => 'activo'],
        ];
        $created = [];
        foreach ($grupos as $g) {
            $created[] = Grupo::firstOrCreate(['nombre' => $g['nombre'], 'gestion_id' => $g['gestion_id']], $g);
        }
        return $created;
    }

    private function seedPostulantes2025(int $gid): array
    {
        $data = [];
        for ($i = 1; $i <= 30; $i++) {
            $ci = sprintf('%08d', 70000000 + $i);
            $estado = $i <= 18 ? 'aprobado' : ($i <= 25 ? 'reprobado' : 'pendiente');
            $notaFinal = $estado === 'aprobado' ? round(rand(6000, 9500) / 100, 2) : ($estado === 'reprobado' ? round(rand(2000, 5500) / 100, 2) : null);
            $carrera = ($i % 3) + 1;
            $sexo = $i % 2 === 0 ? 'M' : 'F';
            $data[] = [
                'ci' => $ci,
                'nombres' => $this->nombreAleatorio($sexo),
                'apellidos' => $this->apellidoAleatorio(),
                'fecha_nacimiento' => "200" . rand(4, 6) . "-" . str_pad(rand(1, 12), 2, "0", STR_PAD_LEFT) . "-" . str_pad(rand(1, 28), 2, "0", STR_PAD_LEFT),
                'sexo' => $sexo,
                'direccion' => "Calle " . rand(1, 999) . " #" . rand(100, 999),
                'telefono' => rand(7, 7) . str_pad(rand(1, 9999999), 7, "0", STR_PAD_LEFT),
                'correo' => "postulante$i.2025@email.com",
                'colegio_procedencia' => $this->colegioAleatorio(),
                'ciudad' => $i % 3 === 0 ? 'Quillacollo' : ($i % 3 === 1 ? 'Sacaba' : 'Cochabamba'),
                'carrera_principal_id' => $carrera,
                'carrera_secundaria_id' => ($carrera % 3) + 1,
                'titulo_bachiller' => true,
                'año_bachillerato' => 2024,
                'turno_preferido' => ['Mañana', 'Tarde', 'Noche'][$i % 3],
                'otros' => null,
                'estado' => $estado,
                'nota_final' => $notaFinal,
                'pago_id' => null,
                'gestion_id' => $gid,
                'usuario_id' => $this->adminId,
            ];
        }
        return $this->insertarPostulantes($data);
    }

    private function seedPostulantes2026(int $gid): array
    {
        $data = [];
        for ($i = 1; $i <= 50; $i++) {
            $ci = sprintf('%08d', 80000000 + $i);
            $estado = $i <= 25 ? 'pendiente' : ($i <= 40 ? 'aprobado' : 'reprobado');
            $notaFinal = $estado === 'aprobado' ? round(rand(6000, 9800) / 100, 2) : ($estado === 'reprobado' ? round(rand(1500, 5500) / 100, 2) : null);
            $carrera = ($i % 3) + 1;
            $sexo = $i % 2 === 0 ? 'F' : 'M';
            $data[] = [
                'ci' => $ci,
                'nombres' => $this->nombreAleatorio($sexo),
                'apellidos' => $this->apellidoAleatorio(),
                'fecha_nacimiento' => "200" . rand(4, 7) . "-" . str_pad(rand(1, 12), 2, "0", STR_PAD_LEFT) . "-" . str_pad(rand(1, 28), 2, "0", STR_PAD_LEFT),
                'sexo' => $sexo,
                'direccion' => "Av. " . rand(1, 20) . " de " . ['Abril', 'Mayo', 'Junio', 'Julio'][$i % 4] . " #" . rand(100, 999),
                'telefono' => rand(7, 7) . str_pad(rand(1, 9999999), 7, "0", STR_PAD_LEFT),
                'correo' => "postulante$i.2026@email.com",
                'colegio_procedencia' => $this->colegioAleatorio(),
                'ciudad' => ['Cochabamba', 'Quillacollo', 'Sacaba', 'Vinto', 'Tiquipaya'][$i % 5],
                'carrera_principal_id' => $carrera,
                'carrera_secundaria_id' => (($carrera) % 3) + 1,
                'titulo_bachiller' => $i % 5 !== 0,
                'año_bachillerato' => $i % 5 !== 0 ? 2024 : null,
                'turno_preferido' => ['Mañana', 'Tarde', 'Noche'][$i % 3],
                'otros' => $i % 10 === 0 ? 'Trabaja medio tiempo' : null,
                'estado' => $estado,
                'nota_final' => $notaFinal,
                'pago_id' => null,
                'gestion_id' => $gid,
                'usuario_id' => $this->adminId,
            ];
        }
        return $this->insertarPostulantes($data);
    }

    private function insertarPostulantes(array $data): array
    {
        $created = [];
        foreach ($data as $p) {
            $postulante = Postulante::firstOrCreate(['ci' => $p['ci']], $p);
            $created[] = $postulante;
        }
        return $created;
    }

    private function asignarPostulantesAGrupos(array $postulantes, array $grupos): void
    {
        foreach ($postulantes as $i => $p) {
            $gIdx = $i % count($grupos);
            $g = $grupos[$gIdx];
            DB::table('grupo_postulante')->updateOrInsert(
                ['grupo_id' => $g->id, 'postulante_id' => $p->id],
                ['fecha_asignacion' => now(), 'created_at' => now(), 'updated_at' => now()]
            );
            $g->increment('total_inscritos');
        }
    }

    private function seedHorarios(int $gid, array $grupos, array $docentes, $aulas): void
    {
        $dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
        $materias = array_values($this->materiaIds);
        $aulaList = $aulas instanceof \Illuminate\Support\Collection ? $aulas->all() : $aulas;

        foreach ($grupos as $i => $grupo) {
            $doc = $docentes[$i % count($docentes)];
            $aula = $aulaList[$i % count($aulaList)];
            $matId = $materias[$i % count($materias)];
            $dia = $dias[$i % count($dias)];
            $turno = Turno::find($grupo->turno_id);

            Horario::firstOrCreate(
                ['grupo_id' => $grupo->id, 'dia_semana' => $dia, 'hora_inicio' => $turno->hora_inicio],
                [
                    'grupo_id' => $grupo->id, 'materia_id' => $matId, 'docente_id' => $doc->id,
                    'aula_id' => $aula->id, 'dia_semana' => $dia,
                    'hora_inicio' => $turno->hora_inicio, 'hora_fin' => $turno->hora_fin,
                    'gestion_id' => $gid,
                ]
            );

            HorarioBloque::firstOrCreate(
                ['grupo_id' => $grupo->id, 'dia_semana' => $dia, 'bloque_inicio' => 1],
                [
                    'grupo_id' => $grupo->id, 'materia_id' => $matId, 'docente_id' => $doc->id,
                    'aula_id' => $aula->id, 'dia_semana' => $dia,
                    'bloque_inicio' => 1, 'bloque_fin' => 2,
                    'hora_inicio' => $turno->hora_inicio, 'hora_fin' => $turno->hora_fin,
                    'turno_id' => $grupo->turno_id, 'gestion_id' => $gid,
                ]
            );
        }
    }

    private function seedExamenesYNotas(int $gid, array $postulantes, bool $completas): void
    {
        $materias = array_values($this->materiaIds);

        foreach ($postulantes as $p) {
            $materiasAsignadas = array_slice($materias, 0, rand(2, 4));
            $aprobadoGeneral = $p->estado === 'aprobado';

            foreach ($materiasAsignadas as $matId) {
                for ($numEx = 1; $numEx <= 3; $numEx++) {
                    $examen = Examen::firstOrCreate(
                        ['postulante_id' => $p->id, 'materia_id' => $matId, 'numero_examen' => $numEx],
                        [
                            'fecha' => "2025-0" . rand(2, 4) . "-" . str_pad(rand(10, 28), 2, "0", STR_PAD_LEFT),
                            'estado' => $completas ? 'calificado' : 'pendiente',
                        ]
                    );

                    if ($completas) {
                        $notaValor = $aprobadoGeneral
                            ? round(rand(6000, 9500) / 100, 2)
                            : round(rand(1500, 5500) / 100, 2);
                        Nota::firstOrCreate(
                            ['examen_id' => $examen->id],
                            ['nota' => $notaValor, 'registrado_por' => $this->adminId]
                        );
                    }
                }

                // Promedio y estado por materia
                if ($completas) {
                    $promedio = Nota::whereHas('examen', function ($q) use ($p, $matId) {
                        $q->where('postulante_id', $p->id)->where('materia_id', $matId);
                    })->avg('nota');

                    NotaMateria::firstOrCreate(
                        ['postulante_id' => $p->id, 'materia_id' => $matId],
                        ['promedio' => round($promedio ?? 0, 2), 'aprobado' => ($promedio ?? 0) >= 60]
                    );
                }
            }
        }
    }

    private function seedPagos(int $gid, array $postulantes): void
    {
        foreach ($postulantes as $i => $p) {
            $comp = "COMP-{$gid}-" . str_pad($i + 1, 3, "0", STR_PAD_LEFT);
            $pago = Pago::firstOrCreate(
                ['numero_comprobante' => $comp],
                [
                    'ci_pagador' => $p->ci,
                    'monto' => 350.00,
                    'fecha_pago' => '2025-0' . rand(1, 3) . "-" . str_pad(rand(1, 28), 2, "0", STR_PAD_LEFT),
                    'estado' => 'confirmado',
                    'gestion_id' => $gid,
                ]
            );
            $p->update(['pago_id' => $pago->id]);
        }
    }

    // ======================== GESTION 1-2026 (ACTIVA) ========================
    private function seedGestion2026(): void
    {
        $gid = Gestion::where('codigo', '1-2026')->first()->id;
        $this->command->info("--- Sembrando gestión 1-2026 (activa) ---");

        $docentes2026 = $this->seedDocentes2026($gid);
        $grupos2026 = $this->seedGrupos($gid, 'Grupo 2026');
        $postulantes2026 = $this->seedPostulantes2026($gid);

        $this->asignarPostulantesAGrupos($postulantes2026, $grupos2026);

        $aulas = Aula::where('gestion_id', $gid)->get();
        $this->seedHorarios($gid, $grupos2026, $docentes2026, $aulas);

        // Examenes parciales (algunos sí, otros no)
        $this->seedExamenes2026Parcial($gid, $postulantes2026);

        // Pagos
        $this->seedPagos2026($gid, $postulantes2026);

        // Documentos de muestra
        $this->seedDocumentos($postulantes2026);

        $this->command->info("Gestión 1-2026 completada: " . count($postulantes2026) . " postulantes");
    }

    private function seedDocentes2026(int $gid): array
    {
        $docentes = [
            ['ci' => '92543678', 'nombres' => 'Carmen', 'apellidos' => 'Ríos Delgado', 'titulo_academico' => 'Lic. en Física', 'especialidad' => 'Física Educativa', 'materia_preferida' => 'Física', 'disponibilidad_horaria' => 'Tarde', 'carga_horaria_maxima' => 18],
            ['ci' => '93543678', 'nombres' => 'Ricardo', 'apellidos' => 'Álvarez Paredes', 'titulo_academico' => 'Lic. en Matemáticas', 'especialidad' => 'Matemáticas Aplicadas', 'materia_preferida' => 'Matemáticas', 'disponibilidad_horaria' => 'Mañana', 'carga_horaria_maxima' => 20],
            ['ci' => '94543678', 'nombres' => 'Verónica', 'apellidos' => 'Salinas Méndez', 'titulo_academico' => 'Ing. en Sistemas', 'especialidad' => 'Programación Web', 'materia_preferida' => 'Informática Básica', 'disponibilidad_horaria' => 'Mañana y Tarde', 'carga_horaria_maxima' => 24],
        ];
        $created = [];
        foreach ($docentes as $d) {
            $pd = PostulanteDocente::firstOrCreate(
                ['ci' => $d['ci']],
                array_merge($d, ['gestion_id' => $gid, 'usuario_id' => $this->adminId, 'estado' => 'contratado'])
            );
            $doc = Docente::firstOrCreate(
                ['postulante_docente_id' => $pd->id],
                ['postulante_docente_id' => $pd->id, 'fecha_contratacion' => '2026-02-01', 'estado' => 'activo', 'gestion_id' => $gid]
            );
            $created[] = $doc;
        }
        return $created;
    }

    private function seedExamenes2026Parcial(int $gid, array $postulantes): void
    {
        $materias = array_values($this->materiaIds);

        foreach ($postulantes as $p) {
            $tieneNotas = $p->estado !== 'pendiente';
            $materiasAsignadas = array_slice($materias, 0, rand(2, 4));

            foreach ($materiasAsignadas as $matId) {
                for ($numEx = 1; $numEx <= 3; $numEx++) {
                    $tieneExamen = !$tieneNotas ? false : ($numEx <= 2 || rand(0, 1));
                    $examen = Examen::firstOrCreate(
                        ['postulante_id' => $p->id, 'materia_id' => $matId, 'numero_examen' => $numEx],
                        [
                            'fecha' => "2026-0" . rand(2, 4) . "-" . str_pad(rand(10, 28), 2, "0", STR_PAD_LEFT),
                            'estado' => $tieneExamen ? 'calificado' : 'pendiente',
                        ]
                    );

                    if ($tieneExamen) {
                        $notaValor = $p->estado === 'aprobado'
                            ? round(rand(6000, 9500) / 100, 2)
                            : round(rand(1500, 5500) / 100, 2);
                        Nota::firstOrCreate(
                            ['examen_id' => $examen->id],
                            ['nota' => $notaValor, 'registrado_por' => $this->adminId]
                        );
                    }
                }

                if ($tieneNotas) {
                    $promedio = Nota::whereHas('examen', function ($q) use ($p, $matId) {
                        $q->where('postulante_id', $p->id)->where('materia_id', $matId);
                    })->avg('nota');
                    if ($promedio) {
                        NotaMateria::firstOrCreate(
                            ['postulante_id' => $p->id, 'materia_id' => $matId],
                            ['promedio' => round($promedio, 2), 'aprobado' => $promedio >= 60]
                        );
                    }
                }
            }
        }
    }

    private function seedPagos2026(int $gid, array $postulantes): void
    {
        foreach ($postulantes as $i => $p) {
            $comp = "COMP-2026-" . str_pad($i + 1, 3, "0", STR_PAD_LEFT);
            $pago = Pago::firstOrCreate(
                ['numero_comprobante' => $comp],
                [
                    'ci_pagador' => $p->ci,
                    'monto' => 350.00,
                    'fecha_pago' => '2026-0' . rand(1, 3) . "-" . str_pad(rand(1, 28), 2, "0", STR_PAD_LEFT),
                    'estado' => 'confirmado',
                    'gestion_id' => $gid,
                ]
            );
            $p->update(['pago_id' => $pago->id]);
        }
    }

    private function seedDocumentos(array $postulantes): void
    {
        $tipos = ['Cédula de Identidad', 'Título de Bachiller', 'Certificado de Nacimiento', 'Fotografía'];
        foreach (array_slice($postulantes, 0, 10) as $p) {
            foreach (array_slice($tipos, 0, rand(1, 3)) as $tipo) {
                $archivo = strtolower(str_replace(' ', '_', $tipo)) . '_' . $p->ci . '.pdf';
                DocumentoPostulante::firstOrCreate(
                    ['postulante_id' => $p->id, 'tipo_documento' => $tipo],
                    ['nombre_archivo' => $archivo, 'ruta_archivo' => "/documentos/postulantes/{$p->id}/$archivo"]
                );
            }
        }
    }

    // ======================== GESTION 2-2026 (PLANIFICADA) ========================
    private function seedGestion2026Segundo(): void
    {
        $gid = Gestion::where('codigo', '2-2026')->first()->id;
        $this->command->info("--- Sembrando gestión 2-2026 (planificada) ---");

        // Solo algunos postulantes pre-registrados, sin notas
        $data = [];
        for ($i = 1; $i <= 15; $i++) {
            $ci = sprintf('%08d', 90000000 + $i);
            $sexo = $i % 2 === 0 ? 'M' : 'F';
            $data[] = [
                'ci' => $ci,
                'nombres' => $this->nombreAleatorio($sexo),
                'apellidos' => $this->apellidoAleatorio(),
                'fecha_nacimiento' => "200" . rand(5, 7) . "-" . str_pad(rand(1, 12), 2, "0", STR_PAD_LEFT) . "-" . str_pad(rand(1, 28), 2, "0", STR_PAD_LEFT),
                'sexo' => $sexo,
                'direccion' => "Calle " . rand(1, 999) . " #" . rand(100, 999),
                'telefono' => rand(7, 7) . str_pad(rand(1, 9999999), 7, "0", STR_PAD_LEFT),
                'correo' => "postulante$i.2026b@email.com",
                'colegio_procedencia' => $this->colegioAleatorio(),
                'ciudad' => ['Cochabamba', 'Quillacollo', 'Sacaba'][$i % 3],
                'carrera_principal_id' => ($i % 3) + 1,
                'carrera_secundaria_id' => (($i + 1) % 3) + 1,
                'titulo_bachiller' => true,
                'año_bachillerato' => 2025,
                'turno_preferido' => ['Mañana', 'Tarde', 'Noche'][$i % 3],
                'otros' => null,
                'estado' => 'pendiente',
                'nota_final' => null,
                'pago_id' => null,
                'gestion_id' => $gid,
                'usuario_id' => $this->adminId,
            ];
        }
        $this->insertarPostulantes($data);
        $this->command->info("Gestión 2-2026 completada: $i postulantes pre-registrados");
    }

    // ======================== HELPERS ========================

    private function nombreAleatorio(string $sexo): string
    {
        $masculinos = ['Carlos', 'Luis', 'Pedro', 'Juan', 'Diego', 'Andrés', 'Pablo', 'David', 'Jorge', 'Miguel', 'Álvaro', 'Sergio', 'Fernando', 'Cristian', 'Marco', 'José', 'Manuel', 'Ricardo', 'Alberto', 'Daniel'];
        $femeninos = ['María', 'Ana', 'Sofía', 'Laura', 'Carmen', 'Gabriela', 'Valentina', 'Camila', 'Luciana', 'Fernanda', 'Andrea', 'Paola', 'Rosa', 'Claudia', 'Ruth', 'Mónica', 'Elena', 'Patricia', 'Silvia', 'Lorena'];
        return $sexo === 'M' ? $masculinos[array_rand($masculinos)] : $femeninos[array_rand($femeninos)];
    }

    private function apellidoAleatorio(): string
    {
        $apellidos = ['Mendoza', 'López', 'García', 'Quispe', 'Flores', 'Pérez', 'Rojas', 'Vargas', 'Torrico', 'Mamani', 'Cruz', 'Gutiérrez', 'Álvarez', 'Morales', 'Condori', 'Rodríguez', 'Martínez', 'Jiménez', 'Huarachi', 'Fernández'];
        return $apellidos[array_rand($apellidos)] . ' ' . $apellidos[array_rand($apellidos)];
    }

    private function colegioAleatorio(): string
    {
        $colegios = ['Colegio San Simón', 'Colegio Alemán', 'Colegio Don Bosco', 'Colegio Santa Clara', 'Colegio Sucre', 'Colegio San Agustín', 'Colegio Bolívar', 'Colegio Nacional', 'Colegio La Salle', 'Colegio San Martín'];
        return $colegios[array_rand($colegios)];
    }
}
