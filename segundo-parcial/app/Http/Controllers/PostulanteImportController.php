<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Rol;
use App\Models\Carrera;
use App\Models\Postulante;
use App\Models\Gestion;
use App\Models\Bitacora;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\PlantillaPostulantesExport;
use App\Exports\ErroresExport;

class PostulanteImportController extends Controller
{
    public function import(Request $request)
    {
        $request->validate([
            'archivo' => 'required|file|mimes:xlsx,xls',
        ]);

        $gestion = Gestion::where('estado', 'activo')->first();
        if (!$gestion) {
            return response()->json([
                'success' => false,
                'message' => 'No hay una gestión activa en el sistema.',
            ], 422);
        }

        $rolPostulante = Rol::firstOrCreate(
            ['nombre' => 'postulante_alumno'],
            ['descripcion' => 'Postulante a la universidad (alumno)']
        );

        try {
            $rows = Excel::toArray(new class implements \Maatwebsite\Excel\Concerns\WithHeadingRow {
                public function headingRow(): int { return 1; }
            }, $request->file('archivo'));
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al leer el archivo: ' . $e->getMessage(),
            ], 422);
        }

        $data = $rows[0] ?? [];
        $totalProcesados = count($data);
        $totalExitosos = 0;
        $totalErrores = 0;
        $errores = [];

        $añoGestion = $gestion->año;

        $ultimoCorrelativo = Postulante::where('gestion_id', $gestion->id)
            ->whereNotNull('id_postulante')
            ->orderBy('id', 'desc')
            ->value('id_postulante');

        $correlativo = 1;
        if ($ultimoCorrelativo) {
            $partes = explode('-', $ultimoCorrelativo);
            $correlativo = (int) end($partes) + 1;
        }

        $carrerasCache = Carrera::all()->keyBy(function ($item) {
            return mb_strtolower(trim($item->nombre));
        });

        foreach ($data as $index => $fila) {
            $filaNum = $index + 2;
            $ci = trim($fila['ci'] ?? '');
            $correo = trim($fila['correo'] ?? '');

            DB::beginTransaction();
            try {
                if (empty($ci)) {
                    throw new \Exception('El CI es obligatorio.');
                }

                if (empty($correo)) {
                    throw new \Exception('El correo electrónico es obligatorio.');
                }

                $existeCI = Postulante::where('ci', $ci)
                    ->where('gestion_id', $gestion->id)
                    ->exists();

                if ($existeCI) {
                    throw new \Exception("El CI '{$ci}' ya está registrado en esta gestión.");
                }

                $existeUsuario = User::where('email', $correo)->exists();
                if ($existeUsuario) {
                    throw new \Exception("El correo '{$correo}' ya está registrado en el sistema.");
                }

                $nombres = trim($fila['nombres'] ?? '');
                $apellidos = trim($fila['apellidos'] ?? '');
                if (empty($nombres) || empty($apellidos)) {
                    throw new \Exception('Nombres y apellidos son obligatorios.');
                }

                $carreraPrincipal = null;
                $carreraPpalNombre = trim($fila['carrera_principal'] ?? '');
                if (!empty($carreraPpalNombre)) {
                    $key = mb_strtolower($carreraPpalNombre);
                    $carreraPrincipal = $carrerasCache->get($key);
                    if (!$carreraPrincipal) {
                        $errores[] = [
                            'fila' => $filaNum,
                            'ci' => $ci,
                            'motivo' => "Carrera principal '{$carreraPpalNombre}' no encontrada. Se ignoró.",
                        ];
                    }
                }

                $carreraSecundaria = null;
                $carreraSecNombre = trim($fila['carrera_secundaria'] ?? '');
                if (!empty($carreraSecNombre)) {
                    $key = mb_strtolower($carreraSecNombre);
                    $carreraSecundaria = $carrerasCache->get($key);
                    if (!$carreraSecundaria) {
                        $errores[] = [
                            'fila' => $filaNum,
                            'ci' => $ci,
                            'motivo' => "Carrera secundaria '{$carreraSecNombre}' no encontrada. Se ignoró.",
                        ];
                    }
                }

                $idPostulante = 'POST-' . $añoGestion . '-' . str_pad($correlativo, 4, '0', STR_PAD_LEFT);

                $usuario = User::create([
                    'nombre' => $nombres,
                    'apellido' => $apellidos,
                    'email' => $correo,
                    'password' => Hash::make($ci),
                    'rol_id' => $rolPostulante->id,
                    'activo' => true,
                ]);

                Postulante::create([
                    'id_postulante'        => $idPostulante,
                    'ci'                   => $ci,
                    'nombres'              => $nombres,
                    'apellidos'            => $apellidos,
                    'fecha_nacimiento'     => $this->parseDate($fila['fecha_nacimiento'] ?? null),
                    'sexo'                 => trim($fila['sexo'] ?? ''),
                    'direccion'            => trim($fila['direccion'] ?? ''),
                    'telefono'             => trim($fila['telefono'] ?? ''),
                    'correo'               => $correo,
                    'colegio_procedencia'  => trim($fila['colegio_procedencia'] ?? ''),
                    'ciudad'               => trim($fila['ciudad'] ?? ''),
                    'carrera_principal_id' => $carreraPrincipal ? $carreraPrincipal->id : null,
                    'carrera_secundaria_id'=> $carreraSecundaria ? $carreraSecundaria->id : null,
                    'titulo_bachiller'     => in_array(mb_strtoupper(trim($fila['titulo_bachiller'] ?? '')), ['SI', 'S', 'YES', '1', 'TRUE']),
                    'año_bachillerato'     => !empty($fila['año_bachillerato']) ? (int) $fila['año_bachillerato'] : null,
                    'turno_preferido'      => trim($fila['turno_preferido'] ?? ''),
                    'estado'               => 'pendiente',
                    'gestion_id'           => $gestion->id,
                    'usuario_id'           => $usuario->id,
                ]);

                DB::commit();
                $totalExitosos++;
                $correlativo++;

                Bitacora::registrar(
                    'Importación de postulante',
                    "CI: {$ci}, Postulante: {$nombres} {$apellidos}, ID: {$idPostulante}",
                    'postulantes',
                    $usuario->id
                );
            } catch (\Exception $e) {
                DB::rollBack();
                $totalErrores++;
                $errores[] = [
                    'fila' => $filaNum,
                    'ci' => $ci ?: '—',
                    'motivo' => $e->getMessage(),
                ];
            }
        }

        return response()->json([
            'success'         => true,
            'total_procesados' => $totalProcesados,
            'total_exitosos'  => $totalExitosos,
            'total_errores'   => $totalErrores,
            'errores'         => $errores,
            'message'         => "Importación completada. {$totalExitosos} postulantes importados, {$totalErrores} errores.",
        ], 200);
    }

    public function descargarPlantilla()
    {
        return Excel::download(new PlantillaPostulantesExport, 'plantilla-postulantes.xlsx');
    }

    public function exportarErrores(Request $request)
    {
        $errores = $request->input('errores', []);
        return Excel::download(new ErroresExport($errores), 'errores-importacion.xlsx');
    }

    private function parseDate($value)
    {
        if (empty($value)) return null;
        if ($value instanceof \DateTime) return $value->format('Y-m-d');
        if ($value instanceof \PhpOffice\PhpSpreadsheet\Shared\Date) {
            return \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($value)->format('Y-m-d');
        }
        $value = trim($value);
        $formats = ['d/m/Y', 'Y-m-d', 'd-m-Y', 'm/d/Y'];
        foreach ($formats as $fmt) {
            $d = \DateTime::createFromFormat($fmt, $value);
            if ($d) return $d->format('Y-m-d');
        }
        return $value;
    }
}
