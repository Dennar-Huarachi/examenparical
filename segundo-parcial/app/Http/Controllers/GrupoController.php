<?php

namespace App\Http\Controllers;

use App\Models\Grupo;
use App\Models\Turno;
use App\Models\Gestion;
use App\Models\Postulante;
use App\Models\Bitacora;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class GrupoController extends Controller
{
    private function obtenerGestionActiva()
    {
        $gestion = Gestion::where('estado', 'activo')->first();
        return $gestion;
    }

    // ================================================================
    // CU22: Calcular / Recalcular grupos
    // ================================================================

    public function calcular()
    {
        $gestion = $this->obtenerGestionActiva();
        if (!$gestion) {
            return response()->json(['success' => false, 'message' => 'No hay una gestión activa.'], 422);
        }

        $gruposExistentes = Grupo::where('gestion_id', $gestion->id)->where('estado', 'activo')->count();
        if ($gruposExistentes > 0) {
            return response()->json([
                'success' => false,
                'message' => "Ya existen {$gruposExistentes} grupos activos. Elimínelos antes de recalcular."
            ], 422);
        }

        $totalInscritos = Postulante::where('gestion_id', $gestion->id)
            ->where('estado', 'inscrito')
            ->count();

        if ($totalInscritos === 0) {
            return response()->json(['success' => false, 'message' => 'No hay postulantes inscritos en la gestión activa.'], 422);
        }

        $cantidadGrupos = (int) ceil($totalInscritos / 70);
        $turnos = Turno::orderBy('id')->get();

        if ($turnos->isEmpty()) {
            return response()->json(['success' => false, 'message' => 'No hay turnos registrados. Cargue turnos primero.'], 422);
        }

        $base = intdiv($cantidadGrupos, count($turnos));
        $resto = $cantidadGrupos % count($turnos);
        $gruposPorTurno = [];
        foreach ($turnos as $i => $turno) {
            $gruposPorTurno[$turno->id] = $base + ($i < $resto ? 1 : 0);
        }

        $contadores = [];
        foreach ($turnos as $turno) {
            $contadores[$turno->id] = 0;
        }

        $postulantes = Postulante::where('gestion_id', $gestion->id)
            ->where('estado', 'inscrito')
            ->get();

        $prefierenVirtual = $postulantes->filter(function ($p) {
            $otros = $p->otros ? json_decode($p->otros, true) : [];
            return ($otros['modalidad'] ?? 'presencial') === 'virtual';
        })->count();

        $modalidad = ($prefierenVirtual > $postulantes->count() / 2) ? 'virtual' : 'presencial';

        $letra = 0;
        $gruposCreados = [];

        foreach ($turnos as $turno) {
            for ($i = 0; $i < $gruposPorTurno[$turno->id]; $i++) {
                $nombre = 'Grupo ' . chr(65 + $letra) . ' - ' . ucfirst($turno->nombre);
                $letra++;

                $grupo = Grupo::create([
                    'nombre'           => $nombre,
                    'capacidad_maxima' => 70,
                    'turno_id'         => $turno->id,
                    'modalidad'        => $modalidad,
                    'gestion_id'       => $gestion->id,
                    'total_inscritos'  => 0,
                    'estado'           => 'activo',
                ]);

                $grupo->load('turno');
                $gruposCreados[] = $grupo;
            }
        }

        Bitacora::registrar(
            'Cálculo de grupos',
            "Se crearon {$cantidadGrupos} grupos para {$totalInscritos} postulantes inscritos. Modalidad: {$modalidad}",
            'grupos',
            null
        );

        return response()->json([
            'success' => true,
            'data'    => [
                'grupos'             => $gruposCreados,
                'total_inscritos'    => $totalInscritos,
                'cantidad_grupos'    => $cantidadGrupos,
                'capacidad_total'    => $cantidadGrupos * 70,
                'modalidad'          => $modalidad,
            ],
            'message' => "{$cantidadGrupos} grupos creados correctamente.",
        ], 200);
    }

    public function recalcular()
    {
        $gestion = $this->obtenerGestionActiva();
        if (!$gestion) {
            return response()->json(['success' => false, 'message' => 'No hay una gestión activa.'], 422);
        }

        $gruposConPostulantes = Grupo::where('gestion_id', $gestion->id)
            ->where('total_inscritos', '>', 0)
            ->count();

        if ($gruposConPostulantes > 0) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede recalcular, hay postulantes ya asignados a grupos.'
            ], 422);
        }

        Grupo::where('gestion_id', $gestion->id)->delete();

        return $this->calcular();
    }

    // ================================================================
    // CU22: Index / Destroy
    // ================================================================

    public function index(Request $request)
    {
        $gestion = $this->obtenerGestionActiva();
        if (!$gestion) {
            return response()->json(['success' => false, 'data' => [], 'message' => 'No hay una gestión activa.'], 200);
        }

        $query = Grupo::with(['turno', 'horarios.materia', 'horarios.docente.postulanteDocente'])
            ->where('gestion_id', $gestion->id);

        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }

        $grupos = $query->orderBy('nombre')->get();

        $grupos->each(function ($grupo) {
            $materiasConDocente = $grupo->horarios->pluck('materia_id')->unique()->count();
            $totalMaterias = \App\Models\Materia::count();
            $grupo->materias_con_docente = $materiasConDocente;
            $grupo->total_materias = $totalMaterias;
            $grupo->porcentaje_ocupacion = $grupo->capacidad_maxima > 0
                ? round(($grupo->total_inscritos / $grupo->capacidad_maxima) * 100, 1)
                : 0;
        });

        return response()->json([
            'success' => true,
            'data'    => $grupos,
            'message' => 'Grupos listados correctamente.',
        ], 200);
    }

    public function destroy($id)
    {
        $grupo = Grupo::withCount(['postulantes', 'horarios'])->find($id);
        if (!$grupo) {
            return response()->json(['success' => false, 'message' => 'Grupo no encontrado.'], 404);
        }

        if ($grupo->postulantes_count > 0) {
            return response()->json(['success' => false, 'message' => 'No se puede eliminar: el grupo tiene postulantes asignados.'], 422);
        }

        if ($grupo->horarios_count > 0) {
            return response()->json(['success' => false, 'message' => 'No se puede eliminar: el grupo tiene horarios asignados.'], 422);
        }

        $grupo->delete();

        Bitacora::registrar('Eliminación de grupo', "Grupo ID: {$id}, Nombre: {$grupo->nombre}", 'grupos', $id);

        return response()->json(['success' => true, 'message' => 'Grupo eliminado correctamente.'], 200);
    }

    // ================================================================
    // CU23: Asignación automática de postulantes
    // ================================================================

    public function asignarPostulantes()
    {
        $gestion = $this->obtenerGestionActiva();
        if (!$gestion) {
            return response()->json(['success' => false, 'message' => 'No hay una gestión activa.'], 422);
        }

        $gruposActivos = Grupo::with('turno')
            ->where('gestion_id', $gestion->id)
            ->where('estado', 'activo')
            ->get();

        if ($gruposActivos->isEmpty()) {
            return response()->json(['success' => false, 'message' => 'No hay grupos activos. Calcule grupos primero.'], 422);
        }

        $postulantes = Postulante::where('gestion_id', $gestion->id)
            ->where('estado', 'inscrito')
            ->whereDoesntHave('grupos', function ($q) use ($gestion) {
                $q->where('grupos.gestion_id', $gestion->id);
            })
            ->get();

        if ($postulantes->isEmpty()) {
            return response()->json(['success' => false, 'message' => 'Todos los postulantes ya tienen grupo asignado.'], 422);
        }

        $asignados = 0;
        $detalle = [];

        foreach ($postulantes as $postulante) {
            $turnoPref = $postulante->turno_preferido;

            $grupoAsignado = $gruposActivos->filter(function ($g) use ($turnoPref) {
                return strtolower($g->turno->nombre) === strtolower(trim($turnoPref))
                    && $g->total_inscritos < $g->capacidad_maxima;
            })->sortBy('total_inscritos')->first();

            if (!$grupoAsignado) {
                $grupoAsignado = $gruposActivos->filter(function ($g) {
                    return $g->total_inscritos < $g->capacidad_maxima;
                })->sortBy('total_inscritos')->first();
            }

            if ($grupoAsignado) {
                DB::table('grupo_postulante')->insert([
                    'grupo_id'         => $grupoAsignado->id,
                    'postulante_id'    => $postulante->id,
                    'fecha_asignacion' => now()->toDateString(),
                    'created_at'       => now(),
                    'updated_at'       => now(),
                ]);

                $grupoAsignado->increment('total_inscritos');

                $grupoAsignado->refresh(); // actualiza total_inscritos en memoria
                $asignados++;

                $key = $grupoAsignado->id;
                if (!isset($detalle[$key])) {
                    $detalle[$key] = [
                        'grupo'    => $grupoAsignado->nombre,
                        'turno'    => $grupoAsignado->turno->nombre,
                        'asignados' => 0,
                        'ocupacion' => 0,
                    ];
                }
                $detalle[$key]['asignados']++;
                $detalle[$key]['ocupacion'] = round(($grupoAsignado->total_inscritos / $grupoAsignado->capacidad_maxima) * 100, 1);
            }
        }

        $sinAsignar = $postulantes->count() - $asignados;

        Bitacora::registrar(
            'Asignación automática de postulantes',
            "{$asignados} postulantes asignados, {$sinAsignar} sin asignar",
            'grupo_postulante',
            null
        );

        return response()->json([
            'success' => true,
            'data'    => [
                'total_asignados'   => $asignados,
                'total_sin_asignar' => $sinAsignar,
                'detalle_por_grupo' => array_values($detalle),
            ],
            'message' => "{$asignados} postulantes asignados automáticamente.",
        ], 200);
    }

    // ================================================================
    // CU23: Asignación manual / remoción
    // ================================================================

    public function asignarPostulanteManual(Request $request)
    {
        $validador = Validator::make($request->all(), [
            'postulante_id' => 'required|integer|exists:postulantes,id',
            'grupo_id'      => 'required|integer|exists:grupos,id',
        ]);

        if ($validador->fails()) {
            return response()->json(['success' => false, 'message' => $validador->errors()->first()], 422);
        }

        $grupo = Grupo::find($request->grupo_id);
        if ($grupo->total_inscritos >= $grupo->capacidad_maxima) {
            return response()->json(['success' => false, 'message' => 'El grupo no tiene cupo disponible.'], 422);
        }

        $asignacionAnterior = DB::table('grupo_postulante')
            ->where('postulante_id', $request->postulante_id)
            ->first();

        DB::transaction(function () use ($request, $grupo, $asignacionAnterior) {
            if ($asignacionAnterior) {
                $grupoAnterior = Grupo::find($asignacionAnterior->grupo_id);
                if ($grupoAnterior) {
                    $grupoAnterior->decrement('total_inscritos');
                }
                DB::table('grupo_postulante')
                    ->where('postulante_id', $request->postulante_id)
                    ->delete();
            }

            DB::table('grupo_postulante')->insert([
                'grupo_id'         => $request->grupo_id,
                'postulante_id'    => $request->postulante_id,
                'fecha_asignacion' => now()->toDateString(),
                'created_at'       => now(),
                'updated_at'       => now(),
            ]);

            $grupo->increment('total_inscritos');
        });

        Bitacora::registrar(
            'Asignación manual de postulante',
            "Postulante ID: {$request->postulante_id} → Grupo ID: {$request->grupo_id}",
            'grupo_postulante',
            null
        );

        return response()->json([
            'success' => true,
            'message' => 'Postulante asignado al grupo correctamente.',
        ], 200);
    }

    public function removerPostulante(Request $request)
    {
        $validador = Validator::make($request->all(), [
            'postulante_id' => 'required|integer|exists:postulantes,id',
        ]);

        if ($validador->fails()) {
            return response()->json(['success' => false, 'message' => $validador->errors()->first()], 422);
        }

        $asignacion = DB::table('grupo_postulante')
            ->where('postulante_id', $request->postulante_id)
            ->first();

        if (!$asignacion) {
            return response()->json(['success' => false, 'message' => 'El postulante no está asignado a ningún grupo.'], 422);
        }

        DB::transaction(function () use ($asignacion) {
            DB::table('grupo_postulante')
                ->where('postulante_id', $asignacion->postulante_id)
                ->delete();

            $grupo = Grupo::find($asignacion->grupo_id);
            if ($grupo) {
                $grupo->decrement('total_inscritos');
            }
        });

        Bitacora::registrar(
            'Remoción de postulante de grupo',
            "Postulante ID: {$request->postulante_id} eliminado de Grupo ID: {$asignacion->grupo_id}",
            'grupo_postulante',
            null
        );

        return response()->json([
            'success' => true,
            'message' => 'Postulante removido del grupo correctamente.',
        ], 200);
    }

    // ================================================================
    // CU23: Listar postulantes de un grupo
    // ================================================================

    public function postulantesDeGrupo($id)
    {
        $grupo = Grupo::with('turno')->find($id);
        if (!$grupo) {
            return response()->json(['success' => false, 'message' => 'Grupo no encontrado.'], 404);
        }

        $postulantes = $grupo->postulantes()->with(['carreraPrincipal'])->get()->map(function ($p) {
            return [
                'id'               => $p->id,
                'id_postulante'    => $p->id_postulante,
                'ci'               => $p->ci,
                'nombres'          => $p->nombres,
                'apellidos'        => $p->apellidos,
                'turno_preferido'  => $p->turno_preferido,
                'carrera_principal'=> $p->carreraPrincipal ? $p->carreraPrincipal->nombre : null,
                'fecha_asignacion' => $p->pivot->fecha_asignacion,
            ];
        });

        return response()->json([
            'success' => true,
            'data'    => [
                'grupo'       => $grupo,
                'postulantes' => $postulantes,
            ],
            'message' => 'Postulantes del grupo listados correctamente.',
        ], 200);
    }

    // ================================================================
    // CU23: Estadísticas de asignación
    // ================================================================

    public function estadisticasAsignacion()
    {
        $gestion = $this->obtenerGestionActiva();
        if (!$gestion) {
            return response()->json(['success' => false, 'message' => 'No hay una gestión activa.'], 422);
        }

        $totalInscritos = Postulante::where('gestion_id', $gestion->id)
            ->where('estado', 'inscrito')
            ->count();

        $conGrupo = DB::table('grupo_postulante')
            ->join('postulantes', 'grupo_postulante.postulante_id', '=', 'postulantes.id')
            ->where('postulantes.gestion_id', $gestion->id)
            ->distinct('postulante_id')
            ->count('postulante_id');

        $sinGrupo = $totalInscritos - $conGrupo;

        $grupos = Grupo::with('turno')
            ->where('gestion_id', $gestion->id)
            ->where('estado', 'activo')
            ->get()
            ->map(function ($g) {
                return [
                    'id'                     => $g->id,
                    'nombre'                 => $g->nombre,
                    'turno'                  => $g->turno->nombre ?? null,
                    'total_inscritos'        => $g->total_inscritos,
                    'capacidad_maxima'       => $g->capacidad_maxima,
                    'porcentaje_ocupacion'   => $g->capacidad_maxima > 0 ? round(($g->total_inscritos / $g->capacidad_maxima) * 100, 1) : 0,
                    'cupo_disponible'        => $g->capacidad_maxima - $g->total_inscritos,
                ];
            });

        return response()->json([
            'success' => true,
            'data'    => [
                'total_inscritos' => $totalInscritos,
                'con_grupo'       => $conGrupo,
                'sin_grupo'       => $sinGrupo,
                'grupos'          => $grupos,
            ],
        ], 200);
    }
}
