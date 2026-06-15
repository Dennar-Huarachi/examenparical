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

        if (in_array($rolNombre, ['coordinador', 'autoridad'])) {
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

        if (in_array($rolNombre, ['coordinador', 'autoridad'])) {
            $cuposTotales = CupoCarrera::where('gestion_id', $gestionId)->sum('cupo_maximo');
            $data['cupos_totales'] = $cuposTotales;
        }

        if (in_array($rolNombre, ['coordinador', 'autoridad'])) {
            $totalGrupos = $gestionId ? Grupo::where('gestion_id', $gestionId)->count() : 0;
            $totalDocentes = $gestionId ? Docente::where('gestion_id', $gestionId)->count() : 0;

            $data['total_grupos'] = $totalGrupos;
            $data['total_docentes'] = $totalDocentes;
        }

        if ($rolNombre === 'Docente') {
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
}
