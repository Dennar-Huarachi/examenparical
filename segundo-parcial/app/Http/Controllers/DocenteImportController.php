<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Rol;
use App\Models\PostulanteDocente;
use App\Models\Gestion;
use App\Models\Bitacora;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\PlantillaDocentesExport;
use App\Exports\ErroresExport;

class DocenteImportController extends Controller
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

        $rolDocente = Rol::firstOrCreate(
            ['nombre' => 'postulante_docente'],
            ['descripcion' => 'Postulante a docente de la universidad']
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

                $existeCI = PostulanteDocente::where('ci', $ci)
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

                $usuario = User::create([
                    'nombre' => $nombres,
                    'apellido' => $apellidos,
                    'email' => $correo,
                    'password' => Hash::make($ci),
                    'rol_id' => $rolDocente->id,
                    'activo' => true,
                ]);

                $cargaMaxima = !empty($fila['carga_horaria_maxima']) ? (int) $fila['carga_horaria_maxima'] : null;

                PostulanteDocente::create([
                    'ci'                   => $ci,
                    'nombres'              => $nombres,
                    'apellidos'            => $apellidos,
                    'fecha_nacimiento'     => $this->parseDate($fila['fecha_nacimiento'] ?? null),
                    'sexo'                 => trim($fila['sexo'] ?? ''),
                    'telefono'             => trim($fila['telefono'] ?? ''),
                    'correo'               => $correo,
                    'titulo_academico'     => trim($fila['titulo_academico'] ?? ''),
                    'especialidad'         => trim($fila['especialidad'] ?? ''),
                    'materia_preferida'    => trim($fila['materia_preferida'] ?? ''),
                    'disponibilidad_horaria' => trim($fila['disponibilidad_horaria'] ?? ''),
                    'carga_horaria_maxima' => $cargaMaxima,
                    'estado'               => 'pendiente',
                    'gestion_id'           => $gestion->id,
                    'usuario_id'           => $usuario->id,
                ]);

                DB::commit();
                $totalExitosos++;

                Bitacora::registrar(
                    'Importación de postulante a docente',
                    "CI: {$ci}, Docente: {$nombres} {$apellidos}",
                    'postulantes_docentes',
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
            'success'          => true,
            'total_procesados' => $totalProcesados,
            'total_exitosos'   => $totalExitosos,
            'total_errores'    => $totalErrores,
            'errores'          => $errores,
            'message'          => "Importación completada. {$totalExitosos} docentes importados, {$totalErrores} errores.",
        ], 200);
    }

    public function descargarPlantilla()
    {
        return Excel::download(new PlantillaDocentesExport, 'plantilla-docentes.xlsx');
    }

    public function exportarErrores(Request $request)
    {
        $errores = $request->input('errores', []);
        return Excel::download(new ErroresExport($errores), 'errores-importacion.xlsx');
    }

    private function parseDate($value)
    {
        if (empty($value)) return null;
        $value = trim($value);
        $formats = ['d/m/Y', 'Y-m-d', 'd-m-Y', 'm/d/Y'];
        foreach ($formats as $fmt) {
            $d = \DateTime::createFromFormat($fmt, $value);
            if ($d) return $d->format('Y-m-d');
        }
        return $value;
    }
}
