<?php

namespace App\Http\Controllers;

use App\Models\Postulante;
use App\Models\Grupo;
use App\Models\Materia;
use App\Models\Gestion;
use App\Models\Bitacora;
use App\Exports\PostulantesReportExport;
use App\Exports\GruposReportExport;
use Barryvdh\DomPDF\Facade\Pdf;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Http\Request;

class ReporteController extends Controller
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

    private function verificarAcceso()
    {
        if (!$this->esCoordinadorOAutoridad()) {
            abort(403, 'Solo coordinadores y autoridades pueden acceder a los reportes.');
        }
    }

    private function getGestionDesdeRequest(Request $request)
    {
        if ($request->filled('gestion_id')) {
            $gestion = Gestion::find($request->gestion_id);
            if (!$gestion) {
                abort(422, 'La gestión especificada no existe.');
            }
            return $gestion;
        }
        return $this->getGestionActiva();
    }

    public function postulantesEstatico()
    {
        $this->verificarAcceso();
        $gestion = $this->getGestionActiva();

        $postulantes = Postulante::with(['carreraAdmitida', 'carreraPrincipal', 'carreraSecundaria'])
            ->where('gestion_id', $gestion->id)
            ->orderByRaw('nota_final DESC NULLS LAST')
            ->get();

        $data = $postulantes->map(function ($p) {
            return [
                'id' => $p->id,
                'id_postulante' => $p->id_postulante,
                'ci' => $p->ci,
                'nombres' => $p->nombres,
                'apellidos' => $p->apellidos,
                'nota_final' => $p->nota_final ? (float) $p->nota_final : null,
                'estado' => $p->estado,
                'carrera_admitida' => $p->carreraAdmitida?->nombre ?? null,
            ];
        });

        $total = $postulantes->count();
        $admitidos = $postulantes->where('estado', 'admitido')->count();
        $reprobados = $postulantes->where('estado', 'reprobado')->count();

        return response()->json([
            'success' => true,
            'data' => [
                'postulantes' => $data,
                'resumen' => [
                    'total' => $total,
                    'admitidos' => $admitidos,
                    'reprobados' => $reprobados,
                ],
                'gestion' => $gestion->codigo,
            ],
            'message' => 'Reporte estático de postulantes generado.',
        ], 200);
    }

    public function postulantesDinamico(Request $request)
    {
        $this->verificarAcceso();
        $gestion = $this->getGestionDesdeRequest($request);

        $query = Postulante::with(['carreraAdmitida', 'carreraPrincipal', 'carreraSecundaria'])
            ->where('gestion_id', $gestion->id);

        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }
        if ($request->filled('carrera_principal_id')) {
            $query->where('carrera_principal_id', $request->carrera_principal_id);
        }
        if ($request->filled('carrera_admitida_id')) {
            $query->where('carrera_admitida_id', $request->carrera_admitida_id);
        }
        if ($request->filled('turno_preferido')) {
            $query->where('turno_preferido', $request->turno_preferido);
        }
        if ($request->filled('nota_min')) {
            $query->where('nota_final', '>=', (float) $request->nota_min);
        }
        if ($request->filled('nota_max')) {
            $query->where('nota_final', '<=', (float) $request->nota_max);
        }

        $postulantes = $query->orderByRaw('nota_final DESC NULLS LAST')->get();

        $incluirNotasMateria = $request->boolean('incluir_notas_materia');
        $incluirCarreraSecundaria = $request->boolean('incluir_carrera_secundaria');
        $incluirTurno = $request->boolean('incluir_turno');
        $incluirColegio = $request->boolean('incluir_colegio');

        if ($incluirNotasMateria) {
            $materias = Materia::orderBy('nombre')->get();
        }

        $materiasList = $materias ?? collect();
        $data = $postulantes->map(function ($p) use ($incluirNotasMateria, $incluirCarreraSecundaria, $incluirTurno, $incluirColegio, $materiasList) {
            $item = [
                'id' => $p->id,
                'id_postulante' => $p->id_postulante,
                'ci' => $p->ci,
                'nombres' => $p->nombres,
                'apellidos' => $p->apellidos,
                'nota_final' => $p->nota_final ? (float) $p->nota_final : null,
                'estado' => $p->estado,
                'carrera_admitida' => $p->carreraAdmitida?->nombre ?? null,
                'carrera_principal' => $p->carreraPrincipal?->nombre ?? null,
            ];

            if ($incluirNotasMateria && $materiasList->isNotEmpty()) {
                $notasPorMateria = $p->notasMateria->keyBy('materia_id');
                foreach ($materiasList as $m) {
                    $nm = $notasPorMateria->get($m->id);
                    $item['nota_' . $m->id] = $nm ? (float) $nm->promedio : null;
                    $item['nota_' . $m->nombre] = $nm ? (float) $nm->promedio : null;
                }
            }
            if ($incluirCarreraSecundaria) {
                $item['carrera_secundaria'] = $p->carreraSecundaria?->nombre ?? null;
            }
            if ($incluirTurno) {
                $item['turno_preferido'] = $p->turno_preferido;
            }
            if ($incluirColegio) {
                $item['colegio_procedencia'] = $p->colegio_procedencia;
            }

            return $item;
        });

        return response()->json([
            'success' => true,
            'data' => [
                'postulantes' => $data,
                'total' => $postulantes->count(),
                'gestion' => $gestion->codigo,
            ],
            'message' => 'Reporte dinámico de postulantes generado.',
        ], 200);
    }

    public function gruposEstatico()
    {
        $this->verificarAcceso();
        $gestion = $this->getGestionActiva();

        $grupos = Grupo::with(['turno', 'postulantes', 'horarios.materia', 'horarios.docente.postulanteDocente'])
            ->where('gestion_id', $gestion->id)
            ->where('estado', 'activo')
            ->orderBy('nombre')
            ->get();

        $data = $grupos->map(function ($g) {
            $notas = $g->postulantes->pluck('nota_final')->filter(function ($n) { return !is_null($n); });
            $promedio = $notas->count() > 0 ? round($notas->avg(), 2) : null;
            $notaMax = $notas->count() > 0 ? (float) $notas->max() : null;
            $notaMin = $notas->count() > 0 ? (float) $notas->min() : null;
            $ocupacion = $g->capacidad_maxima > 0 ? round(($g->total_inscritos / $g->capacidad_maxima) * 100, 1) : 0;

            $docentes = $g->horarios->map(function ($h) {
                $doc = $h->docente;
                if ($doc && $doc->postulanteDocente) {
                    return [
                        'docente_id' => $doc->id,
                        'nombres' => $doc->postulanteDocente->nombres,
                        'apellidos' => $doc->postulanteDocente->apellidos,
                        'materia' => $h->materia?->nombre,
                    ];
                }
                return null;
            })->filter()->values();

            return [
                'id' => $g->id,
                'nombre' => $g->nombre,
                'turno' => $g->turno?->nombre,
                'modalidad' => $g->modalidad,
                'total_inscritos' => $g->total_inscritos,
                'capacidad_maxima' => $g->capacidad_maxima,
                'ocupacion_porcentaje' => $ocupacion,
                'promedio_notas' => $promedio,
                'nota_maxima' => $notaMax,
                'nota_minima' => $notaMin,
                'docentes_asignados' => $docentes,
                'tiene_docentes' => $docentes->isNotEmpty(),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'grupos' => $data,
                'total' => $grupos->count(),
                'gestion' => $gestion->codigo,
            ],
            'message' => 'Reporte estático de grupos generado.',
        ], 200);
    }

    public function gruposDinamico(Request $request)
    {
        $this->verificarAcceso();
        $gestion = $this->getGestionDesdeRequest($request);

        $query = Grupo::with(['turno', 'postulantes', 'horarios.materia', 'horarios.docente.postulanteDocente'])
            ->where('gestion_id', $gestion->id);

        if ($request->filled('turno_id')) {
            $query->where('turno_id', $request->turno_id);
        }
        if ($request->filled('modalidad')) {
            $query->where('modalidad', $request->modalidad);
        }
        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }

        $grupos = $query->orderBy('nombre')->get();

        $incluirPostulantes = $request->boolean('incluir_postulantes');
        $incluirHorarios = $request->boolean('incluir_horarios');
        $incluirEstadisticasNotas = $request->boolean('incluir_estadisticas_notas');

        $data = $grupos->map(function ($g) use ($incluirPostulantes, $incluirHorarios, $incluirEstadisticasNotas) {
            $notas = $g->postulantes->pluck('nota_final')->filter(function ($n) { return !is_null($n); });
            $promedio = $notas->count() > 0 ? round($notas->avg(), 2) : null;
            $notaMax = $notas->count() > 0 ? (float) $notas->max() : null;
            $notaMin = $notas->count() > 0 ? (float) $notas->min() : null;
            $ocupacion = $g->capacidad_maxima > 0 ? round(($g->total_inscritos / $g->capacidad_maxima) * 100, 1) : 0;

            $item = [
                'id' => $g->id,
                'nombre' => $g->nombre,
                'turno' => $g->turno?->nombre,
                'modalidad' => $g->modalidad,
                'total_inscritos' => $g->total_inscritos,
                'capacidad_maxima' => $g->capacidad_maxima,
                'ocupacion_porcentaje' => $ocupacion,
                'estado' => $g->estado,
            ];

            if ($incluirEstadisticasNotas) {
                $item['promedio_notas'] = $promedio;
                $item['nota_maxima'] = $notaMax;
                $item['nota_minima'] = $notaMin;
            }

            if ($incluirPostulantes) {
                $item['postulantes'] = $g->postulantes->map(function ($p) {
                    return [
                        'id' => $p->id,
                        'ci' => $p->ci,
                        'nombres' => $p->nombres,
                        'apellidos' => $p->apellidos,
                        'nota_final' => $p->nota_final ? (float) $p->nota_final : null,
                        'estado' => $p->estado,
                    ];
                })->values();
            }

            if ($incluirHorarios) {
                $item['horarios'] = $g->horarios->map(function ($h) {
                    return [
                        'dia' => $h->dia_semana,
                        'hora_inicio' => $h->hora_inicio,
                        'hora_fin' => $h->hora_fin,
                        'materia' => $h->materia?->nombre,
                        'aula' => $h->aula?->nombre ?? null,
                        'docente' => $h->docente && $h->docente->postulanteDocente
                            ? $h->docente->postulanteDocente->nombres . ' ' . $h->docente->postulanteDocente->apellidos
                            : null,
                    ];
                })->values();
            }

            return $item;
        });

        return response()->json([
            'success' => true,
            'data' => [
                'grupos' => $data,
                'total' => $grupos->count(),
                'gestion' => $gestion->codigo,
            ],
            'message' => 'Reporte dinámico de grupos generado.',
        ], 200);
    }

    public function exportarExcel(Request $request)
    {
        $this->verificarAcceso();
        $gestion = $this->getGestionDesdeRequest($request);

        $tipo = $request->input('tipo', 'postulantes');
        $modo = $request->input('modo', 'estatico');
        $filtros = $request->input('filtros', []);

        $nombreArchivo = "reporte_{$tipo}_{$modo}_{$gestion->codigo}_" . date('Ymd_His') . '.xlsx';

        $usuario = $request->user()->name ?? 'Sistema';

        if ($tipo === 'grupos') {
            $export = new GruposReportExport($gestion->id, $modo, $filtros);
        } else {
            $export = new PostulantesReportExport($gestion->id, $modo, $filtros);
        }

        Bitacora::registrar(
            'EXPORTACION_REPORTE',
            "Exportación Excel - Reporte de {$tipo} ({$modo}) - Gestión {$gestion->codigo} - Usuario: {$usuario} - IP: " . $request->ip(),
            'reportes',
            null
        );

        return Excel::download($export, $nombreArchivo);
    }

    public function exportarPDF(Request $request)
    {
        $this->verificarAcceso();
        $gestion = $this->getGestionDesdeRequest($request);

        $tipo = $request->input('tipo', 'postulantes');
        $modo = $request->input('modo', 'estatico');
        $filtros = $request->input('filtros', []);
        $usuario = $request->user()->name ?? 'Sistema';
        $fecha = now()->format('d/m/Y H:i:s');

        $vista = $tipo === 'grupos' ? 'reportes.grupos' : 'reportes.postulantes';

        if ($tipo === 'grupos') {
            $grupos = Grupo::with(['turno', 'postulantes', 'horarios.materia', 'horarios.docente.postulanteDocente'])
                ->where('gestion_id', $gestion->id)
                ->when($modo === 'dinamico', function ($q) use ($filtros) {
                    if (!empty($filtros['turno_id'])) $q->where('turno_id', $filtros['turno_id']);
                    if (!empty($filtros['modalidad'])) $q->where('modalidad', $filtros['modalidad']);
                    if (!empty($filtros['estado'])) $q->where('estado', $filtros['estado']);
                })
                ->orderBy('nombre')
                ->get()
                ->map(function ($g) {
                    $notas = $g->postulantes->pluck('nota_final')->filter(function ($n) { return !is_null($n); });
                    $docentes = $g->horarios->map(function ($h) {
                        $doc = $h->docente;
                        if ($doc && $doc->postulanteDocente) {
                            return $doc->postulanteDocente->nombres . ' ' . $doc->postulanteDocente->apellidos . ' (' . ($h->materia->nombre ?? '') . ')';
                        }
                        return null;
                    })->filter()->implode(', ');

                    return (object) [
                        'nombre' => $g->nombre,
                        'turno' => $g->turno?->nombre,
                        'modalidad' => $g->modalidad,
                        'total_inscritos' => $g->total_inscritos,
                        'capacidad_maxima' => $g->capacidad_maxima,
                        'ocupacion' => $g->capacidad_maxima > 0 ? round(($g->total_inscritos / $g->capacidad_maxima) * 100, 1) : 0,
                        'promedio_notas' => $notas->count() > 0 ? round($notas->avg(), 2) : null,
                        'nota_maxima' => $notas->count() > 0 ? (float) $notas->max() : null,
                        'nota_minima' => $notas->count() > 0 ? (float) $notas->min() : null,
                        'docentes' => $docentes,
                    ];
                });
        } else {
            $postulantes = Postulante::with(['carreraAdmitida', 'carreraPrincipal', 'carreraSecundaria'])
                ->where('gestion_id', $gestion->id)
                ->when($modo === 'dinamico', function ($q) use ($filtros) {
                    if (!empty($filtros['estado'])) $q->where('estado', $filtros['estado']);
                    if (!empty($filtros['carrera_principal_id'])) $q->where('carrera_principal_id', $filtros['carrera_principal_id']);
                    if (!empty($filtros['carrera_admitida_id'])) $q->where('carrera_admitida_id', $filtros['carrera_admitida_id']);
                    if (!empty($filtros['turno_preferido'])) $q->where('turno_preferido', $filtros['turno_preferido']);
                    if (!empty($filtros['nota_min'])) $q->where('nota_final', '>=', (float) $filtros['nota_min']);
                    if (!empty($filtros['nota_max'])) $q->where('nota_final', '<=', (float) $filtros['nota_max']);
                })
                ->orderByRaw('nota_final DESC NULLS LAST')
                ->get()
                ->map(function ($p) {
                    return (object) [
                        'id_postulante' => $p->id_postulante,
                        'ci' => $p->ci,
                        'nombres' => $p->nombres,
                        'apellidos' => $p->apellidos,
                        'nota_final' => $p->nota_final ? (float) $p->nota_final : null,
                        'estado' => $p->estado,
                        'carrera_admitida' => $p->carreraAdmitida?->nombre ?? '',
                    ];
                });
        }

        $pdf = Pdf::loadView($vista, compact(
            'gestion', 'usuario', 'fecha', 'tipo', 'modo'
        ) + ($tipo === 'grupos' ? ['grupos' => $grupos] : ['postulantes' => $postulantes]));

        $nombreArchivo = "reporte_{$tipo}_{$modo}_{$gestion->codigo}_" . date('Ymd_His') . '.pdf';

        Bitacora::registrar(
            'EXPORTACION_REPORTE',
            "Exportación PDF - Reporte de {$tipo} ({$modo}) - Gestión {$gestion->codigo} - Usuario: {$usuario} - IP: " . $request->ip(),
            'reportes',
            null
        );

        return $pdf->download($nombreArchivo);
    }
}
