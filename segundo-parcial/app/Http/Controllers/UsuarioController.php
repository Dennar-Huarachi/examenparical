<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Rol;
use App\Models\Bitacora;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class UsuarioController extends Controller
{
    public function index(Request $request)
    {
        $query = User::with('rol');

        if ($request->filled('rol_id')) {
            $query->where('rol_id', $request->rol_id);
        }

        if ($request->has('activo')) {
            $query->where('activo', $request->boolean('activo'));
        }

        $usuarios = $query->orderBy('nombre')->orderBy('apellido')->get();

        return response()->json([
            'success' => true,
            'data'    => $usuarios,
            'message' => 'Usuarios listados correctamente.',
        ], 200);
    }

    public function store(Request $request)
    {
        $validador = Validator::make($request->all(), [
            'nombre'   => 'required|string|max:100',
            'apellido' => 'required|string|max:100',
            'email'    => 'required|email|max:150|unique:usuarios,email',
            'password' => 'required|string|min:8',
            'rol_id'   => 'required|integer|exists:roles,id',
        ], [
            'nombre.required'   => 'El nombre es obligatorio.',
            'apellido.required' => 'El apellido es obligatorio.',
            'email.required'    => 'El email es obligatorio.',
            'email.unique'      => 'El email ya está registrado.',
            'password.required' => 'La contraseña es obligatoria.',
            'password.min'      => 'La contraseña debe tener al menos 8 caracteres.',
            'rol_id.required'   => 'El rol es obligatorio.',
        ]);

        if ($validador->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validador->errors()->first(),
            ], 422);
        }

        $rol = Rol::find($request->rol_id);
        if (!$rol || !in_array($rol->nombre, ['coordinador', 'autoridad'])) {
            return response()->json([
                'success' => false,
                'message' => 'Solo se permiten roles de Coordinador o Autoridad para registro manual.',
            ], 422);
        }

        $usuario = User::create([
            'nombre'   => trim($request->nombre),
            'apellido' => trim($request->apellido),
            'email'    => trim($request->email),
            'password' => Hash::make($request->password),
            'rol_id'   => $request->rol_id,
            'activo'   => true,
        ]);

        Bitacora::registrar(
            'Creación de usuario',
            "Email: {$usuario->email}, Rol: {$rol->nombre}",
            'usuarios',
            $usuario->id
        );

        return response()->json([
            'success' => true,
            'data'    => $usuario->load('rol'),
            'message' => "Usuario '{$usuario->nombre} {$usuario->apellido}' creado correctamente.",
        ], 200);
    }

    public function update(Request $request, $id)
    {
        $usuario = User::find($id);
        if (!$usuario) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario no encontrado.',
            ], 404);
        }

        $validador = Validator::make($request->all(), [
            'nombre'   => 'required|string|max:100',
            'apellido' => 'required|string|max:100',
            'email'    => 'required|email|max:150|unique:usuarios,email,' . $id,
            'rol_id'   => 'required|integer|exists:roles,id',
            'activo'   => 'nullable|boolean',
        ], [
            'nombre.required'   => 'El nombre es obligatorio.',
            'apellido.required' => 'El apellido es obligatorio.',
            'email.required'    => 'El email es obligatorio.',
            'email.unique'      => 'El email ya está registrado.',
            'rol_id.required'   => 'El rol es obligatorio.',
        ]);

        if ($validador->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validador->errors()->first(),
            ], 422);
        }

        $usuario->update([
            'nombre'   => trim($request->nombre),
            'apellido' => trim($request->apellido),
            'email'    => trim($request->email),
            'rol_id'   => $request->rol_id,
            'activo'   => $request->boolean('activo', $usuario->activo),
        ]);

        Bitacora::registrar(
            'Modificación de usuario',
            "Email: {$usuario->email}, Activo: " . ($usuario->activo ? 'Sí' : 'No'),
            'usuarios',
            $usuario->id
        );

        return response()->json([
            'success' => true,
            'data'    => $usuario->fresh()->load('rol'),
            'message' => "Usuario '{$usuario->nombre} {$usuario->apellido}' actualizado correctamente.",
        ], 200);
    }

    public function destroy($id)
    {
        $usuario = User::find($id);
        if (!$usuario) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario no encontrado.',
            ], 404);
        }

        $authUser = auth('sanctum')->user();
        if ($authUser && $authUser->id === (int) $id) {
            return response()->json([
                'success' => false,
                'message' => 'No puedes eliminar tu propio usuario.',
            ], 422);
        }

        $tienePostulantes = DB::table('postulantes')->where('usuario_id', $id)->exists();
        $tieneBitacoras = DB::table('bitacoras')->where('usuario_id', $id)->exists();
        $tieneDocentes = DB::table('postulantes_docentes')->where('usuario_id', $id)->exists();

        if ($tienePostulantes || $tieneBitacoras || $tieneDocentes) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede eliminar el usuario porque tiene registros relacionados (postulantes, bitácoras, etc.).',
            ], 422);
        }

        $nombre = $usuario->nombre . ' ' . $usuario->apellido;
        $usuario->delete();

        Bitacora::registrar(
            'Eliminación de usuario',
            "Usuario: {$nombre}, Email: {$usuario->email}",
            'usuarios',
            $id
        );

        return response()->json([
            'success' => true,
            'data'    => null,
            'message' => "Usuario '{$nombre}' eliminado correctamente.",
        ], 200);
    }

    public function resetPassword($id)
    {
        $usuario = User::find($id);
        if (!$usuario) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario no encontrado.',
            ], 404);
        }

        $nuevaPassword = Str::random(8);

        $usuario->update([
            'password' => Hash::make($nuevaPassword),
        ]);

        Bitacora::registrar(
            'Reseteo de contraseña',
            "Usuario: {$usuario->nombre} {$usuario->apellido}, Email: {$usuario->email}",
            'usuarios',
            $usuario->id
        );

        return response()->json([
            'success' => true,
            'data'    => [
                'id'           => $usuario->id,
                'nombre'       => $usuario->nombre . ' ' . $usuario->apellido,
                'nueva_password' => $nuevaPassword,
            ],
            'message' => "Contraseña de '{$usuario->nombre} {$usuario->apellido}' restablecida correctamente.",
        ], 200);
    }
}
