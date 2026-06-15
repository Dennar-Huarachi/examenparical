<?php

namespace App\Http\Controllers;

use App\Models\Grupo;
use App\Models\Materia;
use App\Models\Docente;
use App\Models\PostulanteDocente;
use App\Models\HorarioBloque;
use App\Models\Bitacora;
use App\Helpers\BitacoraHelper;
use App\Models\Gestion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DistribucionCargaController extends Controller
{
    private function obtenerGestionActiva()
    {
        $gestion = Gestion::where('estado', 'activo')->first();
        if (!$gestion) return null;
        return $gestion;
    }

    public function calcularDistribucion()
    {
        $gestion = $this->obtenerGestionActiva();
        if (!$gestion) {
            return response()->json(['success' => false, 'message' => 'No hay una gestión activa.'], 422);
        }

        $totalGrupos = Grupo::where('gestion_id', $gestion->id)
            ->where('estado', 'activo')
            ->count();

        $totalMaterias = Materia::count();

        if ($totalGrupos === 0 || $totalMaterias === 0) {
            return response()->json([
                'success' => false,
                'message' => 'No hay grupos activos o materias registradas.',
            ], 422);
        }

        $diasPorSemana = 5;
        $bloquesPorMateria = 2;
        $horasPorBloque = 0.75;

        $bloquesTotales = $totalGrupos * $totalMaterias * $diasPorSemana * $bloquesPorMateria;
        $horasTotales = $bloquesTotales * $horasPorBloque;

        $docentes = Docente::with('postulanteDocente')
            ->where('gestion_id', $gestion->id)
            ->where('estado', 'activo')
            ->get()
            ->filter(function ($d) {
                return $d->postulanteDocente && $d->postulanteDocente->carga_horaria_maxima > 0;
            });

        $totalDocentes = $docentes->count();

        if ($totalDocentes === 0) {
            return response()->json([
                'success' => false,
                'message' => 'No hay docentes contratados con carga horaria máxima asignada.',
            ], 422);
        }

        $cargaBase = (int) ceil($horasTotales / $totalDocentes);

        $distribucion = [];
        $docentesConExcedente = [];
        $docentesSinExcedente = [];

        foreach ($docentes as $docente) {
            $cargaMaxima = (int) $docente->postulanteDocente->carga_horaria_maxima;
            $cargaSugerida = min($cargaBase, $cargaMaxima);

            $horasAsignadas = $this->calcularHorasAsignadas($docente->id);

            $item = [
                'docente_id'      => $docente->id,
                'docente_nombre'  => trim(($docente->postulanteDocente->nombres ?? '') . ' ' . ($docente->postulanteDocente->apellidos ?? '')),
                'especialidad'    => $docente->postulanteDocente->especialidad ?? '—',
                'carga_actual'    => $horasAsignadas,
                'carga_maxima'    => $cargaMaxima,
                'carga_sugerida'  => $cargaSugerida,
                'viable'          => $cargaSugerida <= $cargaMaxima,
            ];

            if ($cargaBase > $cargaMaxima) {
                $item['excedente'] = $cargaBase - $cargaMaxima;
                $docentesConExcedente[] = $item;
            } else {
                $item['excedente'] = 0;
                $docentesSinExcedente[] = $item;
            }

            $distribucion[] = $item;
        }

        $totalExcedente = collect($docentesConExcedente)->sum('excedente');
        if ($totalExcedente > 0 && count($docentesSinExcedente) > 0) {
            $adicional = (int) ceil($totalExcedente / count($docentesSinExcedente));
            foreach ($distribucion as &$item) {
                $enSinExcedente = collect($docentesSinExcedente)->contains('docente_id', $item['docente_id']);
                if ($enSinExcedente) {
                    $nuevaCarga = $item['carga_sugerida'] + $adicional;
                    if ($nuevaCarga > $item['carga_maxima']) {
                        $nuevaCarga = $item['carga_maxima'];
                    }
                    $item['carga_sugerida'] = $nuevaCarga;
                }
            }
            unset($item);
        }

        $horasCubiertas = collect($distribucion)->sum('carga_sugerida');
        $viable = $horasCubiertas >= $horasTotales;

        return response()->json([
            'success' => true,
            'data' => [
                'horas_totales_necesarias' => round($horasTotales, 1),
                'bloques_totales'          => $bloquesTotales,
                'total_grupos'             => $totalGrupos,
                'total_materias'           => $totalMaterias,
                'total_docentes'           => $totalDocentes,
                'carga_promedio_sugerida'  => $cargaBase,
                'horas_cubiertas'          => round($horasCubiertas, 1),
                'viable'                   => $viable,
                'horas_faltantes'          => $viable ? 0 : round($horasTotales - $horasCubiertas, 1),
                'distribucion'             => $distribucion,
            ],
            'message' => 'Distribución calculada correctamente.',
        ], 200);
    }

    public function aplicarDistribucion(Request $request)
    {
        $validador = validator($request->all(), [
            'distribucion'                 => 'required|array|min:1',
            'distribucion.*.docente_id'    => 'required|integer|exists:docentes,id',
            'distribucion.*.carga_sugerida'=> 'required|integer|min:0|max:40',
        ]);

        if ($validador->fails()) {
            return response()->json(['success' => false, 'message' => $validador->errors()->first()], 422);
        }

        $gestion = $this->obtenerGestionActiva();
        if (!$gestion) {
            return response()->json(['success' => false, 'message' => 'No hay una gestión activa.'], 422);
        }

        $cambios = [];
        DB::beginTransaction();
        try {
            foreach ($request->distribucion as $item) {
                $docente = Docente::with('postulanteDocente')->find($item['docente_id']);
                if (!$docente || !$docente->postulanteDocente) continue;

                $anterior = (int) $docente->postulanteDocente->carga_horaria_maxima;
                $nuevo = (int) $item['carga_sugerida'];

                if ($anterior !== $nuevo) {
                    $docente->postulanteDocente->update(['carga_horaria_maxima' => $nuevo]);
                    $cambios[] = [
                        'docente_id' => $docente->id,
                        'nombre'     => trim($docente->postulanteDocente->nombres . ' ' . $docente->postulanteDocente->apellidos),
                        'anterior'   => $anterior,
                        'nuevo'      => $nuevo,
                    ];
                }
            }

            BitacoraHelper::registrar(
                'Distribución global de carga horaria',
                'postulantes_docentes',
                null,
                json_encode([
                    'total_modificados' => count($cambios),
                    'detalle'          => $cambios,
                ])
            );

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'Error al aplicar distribución: ' . $e->getMessage()], 500);
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'total_modificados' => count($cambios),
                'cambios'           => $cambios,
            ],
            'message' => 'Distribución aplicada correctamente a ' . count($cambios) . ' docente(s).',
        ], 200);
    }

    public function historial()
    {
        $acciones = Bitacora::with('usuario')
            ->where('accion', 'Distribución global de carga horaria')
            ->orderBy('created_at', 'desc')
            ->limit(20)
            ->get()
            ->map(function ($b) {
                $detalle = json_decode($b->detalle, true);
                return [
                    'fecha'              => $b->created_at->format('d/m/Y H:i'),
                    'total_modificados'  => $detalle['total_modificados'] ?? 0,
                    'aplicado_por'       => $b->usuario
                        ? trim(($b->usuario->nombre ?? '') . ' ' . ($b->usuario->apellido ?? ''))
                        : '—',
                    'detalle'            => $detalle['detalle'] ?? [],
                ];
            });

        return response()->json([
            'success' => true,
            'data'    => $acciones,
            'message' => 'Historial de distribuciones obtenido.',
        ], 200);
    }

    private function calcularHorasAsignadas($docenteId)
    {
        $horas = HorarioBloque::where('docente_id', $docenteId)
            ->select(DB::raw("COALESCE(SUM(EXTRACT(EPOCH FROM (hora_fin - hora_inicio)) / 3600), 0) as total"))
            ->first();
        return round((float) ($horas->total ?? 0), 1);
    }
}
