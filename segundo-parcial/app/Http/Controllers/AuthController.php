<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Bitacora;
use App\Models\SesionBitacora;
use App\Models\TokenRecuperacion;
use App\Mail\RecuperacionPasswordMail;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::with('rol.privilegios')->where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Credenciales incorrectas.'], 401);
        }

        if (!$user->activo) {
            return response()->json(['message' => 'Usuario inactivo. Contacte al administrador.'], 403);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        $rol = $user->rol;
        $privilegios = $rol ? $rol->privilegios->pluck('nombre')->toArray() : [];

        $sesion = SesionBitacora::create([
            'usuario_id' => $user->id,
            'inicio' => now(),
            'ip' => $request->ip(),
        ]);

        Bitacora::create([
            'usuario_id' => $user->id,
            'accion' => 'LOGIN',
            'tabla_afectada' => 'usuarios',
            'registro_id' => $user->id,
            'sesion_id' => $sesion->id,
            'detalle' => 'Inicio de sesi\u00f3n exitoso',
            'ip' => $request->ip(),
        ]);

        $user->ultimo_acceso = now();
        $user->save();

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'sesion_id' => $sesion->id,
            'user' => [
                'id' => $user->id,
                'nombre' => $user->nombre,
                'apellido' => $user->apellido,
                'email' => $user->email,
                'rol' => $rol ? $rol->nombre : null,
                'privilegios' => $privilegios,
            ]
        ]);
    }

    public function logout(Request $request)
    {
        $user = $request->user();
        $sesionId = $request->input('sesion_id') ?? $request->header('X-Sesion-Id');

        if ($sesionId) {
            $sesion = SesionBitacora::find($sesionId);
            if ($sesion && $sesion->usuario_id === $user->id) {
                $sesion->cierre = now();
                $sesion->duracion = $sesion->inicio ? (int) $sesion->inicio->diffInMinutes(now()) : null;
                $sesion->save();
            }
        }

        Bitacora::create([
            'usuario_id' => $user->id,
            'accion' => 'LOGOUT',
            'tabla_afectada' => 'sesiones_bitacora',
            'sesion_id' => $sesionId,
            'detalle' => 'Cierre de sesi\u00f3n',
            'ip' => $request->ip(),
        ]);

        $user->currentAccessToken()->delete();

        return response()->json(['success' => true, 'message' => 'Sesi\u00f3n cerrada correctamente']);
    }

    public function recuperarPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $usuario = User::where('email', $request->email)->first();

        if (!$usuario) {
            return response()->json([
                'success' => true,
                'message' => 'Si el correo existe en el sistema, recibir\u00e1s un email con instrucciones.'
            ]);
        }

        $token = Str::random(64);

        TokenRecuperacion::create([
            'usuario_id' => $usuario->id,
            'token' => $token,
            'expira_at' => now()->addMinutes(60),
            'usado' => false,
        ]);

        $link = 'http://localhost:5173/reset-password?token=' . $token . '&email=' . urlencode($usuario->email);

        Mail::to($usuario->email)->send(new RecuperacionPasswordMail($usuario, $link));

        Bitacora::create([
            'usuario_id' => $usuario->id,
            'accion' => 'RECUPERACION_PASSWORD',
            'tabla_afectada' => 'usuarios',
            'detalle' => 'Solicitud de recuperaci\u00f3n de contrase\u00f1a',
            'ip' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Si el correo existe en el sistema, recibir\u00e1s un email con instrucciones.'
        ]);
    }

    public function resetPassword(Request $request)
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => 'required|min:8|confirmed',
        ]);

        $tokenRec = TokenRecuperacion::where('token', $request->token)
            ->where('usado', false)
            ->where('expira_at', '>', now())
            ->first();

        if (!$tokenRec) {
            return response()->json([
                'success' => false,
                'message' => 'El link de recuperaci\u00f3n es inv\u00e1lido o ha expirado.'
            ], 422);
        }

        $usuario = User::where('email', $request->email)->first();

        if (!$usuario || $usuario->id !== $tokenRec->usuario_id) {
            return response()->json([
                'success' => false,
                'message' => 'El link de recuperaci\u00f3n es inv\u00e1lido o ha expirado.'
            ], 422);
        }

        $usuario->password = Hash::make($request->password);
        $usuario->save();

        $tokenRec->usado = true;
        $tokenRec->save();

        $usuario->tokens()->delete();

        Bitacora::create([
            'usuario_id' => $usuario->id,
            'accion' => 'RESET_PASSWORD',
            'tabla_afectada' => 'usuarios',
            'detalle' => 'Contrase\u00f1a restablecida via email',
            'ip' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Contrase\u00f1a actualizada correctamente. Ya puedes iniciar sesi\u00f3n.'
        ]);
    }

    public function cambiarPassword(Request $request)
    {
        $request->validate([
            'password_actual' => 'required',
            'password_nuevo' => 'required|min:8',
            'password_confirmacion' => 'required|same:password_nuevo',
        ]);

        $usuario = $request->user();

        if (!Hash::check($request->password_actual, $usuario->password)) {
            return response()->json([
                'success' => false,
                'message' => 'La contrase\u00f1a actual es incorrecta.'
            ], 422);
        }

        if ($request->password_nuevo === $request->password_actual) {
            return response()->json([
                'success' => false,
                'message' => 'La nueva contrase\u00f1a debe ser diferente a la actual.'
            ], 422);
        }

        $usuario->password = Hash::make($request->password_nuevo);
        $usuario->save();

        $sesionId = $request->header('X-Sesion-Id');

        Bitacora::create([
            'usuario_id' => $usuario->id,
            'accion' => 'CAMBIO_PASSWORD',
            'tabla_afectada' => 'usuarios',
            'sesion_id' => $sesionId,
            'detalle' => 'Cambio de contrase\u00f1a desde el sistema',
            'ip' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Contrase\u00f1a cambiada correctamente.'
        ]);
    }
}
