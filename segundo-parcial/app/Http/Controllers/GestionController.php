<?php

namespace App\Http\Controllers;

use App\Models\Gestion;
use App\Models\Bitacora;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class GestionController extends Controller
{
    // index(): lista todas las gestiones ordenadas por año desc, numero desc
    public function index()
    {
        $gestiones = Gestion::orderBy('año', 'desc')
                            ->orderBy('numero', 'desc')
                            ->get();

        return response()->json([
            'success' => true,
            'data'    => $gestiones,
            'message' => 'Gestiones listadas correctamente'
        ], 200);
    }

    // store(): crea nueva gestión. Valida que no exista otra gestión activa antes de crear.
    // Si se crea una nueva, las demás pasan a "inactivo". Genera el codigo automáticamente.
    public function store(Request $request)
    {
        $validador = Validator::make($request->all(), [
            'año'          => 'required|integer|min:2020|max:2100',
            'numero'       => 'required|integer|in:1,2',
            'fecha_inicio' => 'required|date',
            'fecha_fin'    => 'required|date|after:fecha_inicio',
            'estado'       => 'nullable|string|in:activo,inactivo,cerrado',
        ]);

        if ($validador->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validador->errors()->first()
            ], 422);
        }

        $codigo = $request->numero . '-' . $request->año;

        // Validar que no exista otra gestión con el mismo código
        if (Gestion::where('codigo', $codigo)->exists()) {
            return response()->json([
                'success' => false,
                'message' => "La gestión con el código '$codigo' ya existe."
            ], 422);
        }

        $estado = $request->input('estado', 'activo');

        // Validar que no exista otra gestión activa antes de crear una activa
        if ($estado === 'activo' && Gestion::where('estado', 'activo')->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Ya existe una gestión activa en el sistema.'
            ], 422);
        }

        $gestion = DB::transaction(function () use ($request, $estado) {
            if ($estado === 'activo') {
                // Poner las demás gestiones en inactivo
                Gestion::where('estado', 'activo')->update(['estado' => 'inactivo']);
            }

            return Gestion::create([
                'año'          => $request->año,
                'numero'       => $request->numero,
                'fecha_inicio' => $request->fecha_inicio,
                'fecha_fin'    => $request->fecha_fin,
                'estado'       => $estado
            ]);
        });

        // Registrar en Bitácora
        Bitacora::registrar(
            'Creación de gestión académica',
            "Código: {$gestion->codigo}, Fechas: {$gestion->fecha_inicio} a {$gestion->fecha_fin}, Estado: {$gestion->estado}",
            'gestiones',
            $gestion->id
        );

        return response()->json([
            'success' => true,
            'data'    => $gestion,
            'message' => 'Gestión académica creada correctamente'
        ], 200);
    }

    // update($id): edita fechas y estado
    public function update(Request $request, $id)
    {
        $gestion = Gestion::find($id);
        if (!$gestion) {
            return response()->json([
                'success' => false,
                'message' => 'Gestión no encontrada'
            ], 404);
        }

        $validador = Validator::make($request->all(), [
            'fecha_inicio' => 'required|date',
            'fecha_fin'    => 'required|date|after:fecha_inicio',
            'estado'       => 'required|string|in:activo,inactivo,cerrado',
        ]);

        if ($validador->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validador->errors()->first()
            ], 422);
        }

        // Si se cambia a activo, validar que no exista otra activa
        if ($request->estado === 'activo' && $gestion->estado !== 'activo') {
            if (Gestion::where('estado', 'activo')->where('id', '!=', $id)->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ya existe otra gestión activa en el sistema.'
                ], 422);
            }
        }

        DB::transaction(function () use ($request, $gestion, $id) {
            if ($request->estado === 'activo' && $gestion->estado !== 'activo') {
                Gestion::where('estado', 'activo')->where('id', '!=', $id)->update(['estado' => 'inactivo']);
            }
            $gestion->update([
                'fecha_inicio' => $request->fecha_inicio,
                'fecha_fin'    => $request->fecha_fin,
                'estado'       => $request->estado,
            ]);
        });

        // Registrar en Bitácora
        Bitacora::registrar(
            'Modificación de gestión académica',
            "Código: {$gestion->codigo}, Nuevas Fechas: {$gestion->fecha_inicio} a {$gestion->fecha_fin}, Estado: {$gestion->estado}",
            'gestiones',
            $gestion->id
        );

        return response()->json([
            'success' => true,
            'data'    => $gestion,
            'message' => 'Gestión académica actualizada correctamente'
        ], 200);
    }

    // destroy($id): elimina solo si no tiene postulantes, grupos u otras entidades relacionadas vinculadas
    public function destroy($id)
    {
        $gestion = Gestion::find($id);
        if (!$gestion) {
            return response()->json([
                'success' => false,
                'message' => 'Gestión no encontrada'
            ], 404);
        }

        $tablasRelacionadas = [
            'postulantes'          => 'Postulantes',
            'grupos'               => 'Grupos',
            'cupos_carrera'        => 'Cupos de Carrera',
            'aulas'                => 'Aulas',
            'pagos_caja'           => 'Pagos en Caja',
            'postulantes_docentes' => 'Postulantes a Docentes',
            'docentes'             => 'Docentes',
            'horarios'             => 'Horarios'
        ];

        foreach ($tablasRelacionadas as $tabla => $nombreMostrar) {
            if (DB::table($tabla)->where('gestion_id', $id)->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => "No se puede eliminar la gestión porque tiene registros asociados en '$nombreMostrar'."
                ], 422);
            }
        }

        $gestion->delete();

        // Registrar en Bitácora
        Bitacora::registrar(
            'Eliminación de gestión académica',
            "Código: {$gestion->codigo}",
            'gestiones',
            $id
        );

        return response()->json([
            'success' => true,
            'data'    => null,
            'message' => 'Gestión académica eliminada correctamente'
        ], 200);
    }

    // activate($id): activa una gestión y desactiva las demás
    public function activate($id)
    {
        $gestion = Gestion::find($id);
        if (!$gestion) {
            return response()->json([
                'success' => false,
                'message' => 'Gestión no encontrada'
            ], 404);
        }

        DB::transaction(function () use ($id, $gestion) {
            // Desactivar las demás
            Gestion::where('id', '!=', $id)->where('estado', 'activo')->update(['estado' => 'inactivo']);
            
            // Activar la seleccionada
            $gestion->update(['estado' => 'activo']);
        });

        // Registrar en Bitácora
        Bitacora::registrar(
            'Activación de gestión académica',
            "Código: {$gestion->codigo}",
            'gestiones',
            $gestion->id
        );

        return response()->json([
            'success' => true,
            'data'    => $gestion,
            'message' => 'Gestión académica activada correctamente'
        ], 200);
    }
}
