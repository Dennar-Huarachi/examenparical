<?php

namespace App\Http\Controllers;

use App\Models\Materia;
use App\Models\Bitacora;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class MateriaController extends Controller
{
    /**
     * Materias por defecto del sistema CUP.
     * Usadas para poblar la tabla cuando está vacía.
     */
    private const MATERIAS_DEFAULT = [
        ['nombre' => 'Matemáticas', 'peso' => 35],
        ['nombre' => 'Física',      'peso' => 35],
        ['nombre' => 'Inglés',      'peso' => 15],
        ['nombre' => 'Computación', 'peso' => 15],
    ];

    /**
     * index(): Lista todas las materias ordenadas por peso desc.
     * Incluye en la respuesta el total actual de pesos sumados.
     */
    public function index()
    {
        $materias     = Materia::orderBy('peso', 'desc')->orderBy('nombre')->get();
        $totalPesos   = $materias->sum('peso');
        $balanceado   = $totalPesos === 100;

        return response()->json([
            'success' => true,
            'data'    => [
                'materias'   => $materias,
                'total_peso' => $totalPesos,
                'balanceado' => $balanceado,
            ],
            'message' => 'Materias listadas correctamente.',
        ], 200);
    }

    /**
     * store(): Crea una nueva materia.
     * Valida que el nombre sea único.
     * Valida que el nuevo peso no haga que la suma total supere 100.
     */
    public function store(Request $request)
    {
        $validador = Validator::make($request->all(), [
            'nombre' => 'required|string|max:100|unique:materias,nombre',
            'peso'   => 'required|integer|min:1|max:100',
        ], [
            'nombre.required' => 'El nombre de la materia es obligatorio.',
            'nombre.unique'   => 'Ya existe una materia con ese nombre.',
            'peso.required'   => 'El peso de la materia es obligatorio.',
            'peso.min'        => 'El peso mínimo es 1.',
            'peso.max'        => 'El peso máximo por materia es 100.',
        ]);

        if ($validador->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validador->errors()->first(),
            ], 422);
        }

        // Calcular la suma actual de pesos de todas las materias existentes
        $sumaPesos  = (int) Materia::sum('peso');
        $nuevoPeso  = (int) $request->peso;
        $sumaTotal  = $sumaPesos + $nuevoPeso;

        if ($sumaTotal > 100) {
            return response()->json([
                'success' => false,
                'message' => "El peso ingresado ({$nuevoPeso}%) haría que la suma total llegue a {$sumaTotal}%, superando el límite de 100%. Actualmente hay {$sumaPesos}% asignados, disponibles: " . (100 - $sumaPesos) . "%.",
            ], 422);
        }

        $materia = Materia::create([
            'nombre' => trim($request->nombre),
            'peso'   => $nuevoPeso,
        ]);

        // Advertir si la suma no es exactamente 100 tras insertar
        $advertencia = null;
        if ($sumaTotal !== 100) {
            $advertencia = "La suma total de pesos ahora es {$sumaTotal}%. Recuerda ajustar los pesos para que sumen exactamente 100% y garantizar el cálculo correcto de la nota final.";
        }

        // Registrar en la bitácora del sistema
        Bitacora::registrar(
            'Creación de materia',
            "Nombre: {$materia->nombre}, Peso: {$materia->peso}%",
            'materias',
            $materia->id
        );

        return response()->json([
            'success'     => true,
            'data'        => $materia,
            'message'     => "Materia \"{$materia->nombre}\" creada correctamente.",
            'advertencia' => $advertencia,
        ], 200);
    }

    /**
     * update($id): Edita nombre y peso de una materia.
     * Valida que la suma total (reemplazando el peso anterior) no supere ni sea menor a 100.
     */
    public function update(Request $request, $id)
    {
        $materia = Materia::find($id);
        if (!$materia) {
            return response()->json([
                'success' => false,
                'message' => 'Materia no encontrada.',
            ], 404);
        }

        $validador = Validator::make($request->all(), [
            'nombre' => 'required|string|max:100|unique:materias,nombre,' . $id,
            'peso'   => 'required|integer|min:1|max:100',
        ], [
            'nombre.required' => 'El nombre de la materia es obligatorio.',
            'nombre.unique'   => 'Ya existe otra materia con ese nombre.',
            'peso.required'   => 'El peso de la materia es obligatorio.',
            'peso.min'        => 'El peso mínimo es 1.',
        ]);

        if ($validador->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validador->errors()->first(),
            ], 422);
        }

        $nuevoPeso  = (int) $request->peso;
        $pesoActual = (int) $materia->peso;

        // Calcular la suma de las otras materias (sin incluir la que editamos)
        $sumaOtros = (int) Materia::where('id', '!=', $id)->sum('peso');
        $sumaTotal = $sumaOtros + $nuevoPeso;

        // Generar advertencia si no queda en 100
        $advertencia = null;
        if ($sumaTotal !== 100) {
            $advertencia = "La suma total de pesos quedará en {$sumaTotal}% tras este cambio. Los pesos deben sumar exactamente 100% para el cálculo correcto de la nota final ponderada.";
        }

        $materia->update([
            'nombre' => trim($request->nombre),
            'peso'   => $nuevoPeso,
        ]);

        // Registrar en la bitácora del sistema
        Bitacora::registrar(
            'Modificación de materia',
            "Nombre: {$materia->nombre}, Peso anterior: {$pesoActual}%, Nuevo peso: {$nuevoPeso}%",
            'materias',
            $materia->id
        );

        return response()->json([
            'success'     => true,
            'data'        => $materia->fresh(),
            'message'     => "Materia \"{$materia->nombre}\" actualizada correctamente.",
            'advertencia' => $advertencia,
        ], 200);
    }

    /**
     * destroy($id): Elimina una materia solo si no tiene notas asociadas.
     * Los pesos quedarán desbalanceados: se advierte en la respuesta.
     */
    public function destroy($id)
    {
        $materia = Materia::find($id);
        if (!$materia) {
            return response()->json([
                'success' => false,
                'message' => 'Materia no encontrada.',
            ], 404);
        }

        // Verificar si la materia tiene notas asociadas (tabla notas o notas_materia)
        $tieneNotas = DB::table('notas')->whereExists(function ($query) use ($id) {
            $query->select(DB::raw(1))
                  ->from('examenes')
                  ->whereColumn('notas.examen_id', 'examenes.id')
                  ->where('examenes.materia_id', $id);
        })->exists();

        // También verificar en notas_materia si esa tabla existe
        $tieneNotasMateria = false;
        if (DB::getSchemaBuilder()->hasTable('notas_materia')) {
            $tieneNotasMateria = DB::table('notas_materia')->where('materia_id', $id)->exists();
        }

        if ($tieneNotas || $tieneNotasMateria) {
            return response()->json([
                'success' => false,
                'message' => "No se puede eliminar la materia \"{$materia->nombre}\" porque tiene notas de postulantes asociadas.",
            ], 422);
        }

        $nombreMateria = $materia->nombre;
        $pesoMateria   = $materia->peso;

        $materia->delete();

        // Calcular nueva suma tras eliminar
        $nuevaSuma = (int) Materia::sum('peso');

        // Registrar en la bitácora del sistema
        Bitacora::registrar(
            'Eliminación de materia',
            "Nombre: {$nombreMateria}, Peso: {$pesoMateria}%",
            'materias',
            $id
        );

        return response()->json([
            'success'     => true,
            'data'        => null,
            'message'     => "Materia \"{$nombreMateria}\" eliminada correctamente.",
            'advertencia' => "Los pesos han quedado desbalanceados. La suma total ahora es {$nuevaSuma}%. Ajusta los pesos restantes para que sumen 100%.",
        ], 200);
    }

    /**
     * reordenar(): Recibe array de {id, peso} y actualiza todos los pesos en una transacción.
     * Valida que la suma de los pesos recibidos sea exactamente 100.
     */
    public function reordenar(Request $request)
    {
        $validador = Validator::make($request->all(), [
            'pesos'         => 'required|array|min:1',
            'pesos.*.id'    => 'required|integer|exists:materias,id',
            'pesos.*.peso'  => 'required|integer|min:1|max:100',
        ], [
            'pesos.required'      => 'Se requiere el array de pesos.',
            'pesos.*.id.exists'   => 'Una de las materias no existe en el sistema.',
            'pesos.*.peso.min'    => 'Cada peso debe ser mínimo 1.',
            'pesos.*.peso.max'    => 'Cada peso no puede superar 100.',
        ]);

        if ($validador->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validador->errors()->first(),
            ], 422);
        }

        // Verificar que los pesos recibidos sumen exactamente 100
        $sumaTotal = array_sum(array_column($request->pesos, 'peso'));
        if ($sumaTotal !== 100) {
            return response()->json([
                'success' => false,
                'message' => "Los pesos deben sumar exactamente 100%. La suma actual de los valores recibidos es {$sumaTotal}%.",
            ], 422);
        }

        // Aplicar todos los cambios en una sola transacción
        DB::transaction(function () use ($request) {
            foreach ($request->pesos as $item) {
                Materia::where('id', $item['id'])->update(['peso' => (int) $item['peso']]);
            }
        });

        // Registrar en la bitácora del sistema
        Bitacora::registrar(
            'Rebalanceo de pesos de materias',
            'Todos los pesos fueron actualizados para sumar 100%.',
            'materias',
            null
        );

        $materias = Materia::orderBy('peso', 'desc')->get();

        return response()->json([
            'success' => true,
            'data'    => [
                'materias'   => $materias,
                'total_peso' => 100,
                'balanceado' => true,
            ],
            'message' => 'Pesos de materias actualizados correctamente. La suma es exactamente 100%.',
        ], 200);
    }

    /**
     * cargarDefault(): Inserta las 4 materias base del sistema si la tabla está vacía.
     */
    public function cargarDefault()
    {
        $cantidadActual = Materia::count();
        if ($cantidadActual > 0) {
            return response()->json([
                'success' => false,
                'message' => 'No se pueden cargar las materias por defecto porque ya existen materias en el sistema.',
            ], 422);
        }

        DB::transaction(function () {
            foreach (self::MATERIAS_DEFAULT as $m) {
                Materia::create($m);
            }
        });

        // Registrar en la bitácora del sistema
        Bitacora::registrar(
            'Carga de materias por defecto',
            'Se insertaron las 4 materias base: Matemáticas (35%), Física (35%), Inglés (15%), Computación (15%).',
            'materias',
            null
        );

        $materias = Materia::orderBy('peso', 'desc')->get();

        return response()->json([
            'success' => true,
            'data'    => [
                'materias'   => $materias,
                'total_peso' => 100,
                'balanceado' => true,
            ],
            'message' => 'Materias por defecto cargadas correctamente. Los pesos suman 100%.',
        ], 200);
    }
}
