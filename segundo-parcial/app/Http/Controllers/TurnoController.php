<?php

namespace App\Http\Controllers;

use App\Models\Turno;
use App\Models\Bitacora;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class TurnoController extends Controller
{
    private const TURNOS_DEFAULT = [
        ['nombre' => 'Mañana', 'hora_inicio' => '07:00', 'hora_fin' => '12:00'],
        ['nombre' => 'Tarde',  'hora_inicio' => '14:00', 'hora_fin' => '18:00'],
        ['nombre' => 'Noche',  'hora_inicio' => '19:00', 'hora_fin' => '22:00'],
    ];

    public function index()
    {
        $turnos = Turno::orderBy('hora_inicio')->get();

        return response()->json([
            'success' => true,
            'data'    => $turnos,
            'message' => 'Turnos listados correctamente.',
        ], 200);
    }

    private function validarSolapamiento($horaInicio, $horaFin, $excluirId = null)
    {
        $query = Turno::where(function ($q) use ($horaInicio, $horaFin) {
            $q->where(function ($q2) use ($horaInicio, $horaFin) {
                $q2->where('hora_inicio', '<', $horaFin)
                   ->where('hora_fin', '>', $horaInicio);
            });
        });

        if ($excluirId) {
            $query->where('id', '!=', $excluirId);
        }

        return $query->exists();
    }

    public function store(Request $request)
    {
        $validador = Validator::make($request->all(), [
            'nombre'      => 'required|string|max:50|unique:turnos,nombre',
            'hora_inicio' => 'required|date_format:H:i',
            'hora_fin'    => 'required|date_format:H:i|after:hora_inicio',
        ], [
            'nombre.required'      => 'El nombre del turno es obligatorio.',
            'nombre.unique'        => 'Ya existe un turno con ese nombre.',
            'hora_inicio.required' => 'La hora de inicio es obligatoria.',
            'hora_fin.required'    => 'La hora de fin es obligatoria.',
            'hora_fin.after'       => 'La hora de fin debe ser posterior a la hora de inicio.',
        ]);

        if ($validador->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validador->errors()->first(),
            ], 422);
        }

        if ($this->validarSolapamiento($request->hora_inicio, $request->hora_fin)) {
            return response()->json([
                'success' => false,
                'message' => "El horario {$request->hora_inicio} - {$request->hora_fin} se solapa con otro turno existente.",
            ], 422);
        }

        $turno = Turno::create([
            'nombre'      => trim($request->nombre),
            'hora_inicio' => $request->hora_inicio,
            'hora_fin'    => $request->hora_fin,
        ]);

        Bitacora::registrar(
            'Creación de turno',
            "Nombre: {$turno->nombre}, Horario: {$turno->hora_inicio} - {$turno->hora_fin}",
            'turnos',
            $turno->id
        );

        return response()->json([
            'success' => true,
            'data'    => $turno,
            'message' => "Turno '{$turno->nombre}' creado correctamente.",
        ], 200);
    }

    public function update(Request $request, $id)
    {
        $turno = Turno::find($id);
        if (!$turno) {
            return response()->json([
                'success' => false,
                'message' => 'Turno no encontrado.',
            ], 404);
        }

        $validador = Validator::make($request->all(), [
            'nombre'      => 'required|string|max:50|unique:turnos,nombre,' . $id,
            'hora_inicio' => 'required|date_format:H:i',
            'hora_fin'    => 'required|date_format:H:i|after:hora_inicio',
        ], [
            'nombre.required'      => 'El nombre del turno es obligatorio.',
            'nombre.unique'        => 'Ya existe otro turno con ese nombre.',
            'hora_inicio.required' => 'La hora de inicio es obligatoria.',
            'hora_fin.required'    => 'La hora de fin es obligatoria.',
            'hora_fin.after'       => 'La hora de fin debe ser posterior a la hora de inicio.',
        ]);

        if ($validador->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validador->errors()->first(),
            ], 422);
        }

        if ($this->validarSolapamiento($request->hora_inicio, $request->hora_fin, $id)) {
            return response()->json([
                'success' => false,
                'message' => "El horario {$request->hora_inicio} - {$request->hora_fin} se solapa con otro turno existente.",
            ], 422);
        }

        $turno->update([
            'nombre'      => trim($request->nombre),
            'hora_inicio' => $request->hora_inicio,
            'hora_fin'    => $request->hora_fin,
        ]);

        Bitacora::registrar(
            'Modificación de turno',
            "Nombre: {$turno->nombre}, Horario: {$turno->hora_inicio} - {$turno->hora_fin}",
            'turnos',
            $turno->id
        );

        return response()->json([
            'success' => true,
            'data'    => $turno->fresh(),
            'message' => "Turno '{$turno->nombre}' actualizado correctamente.",
        ], 200);
    }

    public function destroy($id)
    {
        $turno = Turno::find($id);
        if (!$turno) {
            return response()->json([
                'success' => false,
                'message' => 'Turno no encontrado.',
            ], 404);
        }

        $tieneGrupos = DB::table('grupos')->where('turno_id', $id)->exists();
        if ($tieneGrupos) {
            return response()->json([
                'success' => false,
                'message' => "No se puede eliminar el turno '{$turno->nombre}' porque tiene grupos asignados.",
            ], 422);
        }

        $nombreTurno = $turno->nombre;
        $turno->delete();

        Bitacora::registrar(
            'Eliminación de turno',
            "Nombre: {$nombreTurno}",
            'turnos',
            $id
        );

        return response()->json([
            'success' => true,
            'data'    => null,
            'message' => "Turno '{$nombreTurno}' eliminado correctamente.",
        ], 200);
    }

    public function cargarDefault()
    {
        $cantidadActual = Turno::count();
        if ($cantidadActual > 0) {
            return response()->json([
                'success' => false,
                'message' => 'No se pueden cargar los turnos por defecto porque ya existen turnos en el sistema.',
            ], 422);
        }

        DB::transaction(function () {
            foreach (self::TURNOS_DEFAULT as $t) {
                Turno::create($t);
            }
        });

        Bitacora::registrar(
            'Carga de turnos por defecto',
            'Se insertaron los 3 turnos base: Mañana (07:00-12:00), Tarde (14:00-18:00), Noche (19:00-22:00).',
            'turnos',
            null
        );

        $turnos = Turno::orderBy('hora_inicio')->get();

        return response()->json([
            'success' => true,
            'data'    => $turnos,
            'message' => 'Turnos por defecto cargados correctamente.',
        ], 200);
    }
}
