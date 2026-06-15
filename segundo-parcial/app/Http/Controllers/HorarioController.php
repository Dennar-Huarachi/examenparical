<?php

namespace App\Http\Controllers;

use App\Models\HorarioBloque;
use App\Models\Turno;
use App\Models\Gestion;
use App\Models\Docente;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class HorarioController extends Controller
{
    private function obtenerGestionActiva()
    {
        $gestion = Gestion::where('estado', 'activo')->first();
        if (!$gestion) {
            return null;
        }
        return $gestion;
    }

    private function obtenerBloquesPorTurno()
    {
        return [
            'Mañana' => [
                ['nro' => 1,  'inicio' => '07:00', 'fin' => '07:45'],
                ['nro' => 2,  'inicio' => '07:45', 'fin' => '08:30'],
                ['nro' => 3,  'inicio' => '08:30', 'fin' => '09:15'],
                ['nro' => 4,  'inicio' => '09:15', 'fin' => '10:00'],
                ['nro' => 5,  'inicio' => '10:00', 'fin' => '10:45'],
                ['nro' => 6,  'inicio' => '10:45', 'fin' => '11:30'],
                ['nro' => 7,  'inicio' => '11:30', 'fin' => '12:15'],
            ],
            'Tarde' => [
                ['nro' => 1,  'inicio' => '14:00', 'fin' => '14:45'],
                ['nro' => 2,  'inicio' => '14:45', 'fin' => '15:30'],
                ['nro' => 3,  'inicio' => '15:30', 'fin' => '16:15'],
                ['nro' => 4,  'inicio' => '16:15', 'fin' => '17:00'],
                ['nro' => 5,  'inicio' => '17:00', 'fin' => '17:45'],
                ['nro' => 6,  'inicio' => '17:45', 'fin' => '18:30'],
            ],
            'Noche' => [
                ['nro' => 1,  'inicio' => '19:00', 'fin' => '19:45'],
                ['nro' => 2,  'inicio' => '19:45', 'fin' => '20:30'],
                ['nro' => 3,  'inicio' => '20:30', 'fin' => '21:15'],
                ['nro' => 4,  'inicio' => '21:15', 'fin' => '22:00'],
                ['nro' => 5,  'inicio' => '22:00', 'fin' => '22:45'],
                ['nro' => 6,  'inicio' => '22:45', 'fin' => '23:30'],
            ],
        ];
    }

    private function calcularHorasBloque($turnoNombre, $bloqueInicio, $bloqueFin)
    {
        $bloques = $this->obtenerBloquesPorTurno()[$turnoNombre] ?? null;
        if (!$bloques) {
            return null;
        }
        $inicio = collect($bloques)->firstWhere('nro', $bloqueInicio);
        $fin = collect($bloques)->firstWhere('nro', $bloqueFin);
        if (!$inicio || !$fin) {
            return null;
        }
        return [
            'hora_inicio' => $inicio['inicio'],
            'hora_fin'    => $fin['fin'],
        ];
    }

    public function index(Request $request)
    {
        $gestion = $this->obtenerGestionActiva();
        if (!$gestion) {
            return response()->json([
                'success' => false,
                'message' => 'No hay una gestión activa en el sistema.',
            ], 422);
        }

        $query = HorarioBloque::with(['grupo.turno', 'materia', 'docente.postulanteDocente', 'aula', 'turno'])
            ->where('gestion_id', $gestion->id);

        if ($request->filled('grupo_id')) {
            $query->where('grupo_id', $request->grupo_id);
        }
        if ($request->filled('docente_id')) {
            $query->where('docente_id', $request->docente_id);
        }
        if ($request->filled('aula_id')) {
            $query->where('aula_id', $request->aula_id);
        }
        if ($request->filled('dia_semana')) {
            $query->where('dia_semana', $request->dia_semana);
        }

        $bloques = $query->orderBy('dia_semana')->orderBy('hora_inicio')->get();

        $agrupados = $bloques->groupBy(function ($b) {
            return $b->grupo_id . '-' . $b->materia_id . '-' . $b->docente_id . '-' . $b->aula_id;
        })->map(function ($items, $key) {
            $first = $items->first();
            return [
                'grupo' => [
                    'id'     => $first->grupo->id,
                    'nombre' => $first->grupo->nombre,
                ],
                'materia' => [
                    'id'     => $first->materia->id,
                    'nombre' => $first->materia->nombre,
                ],
                'docente' => [
                    'id'     => $first->docente->id,
                    'nombre' => $first->docente->postulanteDocente
                        ? trim($first->docente->postulanteDocente->nombres . ' ' . $first->docente->postulanteDocente->apellidos)
                        : '—',
                ],
                'aula' => [
                    'id'    => $first->aula->id,
                    'label' => $first->aula->edificio . ' - ' . $first->aula->numero,
                ],
                'turno' => [
                    'id'     => $first->turno->id,
                    'nombre' => $first->turno->nombre,
                ],
                'bloques' => $items->map(function ($b) {
                    return [
                        'id'            => $b->id,
                        'dia_semana'    => $b->dia_semana,
                        'bloque_inicio' => $b->bloque_inicio,
                        'bloque_fin'    => $b->bloque_fin,
                        'hora_inicio'   => $b->hora_inicio,
                        'hora_fin'      => $b->hora_fin,
                    ];
                })->values(),
            ];
        })->values();

        return response()->json([
            'success' => true,
            'data'    => [
                'agrupados' => $agrupados,
                'bloques'   => $bloques,
            ],
            'message' => 'Horarios listados correctamente.',
        ], 200);
    }

    private function validarCruces($grupoId, $docenteId, $aulaId, $diaSemana, $horaInicio, $horaFin, $excluirId = null)
    {
        $errores = [];

        $baseQuery = HorarioBloque::where('dia_semana', $diaSemana)
            ->where(function ($q) use ($horaInicio, $horaFin) {
                $q->where('hora_inicio', '<', $horaFin)
                  ->where('hora_fin', '>', $horaInicio);
            });

        $docQuery = (clone $baseQuery)->where('docente_id', $docenteId);
        $aulaQuery = (clone $baseQuery)->where('aula_id', $aulaId);
        $grupoQuery = (clone $baseQuery)->where('grupo_id', $grupoId);

        if ($excluirId) {
            $docQuery->where('id', '!=', $excluirId);
            $aulaQuery->where('id', '!=', $excluirId);
            $grupoQuery->where('id', '!=', $excluirId);
        }

        if ($docQuery->exists()) {
            $errores[] = 'El docente ya tiene clase en ese día y horario.';
        }
        if ($aulaQuery->exists()) {
            $errores[] = 'El aula ya está ocupada en ese día y horario.';
        }
        if ($grupoQuery->exists()) {
            $errores[] = 'El grupo ya tiene otra materia en ese día y horario.';
        }

        return $errores;
    }

    public function store(Request $request)
    {
        $gestion = $this->obtenerGestionActiva();
        if (!$gestion) {
            return response()->json(['success' => false, 'message' => 'No hay una gestión activa.'], 422);
        }

        $validador = Validator::make($request->all(), [
            'grupo_id'      => 'required|integer|exists:grupos,id',
            'materia_id'    => 'required|integer|exists:materias,id',
            'docente_id'    => 'required|integer|exists:docentes,id',
            'aula_id'       => 'required|integer|exists:aulas,id',
            'turno_id'      => 'required|integer|exists:turnos,id',
            'bloque_inicio' => 'required|integer|min:1',
            'bloque_fin'    => 'required|integer|min:1|gte:bloque_inicio',
            'dias'          => 'required|array|min:1',
            'dias.*'        => 'required|string|in:Lunes,Martes,Miércoles,Jueves,Viernes,Sábado',
        ], [
            'grupo_id.required'      => 'El grupo es obligatorio.',
            'materia_id.required'    => 'La materia es obligatoria.',
            'docente_id.required'    => 'El docente es obligatorio.',
            'aula_id.required'       => 'El aula es obligatoria.',
            'turno_id.required'      => 'El turno es obligatorio.',
            'bloque_inicio.required' => 'El bloque de inicio es obligatorio.',
            'bloque_fin.required'    => 'El bloque de fin es obligatorio.',
            'bloque_fin.gte'         => 'El bloque de fin debe ser mayor o igual al de inicio.',
            'dias.required'          => 'Debe seleccionar al menos un día.',
            'dias.min'               => 'Debe seleccionar al menos un día.',
        ]);

        if ($validador->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validador->errors()->first(),
            ], 422);
        }

        $turno = Turno::find($request->turno_id);
        if (!$turno) {
            return response()->json(['success' => false, 'message' => 'Turno no encontrado.'], 404);
        }

        $horasBloque = $this->calcularHorasBloque($turno->nombre, $request->bloque_inicio, $request->bloque_fin);
        if (!$horasBloque) {
            return response()->json([
                'success' => false,
                'message' => 'Los números de bloque no son válidos para el turno seleccionado.',
            ], 422);
        }

        $docente = Docente::with('postulanteDocente')->find($request->docente_id);
        if ($docente && $docente->postulanteDocente) {
            $duracionHoras = (strtotime($horasBloque['hora_fin']) - strtotime($horasBloque['hora_inicio'])) / 3600;
            $totalNuevas = $duracionHoras * count($request->dias);

            $horasExistentes = HorarioBloque::where('docente_id', $request->docente_id)
                ->select(DB::raw("COALESCE(SUM(EXTRACT(EPOCH FROM (hora_fin - hora_inicio)) / 3600), 0) as total"))
                ->first();
            $horasActuales = (float) ($horasExistentes->total ?? 0);
            $cargaMaxima = (int) ($docente->postulanteDocente->carga_horaria_maxima ?? 0);

            if ($cargaMaxima > 0 && ($horasActuales + $totalNuevas) > $cargaMaxima) {
                return response()->json([
                    'success' => false,
                    'message' => "El docente superaría su carga horaria máxima de {$cargaMaxima} hrs/sem "
                        . "(actual: {$horasActuales} hrs, nueva: {$totalNuevas} hrs en {$horasActuales} días).",
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
            $bloque = HorarioBloque::create([
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
            $creados[] = $bloque;
        }

        \App\Helpers\BitacoraHelper::registrar(
            'Creación de horario',
            'horario_bloques',
            $creados[0]->id,
            'Grupo ID: ' . $request->grupo_id . ', Materia ID: ' . $request->materia_id
                . ', Días: ' . implode(', ', $request->dias)
                . ', Bloques: ' . $request->bloque_inicio . '-' . $request->bloque_fin
        );

        return response()->json([
            'success' => true,
            'data'    => $creados,
            'message' => 'Horario creado correctamente en ' . count($creados) . ' día(s).',
        ], 200);
    }

    public function destroy($id, Request $request)
    {
        $modo = $request->input('modo', 'bloque');

        if ($modo === 'todos') {
            $grupoId = $request->input('grupo_id');
            $materiaId = $request->input('materia_id');
            if (!$grupoId || !$materiaId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Para eliminar todos los bloques, debe enviar grupo_id y materia_id.',
                ], 422);
            }
            $eliminados = HorarioBloque::where('grupo_id', $grupoId)
                ->where('materia_id', $materiaId)
                ->delete();

            \App\Helpers\BitacoraHelper::registrar(
                'Eliminación masiva de horarios',
                'horario_bloques',
                null,
                'Grupo ID: ' . $grupoId . ', Materia ID: ' . $materiaId . ', Bloques eliminados: ' . $eliminados
            );

            return response()->json([
                'success' => true,
                'data'    => null,
                'message' => "Se eliminaron {$eliminados} bloque(s) de horario.",
            ], 200);
        }

        $bloque = HorarioBloque::find($id);
        if (!$bloque) {
            return response()->json(['success' => false, 'message' => 'Bloque de horario no encontrado.'], 404);
        }

        $bloque->delete();

        \App\Helpers\BitacoraHelper::registrar(
            'Eliminación de horario',
            'horario_bloques',
            $id,
            'Grupo ID: ' . $bloque->grupo_id . ', Día: ' . $bloque->dia_semana
                . ', ' . $bloque->hora_inicio . '-' . $bloque->hora_fin
        );

        return response()->json([
            'success' => true,
            'data'    => null,
            'message' => 'Bloque de horario eliminado correctamente.',
        ], 200);
    }

    public function verificarDisponibilidad(Request $request)
    {
        $validador = Validator::make($request->all(), [
            'grupo_id'      => 'required|integer|exists:grupos,id',
            'docente_id'    => 'required|integer|exists:docentes,id',
            'aula_id'       => 'required|integer|exists:aulas,id',
            'turno_id'      => 'required|integer|exists:turnos,id',
            'bloque_inicio' => 'required|integer|min:1',
            'bloque_fin'    => 'required|integer|min:1|gte:bloque_inicio',
            'dias'          => 'required|array|min:1',
            'dias.*'        => 'required|string|in:Lunes,Martes,Miércoles,Jueves,Viernes,Sábado',
        ]);

        if ($validador->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validador->errors()->first(),
            ], 422);
        }

        $turno = Turno::find($request->turno_id);
        $horasBloque = $this->calcularHorasBloque($turno?->nombre, $request->bloque_inicio, $request->bloque_fin);

        if (!$horasBloque) {
            return response()->json([
                'success' => false,
                'message' => 'Números de bloque inválidos para el turno.',
            ], 422);
        }

        $disponibilidad = [];
        $totalLibre = 0;

        foreach ($request->dias as $dia) {
            $cruces = $this->validarCruces(
                $request->grupo_id,
                $request->docente_id,
                $request->aula_id,
                $dia,
                $horasBloque['hora_inicio'],
                $horasBloque['hora_fin']
            );
            $disponible = empty($cruces);
            if ($disponible) {
                $totalLibre++;
            }
            $disponibilidad[] = [
                'dia'         => $dia,
                'disponible'  => $disponible,
                'errores'     => $cruces,
            ];
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'disponibilidad' => $disponibilidad,
                'total_libre'    => $totalLibre,
                'total_dias'     => count($request->dias),
                'todo_libre'     => $totalLibre === count($request->dias),
            ],
        ], 200);
    }

    public function horariosDeGrupo($grupoId)
    {
        $gestion = $this->obtenerGestionActiva();
        if (!$gestion) {
            return response()->json(['success' => false, 'message' => 'No hay una gestión activa.'], 422);
        }

        $bloques = HorarioBloque::with(['materia', 'docente.postulanteDocente', 'aula', 'grupo', 'turno'])
            ->where('gestion_id', $gestion->id)
            ->where('grupo_id', $grupoId)
            ->orderBy('dia_semana')
            ->orderBy('hora_inicio')
            ->get();

        $agrupados = $bloques->groupBy('materia_id')->map(function ($items, $materiaId) {
            $materia = $items->first()->materia;
            return [
                'materia_id' => (int) $materiaId,
                'materia'    => $materia ? $materia->nombre : '—',
                'horarios'   => $items->map(function ($h) {
                    return [
                        'id'            => $h->id,
                        'dia_semana'    => $h->dia_semana,
                        'bloque_inicio' => $h->bloque_inicio,
                        'bloque_fin'    => $h->bloque_fin,
                        'hora_inicio'   => $h->hora_inicio,
                        'hora_fin'      => $h->hora_fin,
                        'docente'       => $h->docente ? [
                            'id'     => $h->docente->id,
                            'nombre' => ($h->docente->postulanteDocente->nombres ?? '') . ' ' . ($h->docente->postulanteDocente->apellidos ?? ''),
                        ] : null,
                        'aula'  => $h->aula ? [
                            'id'    => $h->aula->id,
                            'label' => $h->aula->edificio . ' - ' . $h->aula->numero,
                        ] : null,
                    ];
                }),
            ];
        })->values();

        return response()->json([
            'success' => true,
            'data'    => [
                'bloques'       => $bloques,
                'agrupados'     => $agrupados,
                'total_bloques' => $bloques->count(),
            ],
            'message' => 'Horarios del grupo listados correctamente.',
        ], 200);
    }
}
