<?php

namespace App\Http\Controllers;

use App\Models\Examen;
use App\Models\Nota;
use App\Models\NotaMateria;
use App\Models\Postulante;
use App\Models\Materia;
use App\Models\Grupo;
use App\Models\Docente;
use App\Models\PostulanteDocente;
use App\Models\Horario;
use App\Models\Gestion;
use App\Models\Bitacora;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\PlantillaNotasExport;

class NotaController extends Controller
{
    private function verificarAcceso($grupoId, $materiaId)
    {
        $user = request()->user();
        $rol = $user->rol;

        if ($rol && in_array(strtolower($rol->nombre), ['coordinador', 'autoridad', 'administrador', 'coordinador academico'])) {
            return true;
        }

        $postulanteDocente = PostulanteDocente::where('usuario_id', $user->id)->first();
        if (!$postulanteDocente) {
            abort(403, 'No tiene acceso a las notas de este grupo y materia.');
        }

        $docente = Docente::where('postulante_docente_id', $postulanteDocente->id)->first();
        if (!$docente) {
            abort(403, 'No tiene acceso a las notas de este grupo y materia.');
        }

        $tieneHorario = Horario::where('docente_id', $docente->id)
            ->where('grupo_id', $grupoId)
            ->where('materia_id', $materiaId)
            ->exists();

        if (!$tieneHorario) {
            abort(403, 'No tiene acceso a las notas de este grupo y materia.');
        }

        return true;
    }

    private function esCoordinadorOAutoridad()
    {
        $user = request()->user();
        if (!$user || !$user->rol) return false;
        return in_array(strtolower($user->rol->nombre), ['coordinador', 'autoridad', 'administrador', 'coordinador academico']);
    }

    private function esDocente()
    {
        $user = request()->user();
        if (!$user || !$user->rol) return false;
        return strtolower($user->rol->nombre) === 'docente';
    }

    public function plantilla($grupoId, $materiaId)
    {
        $this->verificarAcceso($grupoId, $materiaId);

        $grupo = Grupo::find($grupoId);
        if (!$grupo) {
            return response()->json(['success' => false, 'message' => 'Grupo no encontrado.'], 404);
        }

        $materia = Materia::find($materiaId);
        if (!$materia) {
            return response()->json(['success' => false, 'message' => 'Materia no encontrada.'], 404);
        }

        $postulantes = $grupo->postulantes()
            ->select('postulantes.ci', 'postulantes.nombres', 'postulantes.apellidos')
            ->orderBy('postulantes.apellidos')
            ->get()
            ->toArray();

        return Excel::download(
            new PlantillaNotasExport($postulantes, $materia->nombre),
            "plantilla-notas-{$materia->nombre}-{$grupo->nombre}.xlsx"
        );
    }

