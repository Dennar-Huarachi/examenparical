<?php

namespace App\Http\Controllers;

use App\Models\Docente;
use App\Models\DocenteDisponibilidad;
use App\Models\HorarioBloque;
use App\Models\Gestion;
use App\Models\Turno;
use App\Models\Grupo;
use App\Models\Materia;
use App\Models\Aula;
use App\Helpers\BloqueHelper;
use App\Helpers\BitacoraHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class CargaHorariaController extends Controller
{
    private function obtenerGestionActiva()
    {
        $gestion = Gestion::where('estado', 'activo')->first();
        if (!$gestion) return null;
        return $gestion;
    }

    public function asignarManual(Request $request)
    {
        $validador = Validator::make($request->all(), [
            'docente_id'    => 'required|integer|exists:docentes,id',
            'grupo_id'      => 'required|integer|exists:grupos,id',
            'materia_id'    => 'required|integer|exists:materias,id',
            'aula_id'       => 'required|integer|exists:aulas,id',
            'turno_id'      => 'required|integer|exists:turnos,id',
            'bloque_inicio' => 'required|integer|min:1',
            'bloque_fin'    => 'required|integer|min:1|gte:bloque_inicio',
            'dias'          => 'required|array|min:1',
            'dias.*'        => 'required|string|in:Lunes,Martes,Miércoles,Jueves,Viernes,Sábado',
        ]);

        if ($validador->fails()) {
            return response()->json(['success' => false, 'message' => $validador->errors()->first()], 422);
        }

        $gestion = $this->obtenerGestionActiva();
        if (!$gestion) {
            return response()->json(['success' => false, 'message' => 'No hay una gestión activa.'], 422);
        }

        $turno = Turno::find($request->turno_id);
        if (!$turno) {
            return response()->json(['success' => false, 'message' => 'Turno no encontrado.'], 404);
        }

        $horasBloque = BloqueHelper::calcularHorasBloque($turno->nombre, $request->bloque_inicio, $request->bloque_fin);
        if (!$horasBloque) {
            return response()->json(['success' => false, 'message' => 'Números de bloque inválidos para el turno.'], 422);
        }

        $duracionHoras = (strtotime($horasBloque['hora_fin']) - strtotime($horasBloque['hora_inicio'])) / 3600;
        $totalNuevas = $duracionHoras * count($request->dias);

        $docente = Docente::with('postulanteDocente')->find($request->docente_id);
        if (!$docente) {
            return response()->json(['success' => false, 'message' => 'Docente no encontrado.'], 404);
        }

        $pd = $docente->postulanteDocente;
        $cargaMaxima = (int) ($pd->carga_horaria_maxima ?? 0);

        if ($cargaMaxima > 0) {
            $horasExistentes = HorarioBloque::where('docente_id', $request->docente_id)
                ->select(DB::raw("COALESCE(SUM(EXTRACT(EPOCH FROM (hora_fin - hora_inicio)) / 3600), 0) as total"))
                ->first();
            $horasActuales = (float) ($horasExistentes->total ?? 0);

            if (($horasActuales + $totalNuevas) > $cargaMaxima) {
                return response()->json([
                    'success' => false,
                    'message' => "El docente superaría su carga horaria máxima de {$cargaMaxima} hrs/sem "
                        . "(actual: {$horasActuales} hrs, nuevas: {$totalNuevas} hrs).",
                ], 422);
            }
        }

        $disponibilidad = DocenteDisponibilidad::where('postulante_docente_id', $pd->id)
            ->where('turno_id', $request->turno_id)
            ->where('gestion_id', $gestion->id)
            ->first();

        if ($disponibilidad && $disponibilidad->horas_disponibles > 0) {
            $horasAsignadasEnTurno = HorarioBloque::where('docente_id', $request->docente_id)
                ->where('turno_id', $request->turno_id)
                ->select(DB::raw("COALESCE(SUM(EXTRACT(EPOCH FROM (hora_fin - hora_inicio)) / 3600), 0) as total"))
                ->first();
            $horasEnTurno = (float) ($horasAsignadasEnTurno->total ?? 0);

            if (($horasEnTurno + $totalNuevas) > $disponibilidad->horas_disponibles) {
                return response()->json([
                    'success' => false,
                    'message' => "El docente superaría su disponibilidad de {$disponibilidad->horas_disponibles} hrs en el turno {$turno->nombre} "
                        . "(actual en turno: {$horasEnTurno} hrs, nuevas: {$totalNuevas} hrs).",
                ], 422);
            }
        }

        $erroresPorDia = [];
        foreach ($request->dias as $dia) {
            $cruces = $this->validarCruces(
                $request->grupo_id,
                $request->docente_id,
                $request->aula_id,
                $dia,
                $horasBloque['hora_inicio'],
                $horasBloque['hora_fin']
            );
            if (!empty($cruces)) {
                $erroresPorDia[$dia] = $cruces;
            }
        }

        if (!empty($erroresPorDia)) {
            $mensajes = [];
            foreach ($erroresPorDia as $dia => $cruces) {
                $mensajes[] = $dia . ': ' . implode(', ', $cruces);
            }
            return response()->json([
                'success' => false,
                'message' => 'Conflictos detectados: ' . implode(' | ', $mensajes),
                'errores_por_dia' => $erroresPorDia,
            ], 422);
        }

        $creados = [];
        foreach ($request->dias as $dia) {
            $creados[] = HorarioBloque::create([
                'grupo_id'      => $request->grupo_id,
                'materia_id'    => $request->materia_id,
                'docente_id'    => $request->docente_id,
                'aula_id'       => $request->aula_id,
                'dia_semana'    => $dia,
                'bloque_inicio' => $request->bloque_inicio,
                'bloque_fin'    => $request->bloque_fin,
                'hora_inicio'   => $horasBloque['hora_inicio'],
                'hora_fin'      => $horasBloque['hora_fin'],
                'turno_id'      => $request->turno_id,
                'gestion_id'    => $gestion->id,
            ]);
        }

        BitacoraHelper::registrar(
            'Asignación manual de carga horaria',
            'horario_bloques',
            $creados[0]->id,
            'Docente ID: ' . $request->docente_id . ', Grupo ID: ' . $request->grupo_id
                . ', Materia ID: ' . $request->materia_id . ', Días: ' . implode(', ', $request->dias)
        );

        return response()->json([
            'success' => true,
            'data'    => $creados,
            'message' => 'Carga horaria asignada correctamente en ' . count($creados) . ' día(s).',
        ], 200);
    }

    public function asignarAutomatico(Request $request)
    {
        $validador = Validator::make($request->all(), [
            'docente_id' => 'required|integer|exists:docentes,id',
            'modo'       => 'required|string|in:llenar_huecos,maximizar_horas',
        ]);

        if ($validador->fails()) {
            return response()->json(['success' => false, 'message' => $validador->errors()->first()], 422);
        }

        $gestion = $this->obtenerGestionActiva();
        if (!$gestion) {
            return response()->json(['success' => false, 'message' => 'No hay una gestión activa.'], 422);
        }

        $docente = Docente::with('postulanteDocente')->find($request->docente_id);
        if (!$docente || !$docente->postulanteDocente) {
            return response()->json(['success' => false, 'message' => 'Docente no encontrado o sin postulante asociado.'], 404);
        }

        $pd = $docente->postulanteDocente;
        $cargaMaxima = (int) ($pd->carga_horaria_maxima ?? 0);
        $materiaPreferida = $pd->materia_preferida;

        $horasExistentes = HorarioBloque::where('docente_id', $docente->id)
            ->select(DB::raw("COALESCE(SUM(EXTRACT(EPOCH FROM (hora_fin - hora_inicio)) / 3600), 0) as total"))
            ->first();
        $horasActuales = (float) ($horasExistentes->total ?? 0);
        $horasRestantes = $cargaMaxima > 0 ? max(0, $cargaMaxima - $horasActuales) : 999;

        if ($horasRestantes <= 0 && $request->modo === 'llenar_huecos') {
            return response()->json([
                'success' => false,
                'message' => 'El docente ya ha alcanzado su carga horaria máxima.',
            ], 422);
        }

        $disponibilidad = DocenteDisponibilidad::where('postulante_docente_id', $pd->id)
            ->where('gestion_id', $gestion->id)
            ->get()
            ->keyBy('turno_id');

        $disponibilidadPorDefecto = $disponibilidad->isEmpty();

        $turnos = Turno::all()->keyBy('id');

        $grupos = Grupo::with('turno')
            ->where('gestion_id', $gestion->id)
            ->where('estado', 'activo')
            ->get();

        $materias = Materia::orderBy('id')->get();
        $aulas = Aula::where('disponible', true)->get();

        $asignaciones = [];

        foreach ($grupos as $grupo) {
            $turnoId = $grupo->turno_id;
            $turno = $turnos->get($turnoId);
            if (!$turno) continue;

            if (!$disponibilidadPorDefecto) {
                $dispTurno = $disponibilidad->get($turnoId);
                if (!$dispTurno || $dispTurno->horas_disponibles <= 0) continue;

                $horasEnTurno = HorarioBloque::where('docente_id', $docente->id)
                    ->where('turno_id', $turnoId)
                    ->select(DB::raw("COALESCE(SUM(EXTRACT(EPOCH FROM (hora_fin - hora_inicio)) / 3600), 0) as total"))
                    ->first();
                $horasUsadasTurno = (float) ($horasEnTurno->total ?? 0);
                $horasLibresTurno = max(0, $dispTurno->horas_disponibles - $horasUsadasTurno);
                if ($horasLibresTurno <= 0) continue;
            }

            $materiasExistentes = HorarioBloque::where('grupo_id', $grupo->id)
                ->where('gestion_id', $gestion->id)
                ->pluck('materia_id')
                ->unique();

            $materiasFaltantes = $materias->filter(function ($m) use ($materiasExistentes) {
                return !$materiasExistentes->contains($m->id);
            });

            if ($materiasFaltantes->isEmpty()) continue;

            $materiasOrdenadas = $materiasFaltantes->sortByDesc(function ($m) use ($materiaPreferida) {
                return $m->nombre === $materiaPreferida ? 0 : 1;
            });

            $bloquesDef = BloqueHelper::obtenerBloquesPorTurno()[$turno->nombre] ?? [];
            if (empty($bloquesDef)) continue;

            $bloqueInicio = 1;
            $bloqueFin = count($bloquesDef);

            $aula = $aulas->first();
            if (!$aula) continue;

            $horasPorAsignacion = BloqueHelper::calcularDuracionBloques($turno->nombre, $bloqueInicio, $bloqueFin);

            if ($horasPorAsignacion > $horasRestantes && $request->modo !== 'maximizar_horas') continue;

            $diasDisponibles = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
            $diasSinCruce = [];

            $horasBloque = BloqueHelper::calcularHorasBloque($turno->nombre, $bloqueInicio, $bloqueFin);
            if (!$horasBloque) continue;

            foreach ($diasDisponibles as $dia) {
                $cruces = $this->validarCruces(
                    $grupo->id,
                    $docente->id,
                    $aula->id,
                    $dia,
                    $horasBloque['hora_inicio'],
                    $horasBloque['hora_fin']
                );
                if (empty($cruces)) {
                    $diasSinCruce[] = $dia;
                }
            }

            if (empty($diasSinCruce)) continue;

            $materiaAsignar = $materiasOrdenadas->first();
            if (!$materiaAsignar) continue;

            $horasAsignar = $horasPorAsignacion * count($diasSinCruce);

            if ($request->modo === 'maximizar_horas') {
                $diasSinCruce = array_slice($diasSinCruce, 0, max(1, (int) floor($horasRestantes / max($horasPorAsignacion, 1))));
                $horasAsignar = $horasPorAsignacion * count($diasSinCruce);
            }

            if ($horasAsignar > $horasRestantes && $request->modo === 'llenar_huecos') {
                $diasSinCruce = array_slice($diasSinCruce, 0, max(1, (int) floor($horasRestantes / max($horasPorAsignacion, 1))));
                $horasAsignar = $horasPorAsignacion * count($diasSinCruce);
            }

            if (empty($diasSinCruce)) continue;

            $asignaciones[] = [
                'grupo_id'      => $grupo->id,
                'grupo_nombre'  => $grupo->nombre,
                'materia_id'    => $materiaAsignar->id,
                'materia_nombre'=> $materiaAsignar->nombre,
                'turno_id'      => $turnoId,
                'aula_id'       => $aula->id,
                'bloque_inicio' => $bloqueInicio,
                'bloque_fin'    => $bloqueFin,
                'dias'          => $diasSinCruce,
                'horas_totales' => round($horasAsignar, 1),
            ];

            $horasRestantes -= $horasAsignar;
            if ($horasRestantes <= 0) break;
        }

        if (empty($asignaciones)) {
            return response()->json([
                'success' => false,
                'message' => 'No se encontraron grupos sin asignar para este docente.',
                'data'    => [],
            ], 200);
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'asignaciones' => $asignaciones,
                'total_horas'  => collect($asignaciones)->sum('horas_totales'),
                'modo'         => $request->modo,
            ],
            'message' => 'Asignación automática simulada correctamente. Revise los resultados antes de confirmar.',
        ], 200);
    }

    public function confirmarAutomatico(Request $request)
    {
        $validador = Validator::make($request->all(), [
            'docente_id'  => 'required|integer|exists:docentes,id',
            'asignaciones'=> 'required|array|min:1',
            'asignaciones.*.grupo_id'      => 'required|integer|exists:grupos,id',
            'asignaciones.*.materia_id'    => 'required|integer|exists:materias,id',
            'asignaciones.*.aula_id'       => 'required|integer|exists:aulas,id',
            'asignaciones.*.turno_id'      => 'required|integer|exists:turnos,id',
            'asignaciones.*.bloque_inicio' => 'required|integer|min:1',
            'asignaciones.*.bloque_fin'    => 'required|integer|min:1|gte:asignaciones.*.bloque_inicio',
            'asignaciones.*.dias'          => 'required|array|min:1',
            'asignaciones.*.dias.*'        => 'string|in:Lunes,Martes,Miércoles,Jueves,Viernes,Sábado',
        ]);

        if ($validador->fails()) {
            return response()->json(['success' => false, 'message' => $validador->errors()->first()], 422);
        }

        $gestion = $this->obtenerGestionActiva();
        if (!$gestion) {
            return response()->json(['success' => false, 'message' => 'No hay una gestión activa.'], 422);
        }

        $docente = Docente::with('postulanteDocente')->find($request->docente_id);
        if (!$docente) {
            return response()->json(['success' => false, 'message' => 'Docente no encontrado.'], 404);
        }

        $totalCreados = 0;
        $errores = [];

        foreach ($request->asignaciones as $asignacion) {
            $turno = Turno::find($asignacion['turno_id']);
            if (!$turno) {
                $errores[] = "Turno no encontrado para grupo {$asignacion['grupo_id']}.";
                continue;
            }

            $horasBloque = BloqueHelper::calcularHorasBloque(
                $turno->nombre,
                $asignacion['bloque_inicio'],
                $asignacion['bloque_fin']
            );

            if (!$horasBloque) {
                $errores[] = "Bloques inválidos para grupo {$asignacion['grupo_id']}.";
                continue;
            }

            foreach ($asignacion['dias'] as $dia) {
                $cruces = $this->validarCruces(
                    $asignacion['grupo_id'],
                    $docente->id,
                    $asignacion['aula_id'],
                    $dia,
                    $horasBloque['hora_inicio'],
                    $horasBloque['hora_fin']
                );

                if (!empty($cruces)) {
                    $errores[] = "Cruce en {$dia} para grupo {$asignacion['grupo_id']}: " . implode(', ', $cruces);
                    continue 2;
                }

                HorarioBloque::create([
                    'grupo_id'      => $asignacion['grupo_id'],
                    'materia_id'    => $asignacion['materia_id'],
                    'docente_id'    => $docente->id,
                    'aula_id'       => $asignacion['aula_id'],
                    'dia_semana'    => $dia,
                    'bloque_inicio' => $asignacion['bloque_inicio'],
                    'bloque_fin'    => $asignacion['bloque_fin'],
                    'hora_inicio'   => $horasBloque['hora_inicio'],
                    'hora_fin'      => $horasBloque['hora_fin'],
                    'turno_id'      => $asignacion['turno_id'],
                    'gestion_id'    => $gestion->id,
                ]);
                $totalCreados++;
            }
        }

        BitacoraHelper::registrar(
            'Confirmación de asignación automática',
            'horario_bloques',
            $docente->id,
            'Docente ID: ' . $docente->id . ', Bloques creados: ' . $totalCreados
        );

        return response()->json([
            'success' => true,
            'data'    => [
                'bloques_creados' => $totalCreados,
                'errores'         => $errores,
            ],
            'message' => "Asignación automática completada. {$totalCreados} bloque(s) creado(s).",
        ], 200);
    }

    public function gruposSinDocente()
    {
        $gestion = $this->obtenerGestionActiva();
        if (!$gestion) {
            return response()->json(['success' => false, 'message' => 'No hay una gestión activa.'], 422);
        }

        $grupos = Grupo::with('turno')
            ->where('gestion_id', $gestion->id)
            ->where('estado', 'activo')
            ->get();

        $materias = Materia::orderBy('id')->get();

        $resultado = [];

        foreach ($grupos as $grupo) {
            $materiasExistentes = HorarioBloque::where('grupo_id', $grupo->id)
                ->where('gestion_id', $gestion->id)
                ->pluck('materia_id')
                ->unique();

            $materiasFaltantes = $materias->filter(function ($m) use ($materiasExistentes) {
                return !$materiasExistentes->contains($m->id);
            });

            if ($materiasFaltantes->isNotEmpty()) {
                $resultado[] = [
                    'grupo_id'       => $grupo->id,
                    'grupo_nombre'   => $grupo->nombre,
                    'turno_id'       => $grupo->turno_id,
                    'turno_nombre'   => $grupo->turno->nombre ?? '—',
                    'materias'       => $materiasFaltantes->values()->map(function ($m) {
                        return ['id' => $m->id, 'nombre' => $m->nombre];
                    }),
                ];
            }
        }

        return response()->json([
            'success' => true,
            'data'    => $resultado,
            'message' => 'Grupos sin docente listados correctamente.',
        ], 200);
    }

    private function validarCruces($grupoId, $docenteId, $aulaId, $diaSemana, $horaInicio, $horaFin)
    {
        $errores = [];

        $baseQuery = HorarioBloque::where('dia_semana', $diaSemana)
            ->where(function ($q) use ($horaInicio, $horaFin) {
                $q->where('hora_inicio', '<', $horaFin)
                  ->where('hora_fin', '>', $horaInicio);
            });

        if ((clone $baseQuery)->where('docente_id', $docenteId)->exists()) {
            $errores[] = 'El docente ya tiene clase en ese día y horario.';
        }
        if ((clone $baseQuery)->where('aula_id', $aulaId)->exists()) {
            $errores[] = 'El aula ya está ocupada en ese día y horario.';
        }
        if ((clone $baseQuery)->where('grupo_id', $grupoId)->exists()) {
            $errores[] = 'El grupo ya tiene otra materia en ese día y horario.';
        }

        return $errores;
    }
}
