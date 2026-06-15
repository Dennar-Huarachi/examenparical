<?php

namespace App\Http\Controllers;

use App\Models\Horario;
use App\Models\Gestion;
use App\Models\Bitacora;
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

    public function index(Request $request)
    {
        $gestion = $this->obtenerGestionActiva();
        if (!$gestion) {
            return response()->json([
                'success' => false,
                'message' => 'No hay una gestión activa en el sistema.',
            ], 422);
        }

        $query = Horario::with(['grupo', 'materia', 'docente', 'aula'])
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

        $horarios = $query->orderBy('dia_semana')->orderBy('hora_inicio')->get();

        return response()->json([
            'success' => true,
            'data'    => $horarios,
            'message' => 'Horarios listados correctamente.',
        ], 200);
    }

    private function validarCruces($grupoId, $docenteId, $aulaId, $diaSemana, $horaInicio, $horaFin, $excluirId = null)
    {
        $errores = [];

        $queryDocente = Horario::where('docente_id', $docenteId)
            ->where('dia_semana', $diaSemana)
            ->where(function ($q) use ($horaInicio, $horaFin) {
                $q->where('hora_inicio', '<', $horaFin)
                  ->where('hora_fin', '>', $horaInicio);
            });

        $queryAula = Horario::where('aula_id', $aulaId)
            ->where('dia_semana', $diaSemana)
            ->where(function ($q) use ($horaInicio, $horaFin) {
                $q->where('hora_inicio', '<', $horaFin)
                  ->where('hora_fin', '>', $horaInicio);
            });

        $queryGrupo = Horario::where('grupo_id', $grupoId)
            ->where('dia_semana', $diaSemana)
            ->where(function ($q) use ($horaInicio, $horaFin) {
                $q->where('hora_inicio', '<', $horaFin)
                  ->where('hora_fin', '>', $horaInicio);
            });

        if ($excluirId) {
            $queryDocente->where('id', '!=', $excluirId);
            $queryAula->where('id', '!=', $excluirId);
            $queryGrupo->where('id', '!=', $excluirId);
        }

        if ($queryDocente->exists()) {
            $errores[] = 'El docente ya tiene clase asignada en ese día y horario.';
        }

        if ($queryAula->exists()) {
            $errores[] = 'El aula ya está ocupada en ese día y horario.';
        }

        if ($queryGrupo->exists()) {
            $errores[] = 'El grupo ya tiene otra materia asignada en ese día y horario.';
        }

        return $errores;
    }

    public function store(Request $request)
    {
        $gestion = $this->obtenerGestionActiva();
        if (!$gestion) {
            return response()->json([
                'success' => false,
                'message' => 'No hay una gestión activa en el sistema.',
            ], 422);
        }

        $validador = Validator::make($request->all(), [
            'grupo_id'    => 'required|integer|exists:grupos,id',
            'materia_id'  => 'required|integer|exists:materias,id',
            'docente_id'  => 'required|integer|exists:docentes,id',
            'aula_id'     => 'required|integer|exists:aulas,id',
            'dia_semana'  => 'required|string|in:Lunes,Martes,Miércoles,Jueves,Viernes,Sábado',
            'hora_inicio' => 'required|date_format:H:i',
            'hora_fin'    => 'required|date_format:H:i|after:hora_inicio',
        ], [
            'grupo_id.required'    => 'El grupo es obligatorio.',
            'grupo_id.exists'      => 'El grupo seleccionado no existe.',
            'materia_id.required'  => 'La materia es obligatoria.',
            'materia_id.exists'    => 'La materia seleccionada no existe.',
            'docente_id.required'  => 'El docente es obligatorio.',
            'docente_id.exists'    => 'El docente seleccionado no existe.',
            'aula_id.required'     => 'El aula es obligatoria.',
            'aula_id.exists'       => 'El aula seleccionada no existe.',
            'dia_semana.required'  => 'El día de la semana es obligatorio.',
            'dia_semana.in'        => 'El día de la semana no es válido.',
            'hora_inicio.required' => 'La hora de inicio es obligatoria.',
            'hora_fin.required'    => 'La hora de fin es obligatoria.',
            'hora_fin.after'       => 'La hora de fin debe ser posterior a la hora de inicio.',
        ]);

        if ($validador->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validador->errors()->first(),
            ], 422);
        }

        $docente = \App\Models\Docente::with('postulanteDocente')->find($request->docente_id);
        if ($docente && $docente->postulanteDocente) {
            $horasExistentes = Horario::where('docente_id', $request->docente_id)
                ->select(DB::raw("SUM(EXTRACT(EPOCH FROM (hora_fin - hora_inicio)) / 3600) as total"))
                ->first();
            $horasActuales = (float) ($horasExistentes->total ?? 0);
            $nuevaHoras = (strtotime($request->hora_fin) - strtotime($request->hora_inicio)) / 3600;
            $cargaMaxima = (int) ($docente->postulanteDocente->carga_horaria_maxima ?? 0);

            if ($cargaMaxima > 0 && ($horasActuales + $nuevaHoras) > $cargaMaxima) {
                return response()->json([
                    'success' => false,
                    'message' => "El docente superaría su carga horaria máxima de {$cargaMaxima} hrs/sem (actual: {$horasActuales} hrs, nueva: {$nuevaHoras} hrs).",
                ], 422);
            }
        }

        $errores = $this->validarCruces(
            $request->grupo_id,
            $request->docente_id,
            $request->aula_id,
            $request->dia_semana,
            $request->hora_inicio,
            $request->hora_fin
        );

        if (!empty($errores)) {
            return response()->json([
                'success' => false,
                'message' => implode(' ', $errores),
                'errores' => $errores,
            ], 422);
        }

        $horario = Horario::create([
            'grupo_id'    => $request->grupo_id,
            'materia_id'  => $request->materia_id,
            'docente_id'  => $request->docente_id,
            'aula_id'     => $request->aula_id,
            'dia_semana'  => $request->dia_semana,
            'hora_inicio' => $request->hora_inicio,
            'hora_fin'    => $request->hora_fin,
            'gestion_id'  => $gestion->id,
        ]);

        Bitacora::registrar(
            'Creación de horario',
            "Grupo ID: {$horario->grupo_id}, Día: {$horario->dia_semana}, {$horario->hora_inicio}-{$horario->hora_fin}",
            'horarios',
            $horario->id
        );

        $horario->load(['grupo', 'materia', 'docente.postulanteDocente', 'aula']);

        return response()->json([
            'success' => true,
            'data'    => $horario,
            'message' => 'Horario creado correctamente.',
        ], 200);
    }

    public function update(Request $request, $id)
    {
        $horario = Horario::find($id);
        if (!$horario) {
            return response()->json([
                'success' => false,
                'message' => 'Horario no encontrado.',
            ], 404);
        }

        $validador = Validator::make($request->all(), [
            'grupo_id'    => 'required|integer|exists:grupos,id',
            'materia_id'  => 'required|integer|exists:materias,id',
            'docente_id'  => 'required|integer|exists:docentes,id',
            'aula_id'     => 'required|integer|exists:aulas,id',
            'dia_semana'  => 'required|string|in:Lunes,Martes,Miércoles,Jueves,Viernes,Sábado',
            'hora_inicio' => 'required|date_format:H:i',
            'hora_fin'    => 'required|date_format:H:i|after:hora_inicio',
        ], [
            'grupo_id.required'    => 'El grupo es obligatorio.',
            'materia_id.required'  => 'La materia es obligatoria.',
            'docente_id.required'  => 'El docente es obligatorio.',
            'aula_id.required'     => 'El aula es obligatoria.',
            'dia_semana.required'  => 'El día de la semana es obligatorio.',
            'dia_semana.in'        => 'El día de la semana no es válido.',
            'hora_inicio.required' => 'La hora de inicio es obligatoria.',
            'hora_fin.required'    => 'La hora de fin es obligatoria.',
            'hora_fin.after'       => 'La hora de fin debe ser posterior a la hora de inicio.',
        ]);

        if ($validador->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validador->errors()->first(),
            ], 422);
        }

        $errores = $this->validarCruces(
            $request->grupo_id,
            $request->docente_id,
            $request->aula_id,
            $request->dia_semana,
            $request->hora_inicio,
            $request->hora_fin,
            $id
        );

        if (!empty($errores)) {
            return response()->json([
                'success' => false,
                'message' => implode(' ', $errores),
                'errores' => $errores,
            ], 422);
        }

        $horario->update([
            'grupo_id'    => $request->grupo_id,
            'materia_id'  => $request->materia_id,
            'docente_id'  => $request->docente_id,
            'aula_id'     => $request->aula_id,
            'dia_semana'  => $request->dia_semana,
            'hora_inicio' => $request->hora_inicio,
            'hora_fin'    => $request->hora_fin,
        ]);

        Bitacora::registrar(
            'Modificación de horario',
            "Grupo ID: {$horario->grupo_id}, Día: {$horario->dia_semana}, {$horario->hora_inicio}-{$horario->hora_fin}",
            'horarios',
            $horario->id
        );

        $horario->load(['grupo', 'materia', 'docente', 'aula']);

        return response()->json([
            'success' => true,
            'data'    => $horario->fresh()->load(['grupo', 'materia', 'docente', 'aula']),
            'message' => 'Horario actualizado correctamente.',
        ], 200);
    }

    public function destroy($id)
    {
        $horario = Horario::find($id);
        if (!$horario) {
            return response()->json([
                'success' => false,
                'message' => 'Horario no encontrado.',
            ], 404);
        }

        $horario->delete();

        Bitacora::registrar(
            'Eliminación de horario',
            "Grupo ID: {$horario->grupo_id}, Día: {$horario->dia_semana}, {$horario->hora_inicio}-{$horario->hora_fin}",
            'horarios',
            $id
        );

        return response()->json([
            'success' => true,
            'data'    => null,
            'message' => 'Horario eliminado correctamente.',
        ], 200);
    }

    // ================================================================
    // CU24: Horarios de un grupo específico
    // ================================================================

    public function horariosDeGrupo($grupoId)
    {
        $gestion = $this->obtenerGestionActiva();
        if (!$gestion) {
            return response()->json(['success' => false, 'message' => 'No hay una gestión activa.'], 422);
        }

        $horarios = Horario::with(['materia', 'docente.postulanteDocente', 'aula', 'grupo'])
            ->where('gestion_id', $gestion->id)
            ->where('grupo_id', $grupoId)
            ->orderBy('dia_semana')
            ->orderBy('hora_inicio')
            ->get();

        $agrupados = $horarios->groupBy('materia_id')->map(function ($items, $materiaId) {
            $materia = $items->first()->materia;
            return [
                'materia_id'   => (int) $materiaId,
                'materia'      => $materia ? $materia->nombre : '—',
                'horarios'     => $items->map(function ($h) {
                    return [
                        'id'          => $h->id,
                        'dia_semana'  => $h->dia_semana,
                        'hora_inicio' => $h->hora_inicio,
                        'hora_fin'    => $h->hora_fin,
                        'docente'     => $h->docente ? [
                            'id'      => $h->docente->id,
                            'nombre'  => ($h->docente->postulanteDocente->nombres ?? '') . ' ' . ($h->docente->postulanteDocente->apellidos ?? ''),
                        ] : null,
                        'aula'        => $h->aula ? [
                            'id'      => $h->aula->id,
                            'label'   => $h->aula->edificio . ' - ' . $h->aula->numero,
                        ] : null,
                    ];
                }),
            ];
        })->values();

        return response()->json([
            'success' => true,
            'data'    => [
                'horarios'       => $horarios,
                'agrupados'      => $agrupados,
                'total_horarios' => $horarios->count(),
            ],
            'message' => 'Horarios del grupo listados correctamente.',
        ], 200);
    }
}
