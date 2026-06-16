<?php

namespace App\Http\Controllers;

use App\Models\Postulante;
use App\Models\Pago;
use App\Models\Gestion;
use App\Models\Rol;
use App\Models\User;
use App\Models\Bitacora;
use App\Models\NotaMateria;
use App\Models\Grupo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class PostulanteController extends Controller
{
    public function index(Request $request)
    {
        $gestionActiva = Gestion::where('estado', 'activo')->first();

        $query = Postulante::with([
            'carreraPrincipal',
            'carreraSecundaria',
            'carreraAdmitida',
            'pago',
            'usuario',
        ]);

        if ($request->filled('gestion_id')) {
            $query->where('gestion_id', $request->gestion_id);
        } elseif ($gestionActiva) {
            $query->where('gestion_id', $gestionActiva->id);
        }

        if ($request->filled('ci')) {
            $query->where('ci', 'LIKE', '%' . $request->ci . '%');
        }
        if ($request->filled('nombres')) {
            $query->where('nombres', 'LIKE', '%' . $request->nombres . '%');
        }
        if ($request->filled('apellidos')) {
            $query->where('apellidos', 'LIKE', '%' . $request->apellidos . '%');
        }
        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }
        if ($request->filled('carrera_principal_id')) {
            $query->where('carrera_principal_id', $request->carrera_principal_id);
        }
        if ($request->filled('turno_preferido')) {
            $query->where('turno_preferido', $request->turno_preferido);
        }
        if ($request->filled('busqueda')) {
            $busqueda = $request->busqueda;
            $query->where(function ($q) use ($busqueda) {
                $q->where('ci', 'LIKE', "%{$busqueda}%")
                  ->orWhere('nombres', 'LIKE', "%{$busqueda}%")
                  ->orWhere('apellidos', 'LIKE', "%{$busqueda}%")
                  ->orWhere('id_postulante', 'LIKE', "%{$busqueda}%");
            });
        }

        $perPage = $request->input('per_page', 20);
        $postulantes = $query->orderBy('id_postulante', 'asc')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $postulantes->items(),
            'meta' => [
                'total' => $postulantes->total(),
                'current_page' => $postulantes->currentPage(),
                'last_page' => $postulantes->lastPage(),
                'per_page' => $postulantes->perPage(),
            ],
            'message' => 'Listado de postulantes'
        ], 200);
    }

    public function show($id)
    {
        $postulante = Postulante::with([
            'carreraPrincipal',
            'carreraSecundaria',
            'carreraAdmitida',
            'pago',
            'gestion',
            'usuario',
            'documentos',
            'notasMateria.materia',
            'grupos.turno',
        ])->find($id);

        if (!$postulante) {
            return response()->json([
                'success' => false,
                'message' => 'Postulante no encontrado'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $postulante,
            'message' => 'Detalle del postulante'
        ], 200);
    }

    public function store(Request $request)
    {
        $validador = Validator::make($request->all(), [
            'pago_id'               => 'required|integer|exists:pagos_caja,id',
            'ci'                    => 'required|string|max:20',
            'nombres'               => 'required|string|max:100',
            'apellidos'             => 'required|string|max:100',
            'fecha_nacimiento'      => 'nullable|date',
            'sexo'                  => 'nullable|string|in:M,F',
            'direccion'             => 'nullable|string|max:255',
            'telefono'              => 'nullable|string|max:20',
            'correo'                => 'nullable|email|max:100',
            'colegio_procedencia'   => 'nullable|string|max:255',
            'ciudad'                => 'nullable|string|max:100',
            'carrera_principal_id'  => 'required|integer|exists:carreras,id',
            'carrera_secundaria_id' => 'required|integer|exists:carreras,id|different:carrera_principal_id',
            'titulo_bachiller'      => 'nullable|boolean',
            'año_bachillerato'      => 'nullable|integer|min:1950|max:2100',
            'turno_preferido'       => 'nullable|string|in:Mañana,Tarde,Noche',
            'otros'                 => 'nullable|string',
        ]);

        if ($validador->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validador->errors()->first()
            ], 422);
        }

        $pago = Pago::find($request->pago_id);
        if (!$pago || $pago->estado !== 'verificado') {
            return response()->json([
                'success' => false,
                'message' => 'El pago debe estar verificado para registrar un postulante'
            ], 422);
        }

        $postulanteConPago = Postulante::where('pago_id', $request->pago_id)->first();
        if ($postulanteConPago) {
            return response()->json([
                'success' => false,
                'message' => 'Este pago ya está asignado a otro postulante'
            ], 422);
        }

        $gestion = Gestion::where('estado', 'activo')->first();
        if (!$gestion) {
            return response()->json([
                'success' => false,
                'message' => 'No hay una gestión activa'
            ], 422);
        }

        $ciExiste = Postulante::where('ci', $request->ci)
            ->where('gestion_id', $gestion->id)
            ->exists();
        if ($ciExiste) {
            return response()->json([
                'success' => false,
                'message' => 'Ya existe un postulante con ese CI en la gestión activa'
            ], 422);
        }

        DB::beginTransaction();
        try {
            $rolPostulante = Rol::where('nombre', 'postulante')->first();
            if (!$rolPostulante) {
                $rolPostulante = Rol::create([
                    'nombre' => 'postulante',
                    'descripcion' => 'Postulante a la universidad'
                ]);
            }

            $usuario = null;
            if ($request->filled('correo')) {
                $usuario = User::where('email', $request->correo)->first();
                if (!$usuario) {
                    $usuario = User::create([
                        'nombre'   => $request->nombres,
                        'apellido' => $request->apellidos,
                        'email'    => $request->correo,
                        'password' => Hash::make($request->ci),
                        'rol_id'   => $rolPostulante->id,
                        'activo'   => true,
                    ]);
                }
            }

            $ultimoPostulante = Postulante::where('gestion_id', $gestion->id)
                ->where('id_postulante', 'LIKE', "POST-{$gestion->año}-%")
                ->orderBy('id_postulante', 'desc')
                ->first();

            if ($ultimoPostulante) {
                $partes = explode('-', $ultimoPostulante->id_postulante);
                $correlativo = (int) end($partes) + 1;
            } else {
                $correlativo = 1;
            }

            $idPostulante = sprintf("POST-%s-%04d", $gestion->año, $correlativo);

            $postulante = Postulante::create([
                'id_postulante'       => $idPostulante,
                'ci'                  => $request->ci,
                'nombres'             => $request->nombres,
                'apellidos'           => $request->apellidos,
                'fecha_nacimiento'    => $request->fecha_nacimiento,
                'sexo'                => $request->sexo,
                'direccion'           => $request->direccion,
                'telefono'            => $request->telefono,
                'correo'              => $request->correo,
                'colegio_procedencia' => $request->colegio_procedencia,
                'ciudad'              => $request->ciudad,
                'carrera_principal_id'=> $request->carrera_principal_id,
                'carrera_secundaria_id'=> $request->carrera_secundaria_id,
                'titulo_bachiller'    => $request->titulo_bachiller,
                'año_bachillerato'    => $request->año_bachillerato,
                'turno_preferido'     => $request->turno_preferido,
                'otros'               => $request->otros,
                'estado'              => 'inscrito',
                'pago_id'             => $request->pago_id,
                'gestion_id'          => $gestion->id,
                'usuario_id'          => $usuario?->id,
            ]);

            Bitacora::registrar(
                'Registro de postulante',
                "ID: {$idPostulante}, CI: {$request->ci}, Nombre: {$request->nombres} {$request->apellidos}",
                'postulantes',
                $postulante->id
            );

            DB::commit();

            $postulante->load(['carreraPrincipal', 'carreraSecundaria', 'pago', 'usuario']);

            return response()->json([
                'success' => true,
                'data' => $postulante,
                'message' => 'Postulante registrado correctamente'
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al registrar postulante: ' . $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $postulante = Postulante::find($id);
        if (!$postulante) {
            return response()->json([
                'success' => false,
                'message' => 'Postulante no encontrado'
            ], 404);
        }

        $validador = Validator::make($request->all(), [
            'nombres'               => 'required|string|max:100',
            'apellidos'             => 'required|string|max:100',
            'fecha_nacimiento'      => 'nullable|date',
            'sexo'                  => 'nullable|string|in:M,F',
            'direccion'             => 'nullable|string|max:255',
            'telefono'              => 'nullable|string|max:20',
            'correo'                => 'nullable|email|max:100',
            'colegio_procedencia'   => 'nullable|string|max:255',
            'ciudad'                => 'nullable|string|max:100',
            'carrera_principal_id'  => 'required|integer|exists:carreras,id',
            'carrera_secundaria_id' => 'required|integer|exists:carreras,id|different:carrera_principal_id',
            'titulo_bachiller'      => 'nullable|boolean',
            'año_bachillerato'      => 'nullable|integer|min:1950|max:2100',
            'turno_preferido'       => 'nullable|string|in:Mañana,Tarde,Noche',
            'otros'                 => 'nullable|string',
        ]);

        if ($validador->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validador->errors()->first()
            ], 422);
        }

        $camposModificados = [];
        $camposPermitidos = [
            'nombres', 'apellidos', 'fecha_nacimiento', 'sexo', 'direccion',
            'telefono', 'correo', 'colegio_procedencia', 'ciudad',
            'carrera_principal_id', 'carrera_secundaria_id',
            'titulo_bachiller', 'año_bachillerato', 'turno_preferido', 'otros'
        ];

        $data = [];
        foreach ($camposPermitidos as $campo) {
            if ($request->has($campo)) {
                $valorAnterior = $postulante->{$campo};
                $data[$campo] = $request->{$campo};
                if ((string) $valorAnterior !== (string) $request->{$campo}) {
                    $camposModificados[] = "{$campo}: '{$valorAnterior}' → '{$request->{$campo}}'";
                }
            }
        }

        $postulante->update($data);

        Bitacora::registrar(
            'Modificación de postulante',
            "ID: {$postulante->id_postulante}, CI: {$postulante->ci}. Campos: " . implode(' | ', $camposModificados),
            'postulantes',
            $postulante->id
        );

        $postulante->load(['carreraPrincipal', 'carreraSecundaria', 'pago', 'usuario']);

        return response()->json([
            'success' => true,
            'data' => $postulante,
            'message' => 'Datos del postulante actualizados correctamente'
        ], 200);
    }

    public function destroy($id)
    {
        $postulante = Postulante::find($id);
        if (!$postulante) {
            return response()->json([
                'success' => false,
                'message' => 'Postulante no encontrado'
            ], 404);
        }

        if (!in_array($postulante->estado, ['pendiente', 'inscrito'])) {
            return response()->json([
                'success' => false,
                'message' => 'Solo se pueden eliminar postulantes en estado pendiente o inscrito'
            ], 422);
        }

        $tieneNotas = NotaMateria::where('postulante_id', $id)->exists();
        if ($tieneNotas) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede eliminar el postulante porque tiene notas registradas'
            ], 422);
        }

        $enGrupo = DB::table('grupo_postulante')->where('postulante_id', $id)->exists();
        if ($enGrupo) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede eliminar el postulante porque está asignado a un grupo'
            ], 422);
        }

        DB::beginTransaction();
        try {
            $pagoId = $postulante->pago_id;
            $usuarioId = $postulante->usuario_id;

            $postulante->delete();

            if ($pagoId) {
                Pago::where('id', $pagoId)->update(['estado' => 'pendiente']);
            }

            if ($usuarioId) {
                $tieneOtrosRegistros = Postulante::where('usuario_id', $usuarioId)->exists();
                if (!$tieneOtrosRegistros) {
                    User::where('id', $usuarioId)->delete();
                }
            }

            Bitacora::registrar(
                'Eliminación de postulante',
                "ID: {$postulante->id_postulante}, CI: {$postulante->ci}, Nombre: {$postulante->nombres} {$postulante->apellidos}",
                'postulantes',
                $id
            );

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Postulante eliminado correctamente'
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar postulante: ' . $e->getMessage()
            ], 500);
        }
    }
}
