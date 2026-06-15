<?php

namespace App\Http\Controllers;

use App\Models\Aula;
use App\Models\Gestion;
use App\Models\Bitacora;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class AulaController extends Controller
{
    private function obtenerGestionActiva()
    {
        $gestion = Gestion::where('estado', 'activo')->first();
        if (!$gestion) {
            return null;
        }
        return $gestion;
    }

    public function index(Request $request)
    {
        $gestion = $this->obtenerGestionActiva();
        if (!$gestion) {
            return response()->json([
                'success' => false,
                'message' => 'No hay una gestión activa en el sistema.',
            ], 422);
        }

        $query = Aula::where('gestion_id', $gestion->id);

        if ($request->filled('edificio')) {
            $query->where('edificio', $request->edificio);
        }

        if ($request->filled('modalidad')) {
            $query->where('modalidad', $request->modalidad);
        }

        if ($request->boolean('tiene_proyector')) {
            $query->where('tiene_proyector', true);
        }

        if ($request->boolean('disponible')) {
            $query->where('disponible', true);
        }

        $aulas = $query->orderBy('edificio')->orderBy('piso')->orderBy('numero')->get();

        $edificios = Aula::where('gestion_id', $gestion->id)
            ->select('edificio')
            ->distinct()
            ->orderBy('edificio')
            ->pluck('edificio');

        $totalAulas = $aulas->count();
        $disponibles = $aulas->where('disponible', true)->count();
        $conProyector = $aulas->where('tiene_proyector', true)->count();
        $capacidadTotal = $aulas->sum('capacidad');

        return response()->json([
            'success' => true,
            'data' => [
                'aulas'          => $aulas,
                'edificios'      => $edificios,
                'stats'          => [
                    'total_aulas'     => $totalAulas,
                    'disponibles'     => $disponibles,
                    'con_proyector'   => $conProyector,
                    'capacidad_total' => $capacidadTotal,
                ],
                'gestion' => $gestion,
            ],
            'message' => 'Aulas listadas correctamente.',
        ], 200);
    }

    public function store(Request $request)
    {
        $gestion = $this->obtenerGestionActiva();
        if (!$gestion) {
            return response()->json([
                'success' => false,
                'message' => 'No hay una gestión activa en el sistema.',
            ], 422);
        }

        $validador = Validator::make($request->all(), [
            'numero'          => 'required|string|max:50',
            'nombre'          => 'nullable|string|max:255',
            'capacidad'       => 'required|integer|min:1',
            'piso'            => 'required|integer|min:-5|max:100',
            'edificio'        => 'required|string|max:255',
            'tiene_proyector' => 'nullable|boolean',
            'modalidad'       => 'required|string|in:presencial,virtual',
            'disponible'      => 'nullable|boolean',
        ], [
            'numero.required'    => 'El número de aula es obligatorio.',
            'capacidad.required' => 'La capacidad es obligatoria.',
            'capacidad.min'      => 'La capacidad mínima es 1.',
            'piso.required'      => 'El piso es obligatorio.',
            'edificio.required'  => 'El edificio es obligatorio.',
            'modalidad.required' => 'La modalidad es obligatoria.',
            'modalidad.in'       => 'La modalidad debe ser "presencial" o "virtual".',
        ]);

        if ($validador->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validador->errors()->first(),
            ], 422);
        }

        $existe = Aula::where('gestion_id', $gestion->id)
            ->where('edificio', $request->edificio)
            ->where('numero', $request->numero)
            ->exists();

        if ($existe) {
            return response()->json([
                'success' => false,
                'message' => "Ya existe un aula con el número '{$request->numero}' en el edificio '{$request->edificio}' para esta gestión.",
            ], 422);
        }

        $aula = Aula::create([
            'numero'          => trim($request->numero),
            'nombre'          => $request->filled('nombre') ? trim($request->nombre) : null,
            'capacidad'       => $request->capacidad,
            'piso'            => $request->piso,
            'edificio'        => trim($request->edificio),
            'tiene_proyector' => $request->boolean('tiene_proyector'),
            'modalidad'       => $request->modalidad,
            'disponible'      => $request->boolean('disponible', true),
            'gestion_id'      => $gestion->id,
        ]);

        Bitacora::registrar(
            'Creación de aula',
            "Edificio: {$aula->edificio}, Número: {$aula->numero}, Capacidad: {$aula->capacidad}, Modalidad: {$aula->modalidad}",
            'aulas',
            $aula->id
        );

        return response()->json([
            'success' => true,
            'data'    => $aula,
            'message' => "Aula '{$aula->edificio} - {$aula->numero}' creada correctamente.",
        ], 200);
    }

    public function update(Request $request, $id)
    {
        $aula = Aula::find($id);
        if (!$aula) {
            return response()->json([
                'success' => false,
                'message' => 'Aula no encontrada.',
            ], 404);
        }

        $validador = Validator::make($request->all(), [
            'numero'          => 'required|string|max:50',
            'nombre'          => 'nullable|string|max:255',
            'capacidad'       => 'required|integer|min:1',
            'piso'            => 'required|integer|min:-5|max:100',
            'edificio'        => 'required|string|max:255',
            'tiene_proyector' => 'nullable|boolean',
            'modalidad'       => 'required|string|in:presencial,virtual',
            'disponible'      => 'nullable|boolean',
        ], [
            'numero.required'    => 'El número de aula es obligatorio.',
            'capacidad.required' => 'La capacidad es obligatoria.',
            'capacidad.min'      => 'La capacidad mínima es 1.',
            'piso.required'      => 'El piso es obligatorio.',
            'edificio.required'  => 'El edificio es obligatorio.',
            'modalidad.required' => 'La modalidad es obligatoria.',
            'modalidad.in'       => 'La modalidad debe ser "presencial" o "virtual".',
        ]);

        if ($validador->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validador->errors()->first(),
            ], 422);
        }

        $existe = Aula::where('gestion_id', $aula->gestion_id)
            ->where('edificio', $request->edificio)
            ->where('numero', $request->numero)
            ->where('id', '!=', $id)
            ->exists();

        if ($existe) {
            return response()->json([
                'success' => false,
                'message' => "Ya existe otra aula con el número '{$request->numero}' en el edificio '{$request->edificio}'.",
            ], 422);
        }

        $aula->update([
            'numero'          => trim($request->numero),
            'nombre'          => $request->filled('nombre') ? trim($request->nombre) : null,
            'capacidad'       => $request->capacidad,
            'piso'            => $request->piso,
            'edificio'        => trim($request->edificio),
            'tiene_proyector' => $request->boolean('tiene_proyector'),
            'modalidad'       => $request->modalidad,
            'disponible'      => $request->boolean('disponible'),
        ]);

        Bitacora::registrar(
            'Modificación de aula',
            "Edificio: {$aula->edificio}, Número: {$aula->numero}, Capacidad: {$aula->capacidad}",
            'aulas',
            $aula->id
        );

        return response()->json([
            'success' => true,
            'data'    => $aula->fresh(),
            'message' => "Aula '{$aula->edificio} - {$aula->numero}' actualizada correctamente.",
        ], 200);
    }

    public function destroy($id)
    {
        $aula = Aula::find($id);
        if (!$aula) {
            return response()->json([
                'success' => false,
                'message' => 'Aula no encontrada.',
            ], 404);
        }

        if (DB::getSchemaBuilder()->hasTable('horarios')) {
            $tieneHorarios = DB::table('horarios')
                ->where('aula_id', $id)
                ->where('gestion_id', $aula->gestion_id)
                ->exists();

            if ($tieneHorarios) {
                return response()->json([
                    'success' => false,
                    'message' => "No se puede eliminar el aula porque tiene horarios asignados en la gestión activa.",
                ], 422);
            }
        }

        $nombreAula = $aula->edificio . ' - ' . $aula->numero;

        $aula->delete();

        Bitacora::registrar(
            'Eliminación de aula',
            "Aula: {$nombreAula}",
            'aulas',
            $id
        );

        return response()->json([
            'success' => true,
            'data'    => null,
            'message' => "Aula '{$nombreAula}' eliminada correctamente.",
        ], 200);
    }

    public function toggleDisponible($id)
    {
        $aula = Aula::find($id);
        if (!$aula) {
            return response()->json([
                'success' => false,
                'message' => 'Aula no encontrada.',
            ], 404);
        }

        $nuevoEstado = !$aula->disponible;
        $aula->update(['disponible' => $nuevoEstado]);

        $estadoTexto = $nuevoEstado ? 'disponible' : 'no disponible';

        Bitacora::registrar(
            'Cambio de disponibilidad de aula',
            "Aula: {$aula->edificio} - {$aula->numero}, Nuevo estado: {$estadoTexto}",
            'aulas',
            $aula->id
        );

        return response()->json([
            'success' => true,
            'data'    => $aula->fresh(),
            'message' => "Aula '{$aula->edificio} - {$aula->numero}' marcada como {$estadoTexto}.",
        ], 200);
    }
}
