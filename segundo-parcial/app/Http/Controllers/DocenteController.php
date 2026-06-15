<?php

namespace App\Http\Controllers;

use App\Models\Docente;
use App\Models\DocenteDisponibilidad;
use App\Models\PostulanteDocente;
use App\Models\Gestion;
use App\Models\HorarioBloque;
use App\Models\Bitacora;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class DocenteController extends Controller
{
    public function index(Request $request)
    {
        $gestion = Gestion::where('estado', 'activo')->first();
        if (!$gestion) {
            return response()->json(['success' => false, 'data' => [], 'message' => 'No hay una gestión activa'], 422);
        }

        $query = Docente::with('postulanteDocente')
            ->where('gestion_id', $gestion->id)
            ->where('estado', 'activo');

        if ($request->filled('especialidad')) {
            $query->whereHas('postulanteDocente', function ($q) use ($request) {
                $q->where('especialidad', 'LIKE', '%' . $request->especialidad . '%');
            });
        }
        if ($request->filled('materia_preferida')) {
            $query->whereHas('postulanteDocente', function ($q) use ($request) {
                $q->where('materia_preferida', 'LIKE', '%' . $request->materia_preferida . '%');
            });
        }
        if ($request->filled('disponibilidad_horaria')) {
            $query->whereHas('postulanteDocente', function ($q) use ($request) {
                $q->where('disponibilidad_horaria', $request->disponibilidad_horaria);
            });
        }

        $docentes = $query->orderBy('id')->get();

        $docentes->each(function ($docente) {
            $pd = $docente->postulanteDocente;
            $horasAsignadas = HorarioBloque::where('docente_id', $docente->id)
                ->select(DB::raw("COALESCE(SUM(EXTRACT(EPOCH FROM (hora_fin - hora_inicio)) / 3600), 0) as total_hours"))
                ->first();
            $docente->horas_asignadas = (float) ($horasAsignadas->total_hours ?? 0);
            $docente->carga_horaria_maxima = $pd ? (int) ($pd->carga_horaria_maxima ?? 0) : 0;
            $docente->horas_disponibles = max(0, $docente->carga_horaria_maxima - $docente->horas_asignadas);
        });

        return response()->json([
            'success' => true,
            'data' => $docentes,
            'message' => 'Docentes listados correctamente'
        ], 200);
    }

    public function show($id)
    {
        $docente = Docente::with('postulanteDocente')->find($id);
        if (!$docente) {
            return response()->json(['success' => false, 'message' => 'Docente no encontrado'], 404);
        }

        $horarios = HorarioBloque::with(['grupo', 'materia', 'aula', 'turno'])
            ->where('docente_id', $id)
            ->orderBy('dia_semana')
            ->orderBy('hora_inicio')
            ->get();

        $horasAsignadas = HorarioBloque::where('docente_id', $id)
            ->select(DB::raw("COALESCE(SUM(EXTRACT(EPOCH FROM (hora_fin - hora_inicio)) / 3600), 0) as total_hours"))
            ->first();

        $totalHoras = (float) ($horasAsignadas->total_hours ?? 0);
        $cargaMaxima = (int) ($docente->postulanteDocente->carga_horaria_maxima ?? 0);

        $horariosPorDia = $horarios->groupBy('dia_semana');

        return response()->json([
            'success' => true,
            'data' => [
                'docente' => $docente,
                'horarios' => $horarios,
                'horarios_por_dia' => $horariosPorDia,
                'total_horas_semanales' => $totalHoras,
                'carga_horaria_maxima' => $cargaMaxima,
                'horas_disponibles' => max(0, $cargaMaxima - $totalHoras),
            ],
            'message' => 'Detalle del docente'
        ], 200);
    }

    public function asignarCarga(Request $request, $id)
    {
        $validador = Validator::make($request->all(), [
            'carga_horaria_maxima' => 'required|integer|min:1|max:40',
        ]);

        if ($validador->fails()) {
            return response()->json(['success' => false, 'message' => $validador->errors()->first()], 422);
        }

        $docente = Docente::find($id);
        if (!$docente) {
            return response()->json(['success' => false, 'message' => 'Docente no encontrado'], 404);
        }

        $postulante = PostulanteDocente::find($docente->postulante_docente_id);
        if (!$postulante) {
            return response()->json(['success' => false, 'message' => 'Postulante docente no encontrado'], 404);
        }

        $horasAsignadas = HorarioBloque::where('docente_id', $id)
            ->select(DB::raw("COALESCE(SUM(EXTRACT(EPOCH FROM (hora_fin - hora_inicio)) / 3600), 0) as total_hours"))
            ->first();
        $horasActuales = (float) ($horasAsignadas->total_hours ?? 0);

        if ($request->carga_horaria_maxima < $horasActuales) {
            return response()->json([
                'success' => false,
                'message' => "La carga horaria máxima no puede ser menor a las horas ya asignadas en horarios ({$horasActuales} hrs)"
            ], 422);
        }

        $postulante->update(['carga_horaria_maxima' => $request->carga_horaria_maxima]);

        Bitacora::registrar(
            'Asignación de carga horaria',
            "Docente ID: {$id}, Nueva carga máxima: {$request->carga_horaria_maxima} hrs/sem",
            'postulantes_docentes',
            $postulante->id
        );

        return response()->json([
            'success' => true,
            'data' => [
                'postulante_docente' => $postulante->fresh(),
                'horas_asignadas_en_horarios' => $horasActuales,
            ],
            'message' => 'Carga horaria asignada correctamente'
        ], 200);
    }

    public function miCarga(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'No autenticado'], 401);
        }

        $postulante = PostulanteDocente::where('usuario_id', $user->id)->first();
        if (!$postulante) {
            return response()->json(['success' => false, 'message' => 'No tienes un perfil de docente asociado'], 404);
        }

        $docente = Docente::where('postulante_docente_id', $postulante->id)->first();
        if (!$docente) {
            return response()->json(['success' => false, 'message' => 'No tienes un registro de docente activo'], 404);
        }

        $horarios = HorarioBloque::with(['grupo', 'materia', 'aula', 'turno'])
            ->where('docente_id', $docente->id)
            ->orderBy('dia_semana')
            ->orderBy('hora_inicio')
            ->get();

        $horasAsignadas = HorarioBloque::where('docente_id', $docente->id)
            ->select(DB::raw("COALESCE(SUM(EXTRACT(EPOCH FROM (hora_fin - hora_inicio)) / 3600), 0) as total"))
            ->first();
        $totalHoras = (float) ($horasAsignadas->total ?? 0);
        $cargaMaxima = (int) ($postulante->carga_horaria_maxima ?? 0);

        $horariosPorDia = $horarios->groupBy('dia_semana');

        return response()->json([
            'success' => true,
            'data' => [
                'postulante' => $postulante,
                'docente' => $docente,
                'horarios' => $horarios,
                'horarios_por_dia' => $horariosPorDia,
                'total_horas_semanales' => $totalHoras,
                'carga_horaria_maxima' => $cargaMaxima,
                'horas_disponibles' => max(0, $cargaMaxima - $totalHoras),
            ],
            'message' => 'Mi carga horaria'
        ], 200);
    }
}
