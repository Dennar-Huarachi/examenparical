<?php

namespace App\Http\Controllers;

use App\Models\Postulante;
use App\Models\Carrera;
use App\Models\CupoCarrera;
use App\Models\Gestion;
use App\Models\Bitacora;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AsignacionCarreraController extends Controller
{
    private function getGestionActiva()
    {
        $gestion = Gestion::where('estado', 'activo')->first();
        if (!$gestion) {
            abort(422, 'No hay una gestión activa en el sistema.');
        }
        return $gestion;
    }

    private function esCoordinadorOAutoridad()
    {
        $user = request()->user();
        if (!$user || !$user->rol) return false;
        return in_array(strtolower($user->rol->nombre), ['coordinador', 'autoridad', 'administrador', 'coordinador academico']);
    }

    public function verificarListo()
    {
        $gestion = $this->getGestionActiva();

        $postulantes = Postulante::where('gestion_id', $gestion->id)
            ->whereIn('estado', ['inscrito', 'aprobado', 'reprobado'])
            ->get();

        $total = $postulantes->count();
        $conNota = $postulantes->filter(function ($p) {
            return !is_null($p->nota_final) || $p->estado === 'reprobado';
        })->count();
        $sinNota = $postulantes->filter(function ($p) {
            return is_null($p->nota_final) && $p->estado !== 'reprobado';
        });
        $reprobados = $postulantes->where('estado', 'reprobado')->count();

        $listo = $sinNota->isEmpty();

        return response()->json([
            'success' => true,
            'listo' => $listo,
            'total_postulantes' => $total,
            'total_con_nota' => $conNota,
            'total_sin_nota' => $sinNota->count(),
            'total_reprobados' => $reprobados,
            'postulantes_sin_nota' => $sinNota->values()->map(function ($p) {
                return [
                    'id' => $p->id,
                    'id_postulante' => $p->id_postulante,
                    'ci' => $p->ci,
                    'nombres' => $p->nombres,
                    'apellidos' => $p->apellidos,
                    'estado' => $p->estado,
                    'nota_final' => $p->nota_final,
                ];
            }),
            'mensaje' => $listo
                ? 'Todos los postulantes tienen nota final. El sistema está listo para asignar carreras.'
                : "Faltan {$sinNota->count()} postulantes sin nota final. No se puede ejecutar la asignación.",
        ], 200);
    }

    private function ejecutarAlgoritmo()
    {
        $gestion = $this->getGestionActiva();

        $aprobados = Postulante::where('gestion_id', $gestion->id)
            ->where('estado', 'aprobado')
            ->whereNotNull('nota_final')
            ->orderBy('nota_final', 'desc')
            ->get();

        $reprobados = Postulante::where('gestion_id', $gestion->id)
            ->where('estado', 'reprobado')
            ->get();

        $cupos = CupoCarrera::where('gestion_id', $gestion->id)->get()->keyBy('carrera_id');

        $cuposVirtuales = [];
        foreach ($cupos as $carreraId => $cupo) {
            $cuposVirtuales[$carreraId] = [
                'cupo_maximo' => $cupo->cupo_maximo,
                'cupos_ocupados' => $cupo->cupos_ocupados,
                'disponibles' => $cupo->cupo_maximo - $cupo->cupos_ocupados,
            ];
        }

        $resultados = [];
        $admitidos = 0;
        $sinCupo = 0;

        foreach ($aprobados as $postulante) {
            $asignado = false;
            $tipoAsignacion = null;
            $carreraAsignada = null;

            $principalId = $postulante->carrera_principal_id;
            $secundariaId = $postulante->carrera_secundaria_id;

            if ($principalId && isset($cuposVirtuales[$principalId]) && $cuposVirtuales[$principalId]['disponibles'] > 0) {
                $cuposVirtuales[$principalId]['disponibles']--;
                $cuposVirtuales[$principalId]['cupos_ocupados']++;
                $carreraAsignada = $principalId;
                $tipoAsignacion = 'principal';
                $asignado = true;
                $admitidos++;
            } elseif ($secundariaId && isset($cuposVirtuales[$secundariaId]) && $cuposVirtuales[$secundariaId]['disponibles'] > 0) {
                $cuposVirtuales[$secundariaId]['disponibles']--;
                $cuposVirtuales[$secundariaId]['cupos_ocupados']++;
                $carreraAsignada = $secundariaId;
                $tipoAsignacion = 'secundaria';
                $asignado = true;
                $admitidos++;
            } else {
                $sinCupo++;
                $tipoAsignacion = 'sin_cupo';
            }

            $carreraObj = $carreraAsignada ? Carrera::find($carreraAsignada) : null;

            $resultados[] = [
                'id' => $postulante->id,
                'id_postulante' => $postulante->id_postulante,
                'ci' => $postulante->ci,
                'nombres' => $postulante->nombres,
                'apellidos' => $postulante->apellidos,
                'nota_final' => (float) $postulante->nota_final,
                'carrera_principal_id' => $postulante->carrera_principal_id,
                'carrera_secundaria_id' => $postulante->carrera_secundaria_id,
                'carrera_asignada_id' => $carreraAsignada,
                'carrera_asignada_nombre' => $carreraObj ? $carreraObj->nombre : null,
                'tipo_asignacion' => $tipoAsignacion,
            ];
        }

        $detalleCarreras = [];
        foreach ($cuposVirtuales as $carreraId => $virtual) {
            $carrera = Carrera::find($carreraId);
            if ($carrera) {
                $detalleCarreras[] = [
                    'carrera_id' => $carreraId,
                    'carrera_nombre' => $carrera->nombre,
                    'cupo_maximo' => $virtual['cupo_maximo'],
                    'cupos_ocupados_actuales' => $cupos->get($carreraId)->cupos_ocupados,
                    'cupos_a_ocupar' => $virtual['cupos_ocupados'],
                    'cupos_restantes' => $virtual['disponibles'],
                ];
            }
        }

        $reprobadosLista = $reprobados->map(function ($p) {
            return [
                'id' => $p->id,
                'id_postulante' => $p->id_postulante,
                'ci' => $p->ci,
                'nombres' => $p->nombres,
                'apellidos' => $p->apellidos,
                'nota_final' => $p->nota_final ? (float) $p->nota_final : null,
                'carrera_asignada_nombre' => null,
                'tipo_asignacion' => 'reprobado',
            ];
        });

        $todosPostulantes = array_merge($resultados, $reprobadosLista->toArray());

        return [
            'resumen' => [
                'total_admitidos' => $admitidos,
                'total_sin_cupo' => $sinCupo,
                'total_reprobados' => $reprobados->count(),
            ],
            'detalle_por_carrera' => $detalleCarreras,
            'lista_postulantes' => $todosPostulantes,
        ];
    }

    public function previsualizar()
    {
        $verificacion = $this->verificarListo()->getData();
        if (!$verificacion->listo) {
            return response()->json([
                'success' => false,
                'message' => $verificacion->mensaje,
                'postulantes_sin_nota' => $verificacion->postulantes_sin_nota ?? [],
            ], 422);
        }

        if (!$this->esCoordinadorOAutoridad()) {
            return response()->json([
                'success' => false,
                'message' => 'Solo coordinadores y autoridades pueden generar la vista previa.',
            ], 403);
        }

        $resultado = $this->ejecutarAlgoritmo();

        $gestion = $this->getGestionActiva();
        $existenAdmitidos = Postulante::where('gestion_id', $gestion->id)
            ->where('estado', 'admitido')
            ->exists();

        return response()->json([
            'success' => true,
            'data' => $resultado,
            'asignacion_previa' => $existenAdmitidos,
            'message' => 'Vista previa generada correctamente.',
        ], 200);
    }

    public function confirmar(Request $request)
    {
        if (!$this->esCoordinadorOAutoridad()) {
            return response()->json([
                'success' => false,
                'message' => 'Solo coordinadores y autoridades pueden confirmar la asignación.',
            ], 403);
        }

        $gestion = $this->getGestionActiva();
        $resultado = $this->ejecutarAlgoritmo();

        $existenAdmitidos = Postulante::where('gestion_id', $gestion->id)
            ->where('estado', 'admitido')
            ->exists();

        DB::beginTransaction();
        try {
            foreach ($resultado['lista_postulantes'] as $item) {
                if ($item['tipo_asignacion'] === 'reprobado') continue;

                if ($item['tipo_asignacion'] === 'sin_cupo') {
                    Postulante::where('id', $item['id'])->update([
                        'carrera_admitida_id' => null,
                        'estado' => 'aprobado',
                    ]);
                } else {
                    Postulante::where('id', $item['id'])->update([
                        'carrera_admitida_id' => $item['carrera_asignada_id'],
                        'estado' => 'admitido',
                    ]);
                }
            }

            foreach ($resultado['detalle_por_carrera'] as $detalle) {
                CupoCarrera::where('carrera_id', $detalle['carrera_id'])
                    ->where('gestion_id', $gestion->id)
                    ->update([
                        'cupos_ocupados' => $detalle['cupos_a_ocupar'],
                    ]);
            }

            $detalleBitacora = "Asignación confirmada para la gestión {$gestion->codigo}. Admitidos: {$resultado['resumen']['total_admitidos']}, Sin cupo: {$resultado['resumen']['total_sin_cupo']}, Reprobados: {$resultado['resumen']['total_reprobados']}.";

            if ($existenAdmitidos) {
                $detalleBitacora .= " Se sobreescribió una asignación previa.";
            }

            Bitacora::registrar(
                'ASIGNACION_CARRERA_CONFIRMADA',
                $detalleBitacora . " IP: " . $request->ip(),
                'postulantes',
                null
            );

            DB::commit();

            return response()->json([
                'success' => true,
                'total_admitidos' => $resultado['resumen']['total_admitidos'],
                'total_sin_cupo' => $resultado['resumen']['total_sin_cupo'],
                'total_reprobados' => $resultado['resumen']['total_reprobados'],
                'message' => "Asignación confirmada correctamente. {$resultado['resumen']['total_admitidos']} postulantes admitidos.",
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al confirmar la asignación: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function resultados()
    {
        $gestion = $this->getGestionActiva();

        $admitidos = Postulante::with('carreraAdmitida')
            ->where('gestion_id', $gestion->id)
            ->where('estado', 'admitido')
            ->orderBy('nota_final', 'desc')
            ->get();

        $sinCupo = Postulante::where('gestion_id', $gestion->id)
            ->where('estado', 'aprobado')
            ->whereNull('carrera_admitida_id')
            ->orderBy('nota_final', 'desc')
            ->get();

        $reprobados = Postulante::where('gestion_id', $gestion->id)
            ->where('estado', 'reprobado')
            ->orderBy('nota_final', 'desc')
            ->get();

        $admitidosPorCarrera = $admitidos->groupBy(function ($p) {
            return $p->carrera_admitida_id ? $p->carreraAdmitida->nombre : 'Sin carrera';
        });

        $cupos = CupoCarrera::with('carrera')
            ->where('gestion_id', $gestion->id)
            ->get();

        $existenAdmitidos = $admitidos->isNotEmpty();

        return response()->json([
            'success' => true,
            'data' => [
                'existen_admitidos' => $existenAdmitidos,
                'admitidos_por_carrera' => $admitidosPorCarrera->map(function ($lista, $carreraNombre) {
                    return [
                        'carrera_nombre' => $carreraNombre,
                        'total' => $lista->count(),
                        'postulantes' => $lista->map(function ($p) {
                            return [
                                'id' => $p->id,
                                'id_postulante' => $p->id_postulante,
                                'ci' => $p->ci,
                                'nombres' => $p->nombres,
                                'apellidos' => $p->apellidos,
                                'nota_final' => $p->nota_final ? (float) $p->nota_final : null,
                            ];
                        })->values(),
                    ];
                })->values(),
                'sin_cupo' => [
                    'total' => $sinCupo->count(),
                    'postulantes' => $sinCupo->map(function ($p) {
                        return [
                            'id' => $p->id,
                            'id_postulante' => $p->id_postulante,
                            'ci' => $p->ci,
                            'nombres' => $p->nombres,
                            'apellidos' => $p->apellidos,
                            'nota_final' => $p->nota_final ? (float) $p->nota_final : null,
                        ];
                    }),
                ],
                'reprobados' => [
                    'total' => $reprobados->count(),
                    'postulantes' => $reprobados->map(function ($p) {
                        return [
                            'id' => $p->id,
                            'id_postulante' => $p->id_postulante,
                            'ci' => $p->ci,
                            'nombres' => $p->nombres,
                            'apellidos' => $p->apellidos,
                            'nota_final' => $p->nota_final ? (float) $p->nota_final : null,
                        ];
                    }),
                ],
                'cupos' => $cupos->map(function ($c) {
                    return [
                        'carrera_id' => $c->carrera_id,
                        'carrera_nombre' => $c->carrera->nombre,
                        'cupo_maximo' => $c->cupo_maximo,
                        'cupos_ocupados' => $c->cupos_ocupados,
                        'cupos_disponibles' => $c->cupo_maximo - $c->cupos_ocupados,
                    ];
                }),
            ],
            'message' => 'Resultados de asignación.',
        ], 200);
    }
}
