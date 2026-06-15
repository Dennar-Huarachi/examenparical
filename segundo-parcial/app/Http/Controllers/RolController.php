<?php

namespace App\Http\Controllers;

use App\Models\Rol;
use App\Models\Bitacora;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class RolController extends Controller
{
    public function index()
    {
        $roles = Rol::orderBy('id', 'asc')->get();
        return response()->json([
            'success' => true,
            'data' => $roles
        ]);
    }

    public function store(Request $request)
    {
        $validador = Validator::make($request->all(), [
            'nombre' => 'required|string|max:50|unique:roles,nombre',
            'descripcion' => 'nullable|string|max:255',
        ]);

        if ($validador->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validador->errors()->first()
            ], 422);
        }

        $rol = Rol::create([
            'nombre' => $request->nombre,
            'descripcion' => $request->descripcion,
        ]);

        // Registrar en Bitácora
        Bitacora::registrar('Creación de rol', 'Nombre: ' . $rol->nombre . ', Descripción: ' . $rol->descripcion, 'roles', $rol->id);

        return response()->json([
            'success' => true,
            'data' => $rol,
            'message' => 'Rol creado correctamente'
        ]);
    }

    public function update(Request $request, $id)
    {
        $rol = Rol::find($id);

        if (!$rol) {
            return response()->json([
                'success' => false,
                'message' => 'Rol no encontrado'
            ], 404);
        }

        $validador = Validator::make($request->all(), [
            'nombre' => 'required|string|max:50|unique:roles,nombre,' . $id,
            'descripcion' => 'nullable|string|max:255',
        ]);

        if ($validador->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validador->errors()->first()
            ], 422);
        }

        // Protección de roles del sistema
        $protectedRoles = ['Administrador', 'Docente', 'Coordinador', 'Autoridad'];
        if (in_array($rol->nombre, $protectedRoles) && $request->nombre !== $rol->nombre) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede cambiar el nombre de un rol protegido del sistema.'
            ], 403);
        }

        $nombreViejo = $rol->nombre;
        $rol->update($request->all());

        // Registrar en Bitácora
        Bitacora::registrar('Modificación de rol', 'De: ' . $nombreViejo . ' a: ' . $rol->nombre, 'roles', $rol->id);

        return response()->json([
            'success' => true,
            'data' => $rol,
            'message' => 'Rol modificado correctamente'
        ]);
    }

    public function destroy($id)
    {
        $rol = Rol::find($id);

        if (!$rol) {
            return response()->json([
                'success' => false,
                'message' => 'Rol no encontrado'
            ], 404);
        }

        // Protección contra la eliminación de roles del sistema
        $protectedRoles = ['Administrador', 'Docente', 'Coordinador', 'Autoridad'];
        if (in_array($rol->nombre, $protectedRoles)) {
            return response()->json([
                'success' => false,
                'message' => 'No se pueden eliminar los roles predeterminados del sistema.'
            ], 403);
        }

        $nombre = $rol->nombre;
        $rol->delete();

        // Registrar en Bitácora
        Bitacora::registrar('Eliminación de rol', 'Nombre: ' . $nombre, 'roles', $id);

        return response()->json([
            'success' => true,
            'message' => 'Rol eliminado correctamente'
        ]);
    }
}
