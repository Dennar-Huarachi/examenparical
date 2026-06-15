<?php

namespace App\Http\Controllers;

use App\Models\Bitacora;
use App\Models\SesionBitacora;
use App\Models\User;
use App\Exports\BitacoraExport;
use App\Helpers\BitacoraHelper;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BitacoraController extends Controller
{
    private function verificarAcceso()
    {
        $user = request()->user();
        if (!$user || !$user->rol || !in_array(strtolower($user->rol->nombre), ['autoridad', 'administrador'])) {
            abort(403, 'Acceso denegado. Solo la autoridad o administrador puede consultar la bitácora.');
        }
    }

    public function index(Request $request)
    {
        $this->verificarAcceso();

        $query = SesionBitacora::with(['usuario.rol']);

        if ($request->filled('fecha_inicio')) {
            $query->whereDate('inicio', '>=', $request->fecha_inicio);
        }
        if ($request->filled('fecha_fin')) {
            $query->whereDate('inicio', '<=', $request->fecha_fin);
        }
        if ($request->filled('usuario_id')) {
            $query->where('usuario_id', $request->usuario_id);
        }
        if ($request->filled('rol_id')) {
            $query->whereHas('usuario', function ($q) use ($request) {
                $q->where('rol_id', $request->rol_id);
            });
        }

        $sesiones = $query->withCount('acciones')
            ->orderBy('inicio', 'desc')
            ->paginate(20);

        $data = $sesiones->map(function ($s) {
            return [
                'id' => $s->id,
                'usuario' => $s->usuario ? [
                    'id' => $s->usuario->id,
                    'nombre' => $s->usuario->nombre,
                    'apellido' => $s->usuario->apellido,
                    'nombre_completo' => $s->usuario->name,
                    'email' => $s->usuario->email,
                    'rol' => $s->usuario->rol?->nombre,
                    'rol_id' => $s->usuario->rol_id,
                ] : null,
                'inicio' => $s->inicio ? $s->inicio->format('Y-m-d H:i:s') : null,
                'cierre' => $s->cierre ? $s->cierre->format('Y-m-d H:i:s') : null,
                'duracion' => $s->duracion,
                'ip' => $s->ip,
                'acciones_count' => (int) $s->acciones_count,
            ];
        });

        BitacoraHelper::registrar(
            'CONSULTA_BITACORA',
            'sesiones_bitacora',
            null,
            'Consulta de sesiones de bitácora',
            $request
        );

        return response()->json([
            'success' => true,
            'data' => $data,
            'meta' => [
                'total' => $sesiones->total(),
                'por_pagina' => $sesiones->perPage(),
                'pagina_actual' => $sesiones->currentPage(),
                'ultima_pagina' => $sesiones->lastPage(),
            ],
        ], 200);
    }

    public function acciones($sesionId)
    {
        $this->verificarAcceso();

        $acciones = Bitacora::where('sesion_id', $sesionId)
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function ($b) {
                return [
                    'id' => $b->id,
                    'accion' => $b->accion,
                    'tabla_afectada' => $b->tabla_afectada,
                    'registro_id' => $b->registro_id,
                    'detalle' => $b->detalle,
                    'ip' => $b->ip,
                    'fecha' => $b->created_at ? $b->created_at->format('Y-m-d H:i:s') : null,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $acciones,
        ], 200);
    }

    public function estadisticas(Request $request)
    {
        $this->verificarAcceso();

        $totalSesionesHoy = SesionBitacora::whereDate('inicio', today())->count();
        $sesionesActivas = SesionBitacora::whereNull('cierre')->count();
        $usuariosDistintosHoy = SesionBitacora::whereDate('inicio', today())
            ->distinct('usuario_id')
            ->count('usuario_id');

        return response()->json([
            'success' => true,
            'data' => [
                'sesiones_hoy' => $totalSesionesHoy,
                'sesiones_activas' => $sesionesActivas,
                'usuarios_distintos_hoy' => $usuariosDistintosHoy,
            ],
        ], 200);
    }
}
