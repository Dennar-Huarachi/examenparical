<?php

namespace App\Http\Controllers;

use App\Models\Privilegio;
use App\Models\Rol;
use App\Models\Bitacora;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class PrivilegioController extends Controller
{
    public function index()
    {
        $privilegios = Privilegio::orderBy('modulo', 'asc')
            ->orderBy('nombre', 'asc')
            ->get()
            ->groupBy(function ($priv) {
                return $priv->modulo ?: 'general';
            });

        return response()->json([
            'success' => true,
            'data' => $privilegios,
        ]);
    }

    // show($rolId): Retorna todos los privilegios e indica con 'activo' (bool) si están asignados a este rol
    public function show($rolId)
    {
        $rol = Rol::find($rolId);
        if (!$rol) {
            return response()->json([
                'success' => false,
                'message' => 'Rol no encontrado'
            ], 404);
        }

        $assignedPrivilegeIds = DB::table('rol_privilegio')
            ->where('rol_id', $rolId)
            ->pluck('privilegio_id')
            ->toArray();

        $allPrivilegios = Privilegio::orderBy('modulo', 'asc')
            ->orderBy('nombre', 'asc')
            ->get()
            ->map(function ($p) use ($assignedPrivilegeIds) {
                return [
                    'id' => $p->id,
                    'nombre' => $p->nombre,
                    'descripcion' => $p->descripcion,
                    'modulo' => $p->modulo,
                    'activo' => in_array($p->id, $assignedPrivilegeIds)
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $allPrivilegios
        ]);
    }

    // store(): Guarda los privilegios para un rol
    public function store(Request $request)
    {
        $validador = Validator::make($request->all(), [
            'rol_id'           => 'required|integer|exists:roles,id',
            'privilegio_ids'   => 'present|array',
            'privilegio_ids.*' => 'integer|exists:privilegios,id'
        ]);

        if ($validador->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validador->errors()->first()
            ], 422);
        }

        $rolId = $request->rol_id;
        $privilegioIds = $request->privilegio_ids;
        $rol = Rol::find($rolId);

        // Evitar que el Administrador se desasigne privilegios esenciales
        if (strtolower($rol->nombre) === 'administrador') {
            $essentialPrivs = Privilegio::whereIn('nombre', ['usuarios.ver', 'dashboard.ver'])->pluck('id')->toArray();
            foreach ($essentialPrivs as $epId) {
                if (!in_array($epId, $privilegioIds)) {
                    $privilegioIds[] = $epId;
                }
            }
        }

        DB::transaction(function () use ($rolId, $privilegioIds) {
            // Eliminar asignaciones anteriores
            DB::table('rol_privilegio')->where('rol_id', $rolId)->delete();

            // Insertar nuevas asignaciones
            $inserts = [];
            foreach ($privilegioIds as $pid) {
                $inserts[] = [
                    'rol_id'         => $rolId,
                    'privilegio_id'  => $pid,
                    'created_at'     => now(),
                    'updated_at'     => now(),
                ];
            }
            if (count($inserts) > 0) {
                DB::table('rol_privilegio')->insert($inserts);
            }
        });

        // Registrar en Bitácora
        Bitacora::registrar(
            'Actualización de privilegios de rol',
            "Rol: {$rol->nombre}, Privilegios asignados: " . count($privilegioIds),
            'roles',
            $rol->id
        );

        return response()->json([
            'success' => true,
            'message' => 'Matriz de privilegios actualizada con éxito y aplicada inmediatamente.'
        ], 200);
    }
}
