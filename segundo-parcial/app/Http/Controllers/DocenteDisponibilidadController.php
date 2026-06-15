<?php

namespace App\Http\Controllers;

use App\Models\Docente;
use App\Models\DocenteDisponibilidad;
use App\Models\Gestion;
use App\Models\Turno;
use App\Models\PostulanteDocente;
use App\Helpers\BitacoraHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class DocenteDisponibilidadController extends Controller
{
    public function setDisponibilidad(Request $request)
    {
        $validador = Validator::make($request->all(), [
            'docente_id'         => 'required|integer|exists:docentes,id',
            'disponibilidad'     => 'required|array|min:1',
            'disponibilidad.*.turno_id'       => 'required|integer|exists:turnos,id',
            'disponibilidad.*.horas_disponibles' => 'required|integer|min:0',
        ]);

        if ($validador->fails()) {
            return response()->json(['success' => false, 'message' => $validador->errors()->first()], 422);
        }

        $docente = Docente::with('postulanteDocente')->find($request->docente_id);
        if (!$docente) {
            return response()->json(['success' => false, 'message' => 'Docente no encontrado'], 404);
        }

        $pd = $docente->postulanteDocente;
        if (!$pd) {
            return response()->json(['success' => false, 'message' => 'Postulante docente no encontrado'], 404);
        }

        $cargaMaxima = (int) ($pd->carga_horaria_maxima ?? 0);
        $totalHoras = collect($request->disponibilidad)->sum('horas_disponibles');

        if ($cargaMaxima > 0 && $totalHoras > $cargaMaxima) {
            return response()->json([
                'success' => false,
                'message' => "La suma de horas disponibles por turno ({$totalHoras}) no puede exceder la carga horaria máxima ({$cargaMaxima} hrs/sem).",
            ], 422);
        }

        $gestion = Gestion::where('estado', 'activo')->first();
        if (!$gestion) {
            return response()->json(['success' => false, 'message' => 'No hay una gestión activa'], 422);
        }

        $creados = [];
        foreach ($request->disponibilidad as $item) {
            $disp = DocenteDisponibilidad::updateOrCreate(
                [
                    'postulante_docente_id' => $pd->id,
                    'turno_id'              => $item['turno_id'],
                    'gestion_id'            => $gestion->id,
                ],
                [
                    'horas_disponibles' => $item['horas_disponibles'],
                ]
            );
            $creados[] = $disp;
        }

        BitacoraHelper::registrar(
            'Configuración de disponibilidad docente',
            'docente_disponibilidad',
            $docente->id,
            'Docente ID: ' . $docente->id . ', Turnos configurados: ' . count($creados)
        );

        return response()->json([
            'success' => true,
            'data'    => $creados,
            'message' => 'Disponibilidad configurada correctamente.',
        ], 200);
    }

    public function getDisponibilidad($docenteId)
    {
        $docente = Docente::with('postulanteDocente')->find($docenteId);
        if (!$docente) {
            return response()->json(['success' => false, 'message' => 'Docente no encontrado'], 404);
        }

        $gestion = Gestion::where('estado', 'activo')->first();
        if (!$gestion) {
            return response()->json(['success' => false, 'message' => 'No hay una gestión activa'], 422);
        }

        $turnos = Turno::orderBy('id')->get();
        $disponibilidad = DocenteDisponibilidad::where('postulante_docente_id', $docente->postulante_docente_id)
            ->where('gestion_id', $gestion->id)
            ->get()
            ->keyBy('turno_id');

        $data = $turnos->map(function ($turno) use ($disponibilidad) {
            $disp = $disponibilidad->get($turno->id);
            return [
                'turno_id'          => $turno->id,
                'turno_nombre'      => $turno->nombre,
                'horas_disponibles' => $disp ? (int) $disp->horas_disponibles : null,
            ];
        });

        $totalConfigurado = $disponibilidad->sum('horas_disponibles');
        $cargaMaxima = (int) ($docente->postulanteDocente->carga_horaria_maxima ?? 0);

        return response()->json([
            'success' => true,
            'data'    => [
                'docente_id'         => $docenteId,
                'disponibilidad'     => $data,
                'total_configurado'  => $totalConfigurado,
                'carga_horaria_maxima' => $cargaMaxima,
            ],
            'message' => 'Disponibilidad obtenida correctamente.',
        ], 200);
    }
}
