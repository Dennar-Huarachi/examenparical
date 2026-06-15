<?php

namespace App\Http\Controllers;

use App\Models\Rol;
use App\Models\Privilegio;
use App\Models\Bitacora;
use Illuminate\Http\Request;

class PrivilegioController extends Controller
{
    public function show($rolId)
    {
        $rol = Rol::find($rolId);

        if (!$rol) {
            return response()->json([
                'success' => false,
                'message' => 'Rol no encontrado'
            ], 404);
        }

        $activePrivilegeIds = $rol->privilegios->pluck('id')->toArray();
        $allPrivileges = Privilegio::all()->map(function ($priv) use ($activePrivilegeIds) {
            return [
                'id' => $priv->id,
                'nombre' => $priv->nombre,
                'descripcion' => $priv->descripcion,
                'activo' => in_array($priv->id, $activePrivilegeIds),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $allPrivileges
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'rol_id' => 'required|exists:roles,id',
            'privilegio_ids' => 'present|array',
            'privilegio_ids.*' => 'exists:privilegios,id',
        ]);

        $rol = Rol::findOrFail($request->rol_id);

        // Protección de privilegios del rol Administrador y Autoridad
        if (in_array($rol->nombre, ['Administrador', 'Autoridad'])) {
            return response()->json([
                'success' => false,
                'message' => 'No se pueden modificar los privilegios de ' . $rol->nombre . '.'
            ], 403);
        }

        $rol->privilegios()->sync($request->privilegio_ids);

        // Registrar en Bitácora
        $privilegiosNombres = Privilegio::whereIn('id', $request->privilegio_ids)->pluck('nombre')->toArray();
        Bitacora::registrar(
            'Asignación de privilegios', 
            'Rol: ' . $rol->nombre . ', Privilegios: [' . implode(', ', $privilegiosNombres) . ']',
            'roles',
            $rol->id
        );

        return response()->json([
            'success' => true,
            'message' => 'Privilegios actualizados con éxito'
        ]);
    }
}
