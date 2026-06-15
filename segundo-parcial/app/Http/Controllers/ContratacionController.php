<?php

namespace App\Http\Controllers;

use App\Models\PostulanteDocente;
use App\Models\Docente;
use App\Models\Gestion;
use App\Models\Bitacora;
use App\Models\Horario;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class ContratacionController extends Controller
{
    public function index(Request $request)
    {
        $gestion = Gestion::where('estado', 'activo')->first();
        if (!$gestion) {
            return response()->json(['success' => false, 'data' => [], 'message' => 'No hay una gestión activa'], 422);
        }

        $query = PostulanteDocente::with('docente')
            ->where('gestion_id', $gestion->id);

        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }
        if ($request->filled('titulo_academico')) {
            $query->where('titulo_academico', $request->titulo_academico);
        }
        if ($request->filled('especialidad')) {
            $query->where('especialidad', 'LIKE', '%' . $request->especialidad . '%');
        }
        if ($request->filled('materia_preferida')) {
            $query->where('materia_preferida', 'LIKE', '%' . $request->materia_preferida . '%');
        }

        $postulantes = $query->orderBy('created_at', 'desc')->get();

        $postulantes->each(function ($p) {
            if ($p->docente) {
                $horasAsignadas = Horario::where('docente_id', $p->docente->id)
                    ->select(DB::raw("SUM(EXTRACT(EPOCH FROM (hora_fin - hora_inicio)) / 3600) as total_hours"))
                    ->first();
                $p->docente->horas_asignadas = (float) ($horasAsignadas->total_hours ?? 0);
                $p->docente->horas_disponibles = max(0, ($p->carga_horaria_maxima ?? 0) - $p->docente->horas_asignadas);
            }
        });

        return response()->json([
            'success' => true,
            'data' => $postulantes,
            'message' => 'Listado de postulantes docentes'
        ], 200);
    }

    public function show($id)
    {
        $postulante = PostulanteDocente::with(['docente', 'documentos', 'gestion'])
            ->find($id);

        if (!$postulante) {
            return response()->json(['success' => false, 'message' => 'Postulante docente no encontrado'], 404);
        }

        if ($postulante->docente) {
            $horasAsignadas = Horario::where('docente_id', $postulante->docente->id)
                ->select(DB::raw("SUM(EXTRACT(EPOCH FROM (hora_fin - hora_inicio)) / 3600) as total_hours"))
                ->first();
            $postulante->docente->horas_asignadas = (float) ($horasAsignadas->total_hours ?? 0);
            $postulante->docente->horas_disponibles = max(0, ($postulante->carga_horaria_maxima ?? 0) - $postulante->docente->horas_asignadas);
        }

        return response()->json([
            'success' => true,
            'data' => $postulante,
            'message' => 'Detalle del postulante docente'
        ], 200);
    }

    public function contratar($id)
    {
        $postulante = PostulanteDocente::find($id);
        if (!$postulante) {
            return response()->json(['success' => false, 'message' => 'Postulante docente no encontrado'], 404);
        }

        if ($postulante->estado !== 'postulante') {
            return response()->json(['success' => false, 'message' => 'El postulante ya fue procesado'], 422);
        }

        if (!$postulante->titulo_academico || trim($postulante->titulo_academico) === '') {
            return response()->json(['success' => false, 'message' => 'El postulante debe tener un título académico registrado para ser contratado'], 422);
        }

        $gestion = Gestion::where('estado', 'activo')->first();
        if (!$gestion) {
            return response()->json(['success' => false, 'message' => 'No hay una gestión activa'], 422);
        }

        DB::beginTransaction();
        try {
            $postulante->update(['estado' => 'contratado']);

            $docente = Docente::create([
                'postulante_docente_id' => $postulante->id,
                'fecha_contratacion'    => now()->toDateString(),
                'estado'                => 'activo',
                'gestion_id'            => $gestion->id,
            ]);

            Bitacora::registrar(
                'Contratación de docente',
                "CI: {$postulante->ci}, Nombre: {$postulante->nombres} {$postulante->apellidos}, Título: {$postulante->titulo_academico}",
                'docentes',
                $docente->id
            );

            DB::commit();

            $docente->load('postulanteDocente');

            return response()->json([
                'success' => true,
                'data' => $docente,
                'message' => 'Docente contratado correctamente'
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'Error al contratar: ' . $e->getMessage()], 500);
        }
    }

    public function rechazar(Request $request, $id)
    {
        $postulante = PostulanteDocente::find($id);
        if (!$postulante) {
            return response()->json(['success' => false, 'message' => 'Postulante docente no encontrado'], 404);
        }

        if ($postulante->estado !== 'postulante') {
            return response()->json(['success' => false, 'message' => 'El postulante ya fue procesado'], 422);
        }

        $postulante->update(['estado' => 'rechazado']);

        Bitacora::registrar(
            'Rechazo de postulante docente',
            "CI: {$postulante->ci}, Nombre: {$postulante->nombres} {$postulante->apellidos}" . ($request->motivo ? " Motivo: {$request->motivo}" : ''),
            'postulantes_docentes',
            $postulante->id
        );

        return response()->json([
            'success' => true,
            'data' => $postulante,
            'message' => 'Postulante docente rechazado'
        ], 200);
    }

    public function revertir($id)
    {
        $postulante = PostulanteDocente::find($id);
        if (!$postulante) {
            return response()->json(['success' => false, 'message' => 'Postulante docente no encontrado'], 404);
        }

        if ($postulante->estado !== 'contratado') {
            return response()->json(['success' => false, 'message' => 'Solo se puede revertir un postulante contratado'], 422);
        }

        $docente = Docente::where('postulante_docente_id', $id)->first();
        if ($docente) {
            $tieneHorarios = Horario::where('docente_id', $docente->id)->exists();
            if ($tieneHorarios) {
                return response()->json(['success' => false, 'message' => 'No se puede revertir la contratación porque el docente tiene horarios asignados'], 422);
            }
        }

        DB::beginTransaction();
        try {
            if ($docente) {
                $docente->delete();
            }

            $postulante->update(['estado' => 'postulante']);

            Bitacora::registrar(
                'Reversión de contratación',
                "CI: {$postulante->ci}, Nombre: {$postulante->nombres} {$postulante->apellidos}",
                'postulantes_docentes',
                $postulante->id
            );

            DB::commit();

            return response()->json([
                'success' => true,
                'data' => $postulante,
                'message' => 'Contratación revertida correctamente'
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'Error al revertir: ' . $e->getMessage()], 500);
        }
    }
}