    public function importar(Request $request)
    {
        $request->validate([
            'grupo_id' => 'required|integer|exists:grupos,id',
            'materia_id' => 'required|integer|exists:materias,id',
            'numero_examen' => 'required|integer|in:1,2,3',
            'archivo' => 'required|file|mimes:xlsx,xls',
        ]);

        $grupoId = $request->grupo_id;
        $materiaId = $request->materia_id;
        $numeroExamen = $request->numero_examen;

        $this->verificarAcceso($grupoId, $materiaId);

        if ($this->esDocente()) {
            $examenesExistentes = Examen::where('materia_id', $materiaId)
                ->where('numero_examen', $numeroExamen)
                ->where('estado', 'registrado')
                ->whereIn('postulante_id', function ($q) use ($grupoId) {
                    $q->select('postulante_id')
                        ->from('grupo_postulante')
                        ->where('grupo_id', $grupoId);
                })
                ->exists();

            if ($examenesExistentes) {
                return response()->json([
                    'success' => false,
                    'message' => "Las notas del Examen {$numeroExamen} ya fueron registradas. Contacte al coordinador para modificarlas.",
                ], 403);
            }
        }

        try {
            $rows = Excel::toArray(new class implements \Maatwebsite\Excel\Concerns\WithHeadingRow {
                public function headingRow(): int { return 1; }
            }, $request->file('archivo'));
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al leer el archivo: ' . $e->getMessage(),
            ], 422);
        }

        $data = $rows[0] ?? [];
        $totalProcesados = count($data);
        $totalExitosos = 0;
        $totalErrores = 0;
        $errores = [];
        $postulantesAfectados = [];

        $postulantesDelGrupo = $grupo = Grupo::find($grupoId);
        $postulantesMap = $grupo->postulantes()
            ->select('postulantes.id', 'postulantes.ci')
            ->get()
            ->keyBy('ci');

        $user = $request->user();

        foreach ($data as $index => $fila) {
            $filaNum = $index + 2;
            $ci = trim($fila['ci'] ?? '');
            $notaValor = trim($fila['nota'] ?? '');

            DB::beginTransaction();
            try {
                if (empty($ci)) {
                    throw new \Exception('El CI es obligatorio.');
                }

                $postulante = $postulantesMap->get($ci);
                if (!$postulante) {
                    throw new \Exception("El CI '{$ci}' no se encuentra en este grupo.");
                }

                if ($notaValor === '' || $notaValor === null) {
                    throw new \Exception('La nota es obligatoria.');
                }

                $notaValor = str_replace(',', '.', $notaValor);
                $notaDecimal = (float) $notaValor;

                if ($notaDecimal < 0 || $notaDecimal > 100) {
                    throw new \Exception("La nota debe estar entre 0 y 100. Valor recibido: {$notaValor}");
                }

                $examen = Examen::where('postulante_id', $postulante->id)
                    ->where('materia_id', $materiaId)
                    ->where('numero_examen', $numeroExamen)
                    ->first();

                if (!$examen) {
                    $examen = Examen::create([
                        'postulante_id' => $postulante->id,
                        'materia_id' => $materiaId,
                        'numero_examen' => $numeroExamen,
                        'fecha' => now(),
                        'estado' => 'registrado',
                    ]);
                } else {
                    if ($this->esCoordinadorOAutoridad()) {
                        $notaAnterior = Nota::where('examen_id', $examen->id)->first();
                        if ($notaAnterior) {
                            Bitacora::registrar(
                                'MODIFICACION_NOTA',
                                "Nota anterior: {$notaAnterior->nota}, Nota nueva: {$notaDecimal}, Examen: {$numeroExamen}, Materia ID: {$materiaId}, Postulante CI: {$ci}",
                                'notas',
                                $examen->id
                            );
                        }
                    }
                    $examen->estado = 'registrado';
                    $examen->fecha = now();
                    $examen->save();
                }

                Nota::updateOrCreate(
                    ['examen_id' => $examen->id],
                    [
                        'nota' => $notaDecimal,
                        'registrado_por' => $user->id,
                    ]
                );

                DB::commit();
                $totalExitosos++;
                $postulantesAfectados[$postulante->id] = $postulante->id;
            } catch (\Exception $e) {
                DB::rollBack();
                $totalErrores++;
                $errores[] = [
                    'fila' => $filaNum,
                    'ci' => $ci ?: '—',
                    'motivo' => $e->getMessage(),
                ];
            }
        }

        foreach ($postulantesAfectados as $postulanteId) {
            $this->calcularPromedio($postulanteId, $materiaId);
        }

        return response()->json([
            'success' => true,
            'total_procesados' => $totalProcesados,
            'total_exitosos' => $totalExitosos,
            'total_errores' => $totalErrores,
            'errores' => $errores,
            'message' => "Importación completada. {$totalExitosos} notas importadas, {$totalErrores} errores.",
        ], 200);
    }

    private function calcularPromedio($postulanteId, $materiaId)
    {
        $examenes = Examen::where('postulante_id', $postulanteId)
            ->where('materia_id', $materiaId)
            ->where('estado', 'registrado')
            ->orderBy('numero_examen')
            ->get();

        if ($examenes->count() < 3) {
            return;
        }

        $notas = Nota::whereIn('examen_id', $examenes->pluck('id'))->get()->keyBy('examen_id');

        $notasValores = [];
        foreach ($examenes as $ex) {
            $n = $notas->get($ex->id);
            if ($n) {
                $notasValores[] = (float) $n->nota;
            }
        }

        if (count($notasValores) < 3) {
            return;
        }

        $promedio = array_sum($notasValores) / 3;
        $aprobado = $promedio >= 60;

        NotaMateria::updateOrCreate(
            ['postulante_id' => $postulanteId, 'materia_id' => $materiaId],
            [
                'promedio' => round($promedio, 2),
                'aprobado' => $aprobado,
            ]
        );

        $this->recalcularEstadoFinal($postulanteId);
    }

    private function recalcularEstadoFinal($postulanteId)
    {
        $materias = Materia::all();
        $notasMateria = NotaMateria::where('postulante_id', $postulanteId)->get()->keyBy('materia_id');

        foreach ($materias as $materia) {
            if (!$notasMateria->has($materia->id)) {
                return;
            }
        }

        $postulante = Postulante::find($postulanteId);
        if (!$postulante) return;

        $tieneReprobada = false;
        foreach ($materias as $materia) {
            $nm = $notasMateria->get($materia->id);
            if (!$nm->aprobado) {
                $tieneReprobada = true;
                break;
            }
        }

        if ($tieneReprobada) {
            $postulante->estado = 'reprobado';
            $postulante->nota_final = null;
            $postulante->save();
            return;
        }

        $notaFinal = 0;
        foreach ($materias as $materia) {
            $nm = $notasMateria->get($materia->id);
            $notaFinal += ((float) $nm->promedio * (int) $materia->peso) / 100;
        }

        $postulante->estado = 'aprobado';
        $postulante->nota_final = round($notaFinal, 2);
        $postulante->save();
    }

    public function index($grupoId, $materiaId)
    {
        $this->verificarAcceso($grupoId, $materiaId);

        $grupo = Grupo::find($grupoId);
        if (!$grupo) {
            return response()->json(['success' => false, 'message' => 'Grupo no encontrado.'], 404);
        }

        $postulantes = $grupo->postulantes()
            ->select('postulantes.id', 'postulantes.ci', 'postulantes.nombres', 'postulantes.apellidos')
            ->orderBy('postulantes.apellidos')
            ->get();

        $resultado = [];

        foreach ($postulantes as $p) {
            $notasMateria = NotaMateria::where('postulante_id', $p->id)
                ->where('materia_id', $materiaId)
                ->first();

            $examenes = Examen::where('postulante_id', $p->id)
                ->where('materia_id', $materiaId)
                ->orderBy('numero_examen')
                ->get()
                ->keyBy('numero_examen');

            $notasPorExamen = [];
            foreach ($examenes as $numEx => $ex) {
                $nota = Nota::where('examen_id', $ex->id)->first();
                $notasPorExamen[$numEx] = $nota ? (float) $nota->nota : null;
            }

            $resultado[] = [
                'postulante_id' => $p->id,
                'ci' => $p->ci,
                'nombres' => $p->nombres,
                'apellidos' => $p->apellidos,
                'nota_examen1' => $notasPorExamen[1] ?? null,
                'nota_examen2' => $notasPorExamen[2] ?? null,
                'nota_examen3' => $notasPorExamen[3] ?? null,
                'promedio' => $notasMateria ? (float) $notasMateria->promedio : null,
                'aprobado' => $notasMateria ? $notasMateria->aprobado : null,
            ];
        }

        return response()->json([
            'success' => true,
            'data' => $resultado,
            'message' => 'Notas listadas correctamente.',
        ], 200);
    }

    public function editarNota($examenId, Request $request)
    {
        if (!$this->esCoordinadorOAutoridad()) {
            return response()->json([
                'success' => false,
                'message' => 'Solo coordinadores y autoridades pueden editar notas individualmente.',
            ], 403);
        }

        $request->validate([
            'nota' => 'required|numeric|min:0|max:100',
        ]);

        $examen = Examen::with('nota')->find($examenId);
        if (!$examen) {
            return response()->json(['success' => false, 'message' => 'Examen no encontrado.'], 404);
        }

        $nuevaNota = (float) $request->nota;
        $notaAnterior = $examen->nota ? (float) $examen->nota->nota : null;

        Bitacora::registrar(
            'MODIFICACION_NOTA',
            "Nota anterior: {$notaAnterior}, Nota nueva: {$nuevaNota}, Examen ID: {$examenId}, Postulante ID: {$examen->postulante_id}, Materia ID: {$examen->materia_id}",
            'notas',
            $examenId
        );

        Nota::updateOrCreate(
            ['examen_id' => $examenId],
            [
                'nota' => $nuevaNota,
                'registrado_por' => $request->user()->id,
            ]
        );

        $examen->estado = 'registrado';
        $examen->save();

        $this->calcularPromedio($examen->postulante_id, $examen->materia_id);

        $examen->load('nota');
        $notasMateria = NotaMateria::where('postulante_id', $examen->postulante_id)
            ->where('materia_id', $examen->materia_id)
            ->first();

        return response()->json([
            'success' => true,
            'data' => [
                'examen' => $examen,
                'promedio' => $notasMateria ? (float) $notasMateria->promedio : null,
                'aprobado' => $notasMateria ? $notasMateria->aprobado : null,
            ],
            'message' => 'Nota actualizada correctamente.',
        ], 200);
    }

    public function resumenGrupo($grupoId)
    {
        $grupo = Grupo::find($grupoId);
        if (!$grupo) {
            return response()->json(['success' => false, 'message' => 'Grupo no encontrado.'], 404);
        }

        $materias = Materia::orderBy('nombre')->get();
        $postulantes = $grupo->postulantes()
            ->select('postulantes.id', 'postulantes.ci', 'postulantes.nombres', 'postulantes.apellidos', 'postulantes.estado', 'postulantes.nota_final')
            ->orderBy('postulantes.apellidos')
            ->get();

        $resultado = [];

        foreach ($postulantes as $p) {
            $materiasData = [];
            foreach ($materias as $m) {
                $nm = NotaMateria::where('postulante_id', $p->id)
                    ->where('materia_id', $m->id)
                    ->first();
                $materiasData[] = [
                    'materia_id' => $m->id,
                    'materia_nombre' => $m->nombre,
                    'peso' => $m->peso,
                    'promedio' => $nm ? (float) $nm->promedio : null,
                    'aprobado' => $nm ? $nm->aprobado : null,
                ];
            }

            $resultado[] = [
                'postulante_id' => $p->id,
                'ci' => $p->ci,
                'nombres' => $p->nombres,
                'apellidos' => $p->apellidos,
                'estado' => $p->estado,
                'nota_final' => $p->nota_final ? (float) $p->nota_final : null,
                'materias' => $materiasData,
            ];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'materias' => $materias,
                'postulantes' => $resultado,
            ],
            'message' => 'Resumen del grupo.',
        ], 200);
    }
}
