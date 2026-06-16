<?php

namespace App\Http\Controllers;

use App\Models\Carrera;
use App\Models\CupoCarrera;
use App\Models\Gestion;
use App\Models\Bitacora;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class CarreraController extends Controller
{
    /**
     * index(): Lista todas las carreras con sus cupos de la gestión activa.
     * Retorna: id, nombre, modalidad, activo, cupo_maximo, cupos_ocupados (gestión activa).
     */
    public function index()
    {
        // Buscar la gestión activa para adjuntar sus cupos
        $gestionActiva = Gestion::where('estado', 'activo')->first();

        $carreras = Carrera::orderBy('nombre')->get()->map(function ($carrera) use ($gestionActiva) {
            $cupo = null;
            if ($gestionActiva) {
                $cupo = $carrera->cupos()->where('gestion_id', $gestionActiva->id)->first();
            }
            return [
                'id'             => $carrera->id,
                'nombre'         => $carrera->nombre,
                'modalidad'      => $carrera->modalidad,
                'activo'         => (bool) $carrera->activo,
                'cupo_maximo'    => $cupo ? (int) $cupo->cupo_maximo    : 0,
                'cupos_ocupados' => $cupo ? (int) $cupo->cupos_ocupados : 0,
            ];
        });

        return response()->json([
            'success' => true,
            'data'    => [
                'carreras'       => $carreras,
                'gestion_activa' => $gestionActiva,
            ],
            'message' => 'Carreras listadas correctamente',
        ], 200);
    }

    /**
     * store(): Crea una nueva carrera.
     * Valida nombre único y modalidad válida.
     * Al crear, genera automáticamente un registro en cupos_carrera
     * para la gestión activa con el cupo_maximo enviado (o 0 si no se envía).
     */
    public function store(Request $request)
    {
        $validador = Validator::make($request->all(), [
            'nombre'      => 'required|string|max:200|unique:carreras,nombre,NULL,id,modalidad,' . $request->modalidad,
            'modalidad'   => 'required|string|in:presencial,virtual',
            'activo'      => 'nullable|boolean',
            'cupo_maximo' => 'nullable|integer|min:0',
        ], [
            'nombre.unique'    => 'Ya existe una carrera con ese nombre.',
            'modalidad.in'     => 'La modalidad debe ser "presencial" o "virtual".',
            'nombre.required'  => 'El nombre de la carrera es obligatorio.',
            'cupo_maximo.min'  => 'El cupo máximo no puede ser negativo.',
        ]);

        if ($validador->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validador->errors()->first(),
            ], 422);
        }

        $carrera = DB::transaction(function () use ($request) {
            // Crear la carrera
            $carrera = Carrera::create([
                'nombre'    => trim($request->nombre),
                'modalidad' => $request->modalidad,
                'activo'    => $request->input('activo', true),
            ]);

            // Crear automáticamente el registro de cupos para la gestión activa
            $gestionActiva = Gestion::where('estado', 'activo')->first();
            if ($gestionActiva) {
                $cupoMax = (int) $request->input('cupo_maximo', 0);
                CupoCarrera::create([
                    'carrera_id'     => $carrera->id,
                    'gestion_id'     => $gestionActiva->id,
                    'cupo_maximo'    => $cupoMax,
                    'cupos_ocupados' => 0,
                ]);
            }

            return $carrera;
        });

        // Registrar acción en la bitácora del sistema
        Bitacora::registrar(
            'Creación de carrera',
            "Nombre: {$carrera->nombre}, Modalidad: {$carrera->modalidad}, Activo: " . ($carrera->activo ? 'Sí' : 'No'),
            'carreras',
            $carrera->id
        );

        return response()->json([
            'success' => true,
            'data'    => $carrera,
            'message' => "Carrera \"{$carrera->nombre}\" creada correctamente.",
        ], 200);
    }

    /**
     * update($id): Edita nombre, modalidad y estado activo de una carrera.
     * Si se envía cupo_maximo, también actualiza el cupo de la gestión activa.
     */
    public function update(Request $request, $id)
    {
        $carrera = Carrera::find($id);
        if (!$carrera) {
            return response()->json([
                'success' => false,
                'message' => 'Carrera no encontrada.',
            ], 404);
        }

        $validador = Validator::make($request->all(), [
            // Ignora el registro actual al validar unicidad del nombre
            'nombre'      => 'required|string|max:200|unique:carreras,nombre,' . $id . ',id,modalidad,' . $request->modalidad,
            'modalidad'   => 'required|string|in:presencial,virtual',
            'activo'      => 'required|boolean',
            'cupo_maximo' => 'nullable|integer|min:0',
        ], [
            'nombre.unique'   => 'Ya existe otra carrera con ese nombre.',
            'modalidad.in'    => 'La modalidad debe ser "presencial" o "virtual".',
            'nombre.required' => 'El nombre de la carrera es obligatorio.',
            'activo.required' => 'El estado activo es obligatorio.',
        ]);

        if ($validador->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validador->errors()->first(),
            ], 422);
        }

        DB::transaction(function () use ($request, $carrera) {
            // Actualizar datos principales de la carrera
            $carrera->update([
                'nombre'    => trim($request->nombre),
                'modalidad' => $request->modalidad,
                'activo'    => $request->activo,
            ]);

            // Si se envió cupo_maximo, actualizar el cupo de la gestión activa
            if ($request->has('cupo_maximo') && $request->cupo_maximo !== null) {
                $gestionActiva = Gestion::where('estado', 'activo')->first();
                if ($gestionActiva) {
                    CupoCarrera::updateOrCreate(
                        ['carrera_id' => $carrera->id, 'gestion_id' => $gestionActiva->id],
                        ['cupo_maximo' => (int) $request->cupo_maximo]
                    );
                }
            }
        });

        // Recargar el modelo con los datos actualizados
        $carrera->refresh();

        // Registrar acción en la bitácora del sistema
        Bitacora::registrar(
            'Modificación de carrera',
            "Nombre: {$carrera->nombre}, Modalidad: {$carrera->modalidad}, Activo: " . ($carrera->activo ? 'Sí' : 'No'),
            'carreras',
            $carrera->id
        );

        return response()->json([
            'success' => true,
            'data'    => $carrera,
            'message' => "Carrera \"{$carrera->nombre}\" actualizada correctamente.",
        ], 200);
    }

    /**
     * destroy($id): Elimina una carrera solo si no tiene postulantes asociados.
     * También elimina los cupos_carrera relacionados antes de eliminar la carrera.
     */
    public function destroy($id)
    {
        $carrera = Carrera::find($id);
        if (!$carrera) {
            return response()->json([
                'success' => false,
                'message' => 'Carrera no encontrada.',
            ], 404);
        }

        // Verificar si tiene postulantes asociados (como principal, secundaria o admitida)
        $tienePostulantes = DB::table('postulantes')
            ->where('carrera_principal_id', $id)
            ->orWhere('carrera_secundaria_id', $id)
            ->orWhere('carrera_admitida_id', $id)
            ->exists();

        if ($tienePostulantes) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede eliminar la carrera porque tiene postulantes asociados.',
            ], 422);
        }

        $nombreCarrera = $carrera->nombre;

        DB::transaction(function () use ($carrera, $id) {
            // Eliminar registros de cupos asociados antes de eliminar la carrera
            CupoCarrera::where('carrera_id', $id)->delete();
            $carrera->delete();
        });

        // Registrar acción en la bitácora del sistema
        Bitacora::registrar(
            'Eliminación de carrera',
            "Nombre: {$nombreCarrera}",
            'carreras',
            $id
        );

        return response()->json([
            'success' => true,
            'data'    => null,
            'message' => "Carrera \"{$nombreCarrera}\" eliminada correctamente.",
        ], 200);
    }

    /**
     * updateCupos($id): Actualiza el cupo_maximo de cupos_carrera para una gestión específica.
     * Si no se envía gestion_id, usa la gestión activa del sistema.
     */
    public function updateCupos(Request $request, $id)
    {
        $carrera = Carrera::find($id);
        if (!$carrera) {
            return response()->json([
                'success' => false,
                'message' => 'Carrera no encontrada.',
            ], 404);
        }

        $validador = Validator::make($request->all(), [
            'cupo_maximo' => 'required|integer|min:0',
            'gestion_id'  => 'nullable|integer|exists:gestiones,id',
        ], [
            'cupo_maximo.required' => 'El campo cupo_maximo es obligatorio.',
            'cupo_maximo.min'      => 'El cupo máximo no puede ser negativo.',
            'gestion_id.exists'    => 'La gestión especificada no existe.',
        ]);

        if ($validador->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validador->errors()->first(),
            ], 422);
        }

        // Determinar la gestión: usar la enviada o la gestión activa
        $gestionId = $request->gestion_id;
        if (!$gestionId) {
            $gestionActiva = Gestion::where('estado', 'activo')->first();
            if (!$gestionActiva) {
                return response()->json([
                    'success' => false,
                    'message' => 'No hay una gestión activa en el sistema y no se especificó gestion_id.',
                ], 422);
            }
            $gestionId = $gestionActiva->id;
        }

        // Actualizar o crear el registro de cupo
        $cupo = CupoCarrera::updateOrCreate(
            ['carrera_id' => $id, 'gestion_id' => $gestionId],
            ['cupo_maximo' => (int) $request->cupo_maximo]
        );

        // Registrar acción en la bitácora del sistema
        Bitacora::registrar(
            'Actualización de cupos de carrera',
            "Carrera: {$carrera->nombre}, Gestión ID: {$gestionId}, Nuevo Cupo Máximo: {$request->cupo_maximo}",
            'cupos_carrera',
            $cupo->id
        );

        return response()->json([
            'success' => true,
            'data'    => $cupo,
            'message' => "Cupos de la carrera \"{$carrera->nombre}\" actualizados correctamente.",
        ], 200);
    }
}
