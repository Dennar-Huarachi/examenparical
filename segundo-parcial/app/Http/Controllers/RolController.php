<?php

namespace App\Http\Controllers;

use App\Models\Rol;
use App\Models\Privilegio;
use App\Models\Bitacora;
use Illuminate\Http\Request;

class RolController extends Controller
{
    public function index()
    {
        $roles = Rol::with('privilegios')->orderBy('id', 'asc')->get()->map(function ($rol) {
            $privilegiosPorModulo = [];
            foreach ($rol->privilegios as $priv) {
                $modulo = $priv->modulo ?: 'general';
                if (!isset($privilegiosPorModulo[$modulo])) {
                    $privilegiosPorModulo[$modulo] = [];
                }
                $privilegiosPorModulo[$modulo][] = [
                    'id' => $priv->id,
                    'nombre' => $priv->nombre,
                    'descripcion' => $priv->descripcion,
                ];
            }

            return [
                'id' => $rol->id,
                'nombre' => $rol->nombre,
                'descripcion' => $rol->descripcion,
                'privilegios' => $privilegiosPorModulo,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $roles,
        ]);
    }

    public function show($id)
    {
        $rol = Rol::with('privilegios')->find($id);

        if (!$rol) {
            return response()->json([
                'success' => false,
                'message' => 'Rol no encontrado.',
            ], 404);
        }

        $todosPrivilegios = Privilegio::all()->map(function ($priv) use ($rol) {
            return [
                'id' => $priv->id,
                'nombre' => $priv->nombre,
                'descripcion' => $priv->descripcion,
                'modulo' => $priv->modulo,
                'activo' => $rol->privilegios->contains($priv->id),
            ];
        })->groupBy('modulo');

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $rol->id,
                'nombre' => $rol->nombre,
                'descripcion' => $rol->descripcion,
                'privilegios' => $todosPrivilegios,
            ],
        ]);
    }

    public function syncPrivilegios(Request $request, $id)
    {
        $rol = Rol::find($id);

        if (!$rol) {
            return response()->json([
                'success' => false,
                'message' => 'Rol no encontrado.',
            ], 404);
        }

        // No permitir modificar privilegios de coordinador ni autoridad
        if ($rol->esCoordinadorOAutoridad()) {
            return response()->json([
                'success' => false,
                'message' => 'No se pueden modificar los privilegios de ' . $rol->nombre . '. Tiene acceso total al sistema.',
            ], 403);
        }

        $request->validate([
            'privilegio_ids' => 'required|array',
            'privilegio_ids.*' => 'exists:privilegios,id',
        ]);

        $rol->privilegios()->sync($request->privilegio_ids);

        $privilegiosNombres = Privilegio::whereIn('id', $request->privilegio_ids)->pluck('nombre')->toArray();

        Bitacora::create([
            'usuario_id' => $request->user()->id,
            'accion' => 'ASIGNACION_PRIVILEGIOS',
            'tabla_afectada' => 'roles',
            'registro_id' => $rol->id,
            'detalle' => 'Rol: ' . $rol->nombre . ', Privilegios: [' . implode(', ', $privilegiosNombres) . ']',
            'ip' => $request->ip(),
        ]);

        $rol->load('privilegios');

        $privilegiosPorModulo = [];
        foreach ($rol->privilegios as $priv) {
            $modulo = $priv->modulo ?: 'general';
            if (!isset($privilegiosPorModulo[$modulo])) {
                $privilegiosPorModulo[$modulo] = [];
            }
            $privilegiosPorModulo[$modulo][] = [
                'id' => $priv->id,
                'nombre' => $priv->nombre,
                'descripcion' => $priv->descripcion,
            ];
        }

        return response()->json([
            'success' => true,
            'message' => 'Privilegios actualizados correctamente.',
            'data' => [
                'id' => $rol->id,
                'nombre' => $rol->nombre,
                'descripcion' => $rol->descripcion,
                'privilegios' => $privilegiosPorModulo,
            ],
        ]);
    }
}
