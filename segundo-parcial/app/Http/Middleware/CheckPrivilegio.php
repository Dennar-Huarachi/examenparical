<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPrivilegio
{
    public function handle(Request $request, Closure $next, string $privilegio): Response
    {
        $usuario = $request->user();

        if (!$usuario) {
            return response()->json(['error' => 'No autenticado'], 401);
        }

        if ($usuario->esCoordinadorOAutoridad()) {
            return $next($request);
        }

        if (!$usuario->hasPrivilegio($privilegio)) {
            return response()->json([
                'error' => 'No tienes permiso para realizar esta acción',
                'privilegio_requerido' => $privilegio,
            ], 403);
        }

        return $next($request);
    }
}
