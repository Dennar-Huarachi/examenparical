<?php

namespace App\Http\Controllers;

use App\Models\Postulante;
use App\Models\Pago;
use App\Models\Carrera;
use App\Models\Bitacora;
use App\Models\CupoCarrera;
use App\Models\Gestion;
use App\Models\Grupo;
use App\Models\Docente;
use App\Models\PostulanteDocente;
use App\Models\HorarioBloque;
use App\Helpers\BitacoraHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function getStats(Request $request)
    {
        $user = $request->user();
        $rolNombre = $user->rol->nombre ?? '';

        $gestionActiva = Gestion::where('estado', 'activo')->first();
        $gestionId = $gestionActiva ? $gestionActiva->id : null;

        // Comunes a todos los roles
        $totalPostulantes = Postulante::count();
        $totalPagos = Pago::count();
        $totalRecaudado = Pago::where('estado', 'confirmado')->sum('monto');

        $estados = Postulante::select('estado', DB::raw('count(*) as total'))
            ->groupBy('estado')
            ->get()
            ->pluck('total', 'estado')
            ->toArray();

        $carreras = Carrera::all()->map(function ($c) use ($gestionId) {
            $cupo = CupoCarrera::where('carrera_id', $c->id)
                ->where('gestion_id', $gestionId)
                ->first();

            $cupoMax = $cupo ? $cupo->cupo_maximo : 50;
            $postulantesCount = Postulante::where('carrera_principal_id', $c->id)->count();

            return [
                'id' => $c->id,
                'nombre' => $c->nombre,
                'cupo' => $cupoMax,
                'postulantes_count' => $postulantesCount,
                'disponibles' => max(0, $cupoMax - $postulantesCount)
            ];
        });

        $data = [
            'total_postulantes' => $totalPostulantes,
            'total_pagos' => $totalPagos,
            'total_recaudado' => floatval($totalRecaudado),
            'postulantes_por_estado' => [
                'pendiente' => $estados['pendiente'] ?? 0,
                'aprobado' => $estados['aprobado'] ?? 0,
                'reprobado' => $estados['reprobado'] ?? 0,
            ],
            'carreras' => $carreras,
        ];

        if (in_array($rolNombre, ['administrador', 'coordinador', 'autoridad'])) {
            $actividadesRecientes = Bitacora::with('usuario')
                ->orderBy('id', 'desc')
                ->take(8)
                ->get()
                ->map(function ($log) {
                    return [
                        'id' => $log->id,
                        'usuario' => $log->usuario ? $log->usuario->email : 'sistema@admin.com',
                        'accion' => $log->accion,
                        'detalle' => $log->detalle,
                        'fecha' => $log->created_at ? $log->created_at->toDateTimeString() : now()->toDateTimeString()
                    ];
                });

            $data['actividades_recientes'] = $actividadesRecientes;
        }

        if (in_array($rolNombre, ['administrador', 'coordinador', 'autoridad'])) {
            $cuposTotales = CupoCarrera::where('gestion_id', $gestionId)->sum('cupo_maximo');
            $data['cupos_totales'] = $cuposTotales;
        }

        if (in_array($rolNombre, ['administrador', 'coordinador', 'autoridad'])) {
            $totalGrupos = $gestionId ? Grupo::where('gestion_id', $gestionId)->count() : 0;
            $totalDocentes = $gestionId ? Docente::where('gestion_id', $gestionId)->count() : 0;

            $data['total_grupos'] = $totalGrupos;
            $data['total_docentes'] = $totalDocentes;
        }

        if (strtolower($rolNombre) === 'docente') {
            $miCarga = null;
            $postulante = PostulanteDocente::where('usuario_id', $user->id)->first();

            if ($postulante) {
                $docente = Docente::where('postulante_docente_id', $postulante->id)->first();

                if ($docente) {
                    $horarios = HorarioBloque::with(['grupo', 'materia', 'aula'])
                        ->where('docente_id', $docente->id)
                        ->orderBy('dia_semana')
                        ->orderBy('hora_inicio')
                        ->get();

                    $totalHoras = (float) HorarioBloque::where('docente_id', $docente->id)
                        ->select(DB::raw("COALESCE(SUM(EXTRACT(EPOCH FROM (hora_fin - hora_inicio)) / 3600), 0) as total_hours"))
                        ->first()
                        ->total_hours ?? 0;

                    $miCarga = [
                        'postulante' => [
                            'nombres' => $postulante->nombres,
                            'apellidos' => $postulante->apellidos,
                            'carga_horaria_maxima' => (int) ($postulante->carga_horaria_maxima ?? 0),
                        ],
                        'horarios' => $horarios,
                        'total_horas_semanales' => $totalHoras,
                        'horas_disponibles' => max(0, ($postulante->carga_horaria_maxima ?? 0) - $totalHoras),
                    ];
                }
            }

            $data['mi_carga'] = $miCarga;
        }

        if (strtolower($rolNombre) === 'postulante') {
            $postulante = Postulante::with(['carreraPrincipal', 'carreraSecundaria', 'carreraAdmitida', 'notasMateria.materia'])
                ->where('usuario_id', $user->id)
                ->first();

            $data['mi_postulacion'] = $postulante ? [
                'id' => $postulante->id,
                'ci' => $postulante->ci,
                'nombres' => $postulante->nombres,
                'apellidos' => $postulante->apellidos,
                'estado' => $postulante->estado,
                'nota_final' => $postulante->nota_final !== null ? floatval($postulante->nota_final) : null,
                'carrera_principal' => $postulante->carreraPrincipal ? $postulante->carreraPrincipal->nombre : null,
                'carrera_secundaria' => $postulante->carreraSecundaria ? $postulante->carreraSecundaria->nombre : null,
                'carrera_admitida' => $postulante->carreraAdmitida ? $postulante->carreraAdmitida->nombre : null,
                'notas' => $postulante->notasMateria->map(function ($nm) {
                    return [
                        'materia' => $nm->materia ? $nm->materia->nombre : 'Materia',
                        'promedio' => floatval($nm->promedio),
                        'aprobado' => (bool)$nm->aprobado
                    ];
                })
            ] : null;
        }

        BitacoraHelper::registrar(
            'CONSULTA_DASHBOARD',
            'dashboard',
            null,
            "Rol: {$rolNombre}",
            $request
        );

        return response()->json([
            'success' => true,
            'data' => $data
        ]);
    }

    public function rendimientoGestiones()
    {
        $rendimiento = Postulante::select(
                'gestion_id',
                DB::raw('COUNT(*) as total_postulantes'),
                DB::raw('AVG(nota_final) as promedio_notas'),
                DB::raw('SUM(CASE WHEN estado = \'aprobado\' THEN 1 ELSE 0 END) as aprobados'),
                DB::raw('SUM(CASE WHEN estado = \'reprobado\' THEN 1 ELSE 0 END) as reprobados'),
                DB::raw('SUM(CASE WHEN estado = \'pendiente\' THEN 1 ELSE 0 END) as pendientes')
            )
            ->whereNotNull('nota_final')
            ->groupBy('gestion_id')
            ->with('gestion')
            ->get()
            ->map(function ($item) {
                $totalEvaluados = $item->aprobados + $item->reprobados;
                return [
                    'gestion_id' => $item->gestion_id,
                    'gestion_codigo' => $item->gestion?->codigo ?? "Gestion #{$item->gestion_id}",
                    'total_postulantes' => (int) $item->total_postulantes,
                    'promedio_notas' => round((float) ($item->promedio_notas ?? 0), 2),
                    'aprobados' => (int) $item->aprobados,
                    'reprobados' => (int) $item->reprobados,
                    'pendientes' => (int) $item->pendientes,
                    'tasa_aprobacion' => $totalEvaluados > 0
                        ? round(($item->aprobados / $totalEvaluados) * 100, 1)
                        : 0,
                ];
            })
            ->sortByDesc('gestion_id')
            ->values();

        BitacoraHelper::registrar(
            'CONSULTA_RENDIMIENTO_GESTIONES',
            'dashboard',
            null,
            'Consulta de rendimiento académico por gestiones',
            request()
        );

        return response()->json([
            'success' => true,
            'data' => $rendimiento
        ]);
    }

    public function topDocente()
    {
        $top = DB::table('horario_bloques')
            ->join('docentes', 'docentes.id', '=', 'horario_bloques.docente_id')
            ->join('postulantes_docentes', 'postulantes_docentes.id', '=', 'docentes.postulante_docente_id')
            ->join('grupos', 'grupos.id', '=', 'horario_bloques.grupo_id')
            ->join('grupo_postulante', 'grupo_postulante.grupo_id', '=', 'grupos.id')
            ->join('postulantes', 'postulantes.id', '=', 'grupo_postulante.postulante_id')
            ->select(
                'docentes.id as docente_id',
                'postulantes_docentes.nombres',
                'postulantes_docentes.apellidos',
                DB::raw('COUNT(DISTINCT grupo_postulante.postulante_id) as total_alumnos'),
                DB::raw("COUNT(DISTINCT CASE WHEN postulantes.estado = 'aprobado' THEN grupo_postulante.postulante_id END) as alumnos_aprobados")
            )
            ->groupBy('docentes.id', 'postulantes_docentes.nombres', 'postulantes_docentes.apellidos')
            ->get()
            ->map(function ($d) {
                $tasa = $d->total_alumnos > 0
                    ? round(($d->alumnos_aprobados / $d->total_alumnos) * 100, 1)
                    : 0;
                return [
                    'docente_id' => $d->docente_id,
                    'nombre' => $d->nombres . ' ' . $d->apellidos,
                    'total_alumnos' => (int) $d->total_alumnos,
                    'alumnos_aprobados' => (int) $d->alumnos_aprobados,
                    'tasa_aprobacion' => $tasa,
                ];
            })
            ->sortByDesc('tasa_aprobacion')
            ->values();

        BitacoraHelper::registrar(
            'CONSULTA_TOP_DOCENTE',
            'dashboard',
            null,
            'Consulta de docente con mayor aprobación de alumnos',
            request()
        );

        return response()->json([
            'success' => true,
            'data' => $top
        ]);
    }
}
