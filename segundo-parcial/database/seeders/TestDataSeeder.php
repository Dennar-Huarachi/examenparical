<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Materia;
use App\Models\Aula;
use App\Models\Turno;
use App\Models\Pago;
use App\Models\Postulante;
use App\Models\PostulanteDocente;
use App\Models\Docente;
use App\Models\Grupo;
use App\Models\Horario;
use App\Models\HorarioBloque;
use App\Models\Examen;
use App\Models\Nota;
use App\Models\NotaMateria;
use App\Models\DocumentoPostulante;
use App\Models\DocumentoDocente;
use App\Models\DocenteDisponibilidad;
use App\Models\Bitacora;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class TestDataSeeder extends Seeder
{
    public function run(): void
    {
        $gestionId = 1;

        // ============================================================
        // 1. TURNOS
        // ============================================================
        $turnos = [
            ['nombre' => 'Mañana', 'hora_inicio' => '07:30', 'hora_fin' => '12:30'],
            ['nombre' => 'Tarde', 'hora_inicio' => '13:30', 'hora_fin' => '18:30'],
            ['nombre' => 'Noche', 'hora_inicio' => '18:30', 'hora_fin' => '22:30'],
        ];
        foreach ($turnos as $t) {
            Turno::firstOrCreate(['nombre' => $t['nombre']], $t);
        }
        $this->command->info('Turnos creados.');

        // ============================================================
        // 2. MATERIAS (examen de admisión)
        // ============================================================
        $materias = [
            ['nombre' => 'Razonamiento Lógico Matemático', 'peso' => 1.50],
            ['nombre' => 'Razonamiento Verbal', 'peso' => 1.00],
            ['nombre' => 'Matemáticas', 'peso' => 2.00],
            ['nombre' => 'Física', 'peso' => 1.50],
            ['nombre' => 'Química', 'peso' => 1.00],
            ['nombre' => 'Informática Básica', 'peso' => 1.00],
            ['nombre' => 'Inglés Técnico', 'peso' => 0.50],
            ['nombre' => 'Lenguaje y Comunicación', 'peso' => 1.00],
        ];
        foreach ($materias as $m) {
            Materia::firstOrCreate(['nombre' => $m['nombre']], $m);
        }
        $this->command->info('Materias creadas.');

        // ============================================================
        // 3. AULAS
        // ============================================================
        $aulas = [
            ['numero' => '101', 'nombre' => 'Aula 101', 'capacidad' => 40, 'piso' => 1, 'edificio' => 'Edificio A', 'tiene_proyector' => true, 'modalidad' => 'Presencial', 'gestion_id' => $gestionId],
            ['numero' => '102', 'nombre' => 'Aula 102', 'capacidad' => 35, 'piso' => 1, 'edificio' => 'Edificio A', 'tiene_proyector' => true, 'modalidad' => 'Presencial', 'gestion_id' => $gestionId],
            ['numero' => '201', 'nombre' => 'Aula 201', 'capacidad' => 45, 'piso' => 2, 'edificio' => 'Edificio A', 'tiene_proyector' => false, 'modalidad' => 'Presencial', 'gestion_id' => $gestionId],
            ['numero' => 'Lab-1', 'nombre' => 'Laboratorio de Informática 1', 'capacidad' => 30, 'piso' => 1, 'edificio' => 'Edificio B', 'tiene_proyector' => true, 'modalidad' => 'Presencial', 'gestion_id' => $gestionId],
            ['numero' => 'Lab-2', 'nombre' => 'Laboratorio de Informática 2', 'capacidad' => 30, 'piso' => 2, 'edificio' => 'Edificio B', 'tiene_proyector' => true, 'modalidad' => 'Presencial', 'gestion_id' => $gestionId],
        ];
        foreach ($aulas as $a) {
            Aula::firstOrCreate(['numero' => $a['numero'], 'gestion_id' => $a['gestion_id']], $a);
        }
        $this->command->info('Aulas creadas.');

        // ============================================================
        // 4. PAGOS_CAJA
        // ============================================================
        $pagos = [
            ['numero_comprobante' => 'COMP-001', 'ci_pagador' => '12345678', 'monto' => 350.00, 'fecha_pago' => '2026-03-01', 'estado' => 'confirmado', 'gestion_id' => $gestionId],
            ['numero_comprobante' => 'COMP-002', 'ci_pagador' => '23456789', 'monto' => 350.00, 'fecha_pago' => '2026-03-02', 'estado' => 'confirmado', 'gestion_id' => $gestionId],
            ['numero_comprobante' => 'COMP-003', 'ci_pagador' => '34567890', 'monto' => 350.00, 'fecha_pago' => '2026-03-03', 'estado' => 'confirmado', 'gestion_id' => $gestionId],
            ['numero_comprobante' => 'COMP-004', 'ci_pagador' => '45678901', 'monto' => 350.00, 'fecha_pago' => '2026-03-04', 'estado' => 'confirmado', 'gestion_id' => $gestionId],
            ['numero_comprobante' => 'COMP-005', 'ci_pagador' => '56789012', 'monto' => 350.00, 'fecha_pago' => '2026-03-05', 'estado' => 'confirmado', 'gestion_id' => $gestionId],
            ['numero_comprobante' => 'COMP-006', 'ci_pagador' => '67890123', 'monto' => 350.00, 'fecha_pago' => '2026-03-06', 'estado' => 'confirmado', 'gestion_id' => $gestionId],
        ];
        foreach ($pagos as $p) {
            Pago::firstOrCreate(['numero_comprobante' => $p['numero_comprobante']], $p);
        }
        $this->command->info('Pagos creados.');

        // ============================================================
        // 5. POSTULANTES (estudiantes)
        // ============================================================
        $adminId = User::where('email', 'rojasgutierrezkristenalexis@gmail.com')->first()->id;

        $postulantes = [
            ['ci' => '87654321', 'nombres' => 'Carlos', 'apellidos' => 'Mendoza López', 'fecha_nacimiento' => '2005-05-15', 'sexo' => 'M', 'direccion' => 'Calle Bolívar #123', 'telefono' => '71234567', 'correo' => 'carlos.mendoza@email.com', 'colegio_procedencia' => 'Colegio San Simón', 'ciudad' => 'Cochabamba', 'carrera_principal_id' => 1, 'carrera_secundaria_id' => 2, 'titulo_bachiller' => true, 'año_bachillerato' => 2024, 'turno_preferido' => 'Mañana', 'otros' => 'Ninguno', 'estado' => 'pendiente', 'pago_id' => 1, 'gestion_id' => $gestionId, 'usuario_id' => $adminId],
            ['ci' => '98765432', 'nombres' => 'María', 'apellidos' => 'García Rivero', 'fecha_nacimiento' => '2006-08-22', 'sexo' => 'F', 'direccion' => 'Av. Ayacucho #456', 'telefono' => '72234567', 'correo' => 'maria.garcia@email.com', 'colegio_procedencia' => 'Colegio Alemán', 'ciudad' => 'Cochabamba', 'carrera_principal_id' => 2, 'carrera_secundaria_id' => 1, 'titulo_bachiller' => true, 'año_bachillerato' => 2024, 'turno_preferido' => 'Tarde', 'otros' => null, 'estado' => 'pendiente', 'pago_id' => 2, 'gestion_id' => $gestionId, 'usuario_id' => $adminId],
            ['ci' => '19283746', 'nombres' => 'Pedro', 'apellidos' => 'Quispe Mamani', 'fecha_nacimiento' => '2005-11-03', 'sexo' => 'M', 'direccion' => 'Calle 25 de Mayo #789', 'telefono' => '73234567', 'correo' => 'pedro.quispe@email.com', 'colegio_procedencia' => 'Colegio Don Bosco', 'ciudad' => 'Cochabamba', 'carrera_principal_id' => 3, 'carrera_secundaria_id' => 1, 'titulo_bachiller' => false, 'año_bachillerato' => null, 'turno_preferido' => 'Noche', 'otros' => 'Trabaja en la mañana', 'estado' => 'pendiente', 'pago_id' => 3, 'gestion_id' => $gestionId, 'usuario_id' => $adminId],
            ['ci' => '56473829', 'nombres' => 'Ana', 'apellidos' => 'Flores Torrico', 'fecha_nacimiento' => '2006-01-18', 'sexo' => 'F', 'direccion' => 'Av. Blanco Galindo #321', 'telefono' => '74234567', 'correo' => 'ana.flores@email.com', 'colegio_procedencia' => 'Colegio Santa Clara', 'ciudad' => 'Quillacollo', 'carrera_principal_id' => 1, 'carrera_secundaria_id' => 3, 'titulo_bachiller' => true, 'año_bachillerato' => 2024, 'turno_preferido' => 'Mañana', 'otros' => null, 'estado' => 'pendiente', 'pago_id' => 4, 'gestion_id' => $gestionId, 'usuario_id' => $adminId],
            ['ci' => '10293847', 'nombres' => 'Luis', 'apellidos' => 'Pérez Rojas', 'fecha_nacimiento' => '2005-07-30', 'sexo' => 'M', 'direccion' => 'Calle España #654', 'telefono' => '75234567', 'correo' => 'luis.perez@email.com', 'colegio_procedencia' => 'Colegio Sucre', 'ciudad' => 'Sacaba', 'carrera_principal_id' => 2, 'carrera_secundaria_id' => 3, 'titulo_bachiller' => true, 'año_bachillerato' => 2024, 'turno_preferido' => 'Mañana', 'otros' => null, 'estado' => 'pendiente', 'pago_id' => 5, 'gestion_id' => $gestionId, 'usuario_id' => $adminId],
            ['ci' => '91827364', 'nombres' => 'Sofía', 'apellidos' => 'Vargas Antezana', 'fecha_nacimiento' => '2006-04-12', 'sexo' => 'F', 'direccion' => 'Av. Oquendo #987', 'telefono' => '76234567', 'correo' => 'sofia.vargas@email.com', 'colegio_procedencia' => 'Colegio San Agustín', 'ciudad' => 'Cochabamba', 'carrera_principal_id' => 1, 'carrera_secundaria_id' => 2, 'titulo_bachiller' => true, 'año_bachillerato' => 2024, 'turno_preferido' => 'Tarde', 'otros' => null, 'estado' => 'pendiente', 'pago_id' => 6, 'gestion_id' => $gestionId, 'usuario_id' => $adminId],
        ];
        foreach ($postulantes as $p) {
            Postulante::firstOrCreate(['ci' => $p['ci']], $p);
        }
        $this->command->info('Postulantes creados.');

        // ============================================================
        // 6. POSTULANTES_DOCENTES
        // ============================================================
        $postulantesDocentes = [
            ['ci' => '11111111', 'nombres' => 'Roberto', 'apellidos' => 'Cárdenas Suárez', 'fecha_nacimiento' => '1988-03-15', 'sexo' => 'M', 'telefono' => '77123456', 'correo' => 'roberto.cardenas@email.com', 'titulo_academico' => 'Licenciatura en Informática', 'especialidad' => 'Desarrollo de Software', 'materia_preferida' => 'Programación', 'disponibilidad_horaria' => 'Mañana y Tarde', 'carga_horaria_maxima' => 20, 'estado' => 'pendiente', 'gestion_id' => $gestionId, 'usuario_id' => $adminId],
            ['ci' => '99999999', 'nombres' => 'Laura', 'apellidos' => 'Molina Crespo', 'fecha_nacimiento' => '1990-07-22', 'sexo' => 'F', 'telefono' => '77234567', 'correo' => 'laura.molina@email.com', 'titulo_academico' => 'Licenciatura en Matemáticas', 'especialidad' => 'Matemáticas Aplicadas', 'materia_preferida' => 'Matemáticas', 'disponibilidad_horaria' => 'Mañana', 'carga_horaria_maxima' => 15, 'estado' => 'postulante', 'gestion_id' => $gestionId, 'usuario_id' => $adminId],
            ['ci' => '88888888', 'nombres' => 'Jorge', 'apellidos' => 'Torres Rivas', 'fecha_nacimiento' => '1985-11-08', 'sexo' => 'M', 'telefono' => '77345678', 'correo' => 'jorge.torres@email.com', 'titulo_academico' => 'Ingeniería en Redes', 'especialidad' => 'Redes y Telecomunicaciones', 'materia_preferida' => 'Redes', 'disponibilidad_horaria' => 'Noche', 'carga_horaria_maxima' => 25, 'estado' => 'postulante', 'gestion_id' => $gestionId, 'usuario_id' => $adminId],
            ['ci' => '77777777', 'nombres' => 'Carmen', 'apellidos' => 'Ríos Delgado', 'fecha_nacimiento' => '1992-01-30', 'sexo' => 'F', 'telefono' => '77456789', 'correo' => 'carmen.rios@email.com', 'titulo_academico' => 'Licenciatura en Física', 'especialidad' => 'Física Educativa', 'materia_preferida' => 'Física', 'disponibilidad_horaria' => 'Tarde', 'carga_horaria_maxima' => 18, 'estado' => 'contratado', 'gestion_id' => $gestionId, 'usuario_id' => $adminId],
            ['ci' => '66666666', 'nombres' => 'Diego', 'apellidos' => 'Hurtado Vargas', 'fecha_nacimiento' => '1987-09-14', 'sexo' => 'M', 'telefono' => '77567890', 'correo' => 'diego.hurtado@email.com', 'titulo_academico' => 'Ingeniería de Sistemas', 'especialidad' => 'Bases de Datos', 'materia_preferida' => 'Base de Datos', 'disponibilidad_horaria' => 'Mañana y Noche', 'carga_horaria_maxima' => 22, 'estado' => 'rechazado', 'gestion_id' => $gestionId, 'usuario_id' => $adminId],
        ];
        foreach ($postulantesDocentes as $pd) {
            PostulanteDocente::firstOrCreate(['ci' => $pd['ci']], $pd);
        }
        $this->command->info('Postulantes docentes creados.');

        // ============================================================
        // 7. DOCENTES (contratados)
        // ============================================================
        $carmenPd = PostulanteDocente::where('ci', '77777777')->first();
        if ($carmenPd) {
            Docente::firstOrCreate(
                ['postulante_docente_id' => $carmenPd->id],
                ['postulante_docente_id' => $carmenPd->id, 'fecha_contratacion' => '2026-03-15', 'estado' => 'activo', 'gestion_id' => $gestionId]
            );
        }
        $this->command->info('Docentes creados.');

        // ============================================================
        // 8. GRUPOS
        // ============================================================
        $turnoManana = Turno::where('nombre', 'Mañana')->first()->id;
        $turnoTarde = Turno::where('nombre', 'Tarde')->first()->id;
        $turnoNoche = Turno::where('nombre', 'Noche')->first()->id;

        $grupos = [
            ['nombre' => 'Grupo A - Informática', 'capacidad_maxima' => 40, 'turno_id' => $turnoManana, 'modalidad' => 'Presencial', 'gestion_id' => $gestionId, 'total_inscritos' => 2, 'estado' => 'activo'],
            ['nombre' => 'Grupo B - Sistemas', 'capacidad_maxima' => 40, 'turno_id' => $turnoTarde, 'modalidad' => 'Presencial', 'gestion_id' => $gestionId, 'total_inscritos' => 1, 'estado' => 'activo'],
            ['nombre' => 'Grupo C - Redes', 'capacidad_maxima' => 35, 'turno_id' => $turnoNoche, 'modalidad' => 'Presencial', 'gestion_id' => $gestionId, 'total_inscritos' => 1, 'estado' => 'activo'],
        ];
        foreach ($grupos as $g) {
            Grupo::firstOrCreate(['nombre' => $g['nombre'], 'gestion_id' => $g['gestion_id']], $g);
        }
        $this->command->info('Grupos creados.');

        // Resolve IDs dynamically
        $postulanteCarlos = Postulante::where('ci', '87654321')->first();
        $postulanteMaria = Postulante::where('ci', '98765432')->first();
        $postulantePedro = Postulante::where('ci', '19283746')->first();
        $postulanteAna = Postulante::where('ci', '56473829')->first();
        $postulanteLuis = Postulante::where('ci', '10293847')->first();
        $postulanteSofia = Postulante::where('ci', '91827364')->first();

        $grupoA = Grupo::where('nombre', 'Grupo A - Informática')->first();
        $grupoB = Grupo::where('nombre', 'Grupo B - Sistemas')->first();
        $grupoC = Grupo::where('nombre', 'Grupo C - Redes')->first();

        $docenteCarmen = Docente::where('postulante_docente_id', $carmenPd?->id)->first();

        $materiaLogico = Materia::where('nombre', 'Razonamiento Lógico Matemático')->first();
        $materiaVerbal = Materia::where('nombre', 'Razonamiento Verbal')->first();
        $materiaMatematicas = Materia::where('nombre', 'Matemáticas')->first();
        $materiaFisica = Materia::where('nombre', 'Física')->first();

        // ============================================================
        // 9. GRUPO_POSTULANTE
        // ============================================================
        if ($postulanteCarlos && $postulanteMaria && $postulantePedro && $postulanteAna && $grupoA && $grupoB && $grupoC) {
            DB::table('grupo_postulante')->insertOrIgnore([
                ['grupo_id' => $grupoA->id, 'postulante_id' => $postulanteCarlos->id, 'fecha_asignacion' => now(), 'created_at' => now(), 'updated_at' => now()],
                ['grupo_id' => $grupoA->id, 'postulante_id' => $postulanteAna->id, 'fecha_asignacion' => now(), 'created_at' => now(), 'updated_at' => now()],
                ['grupo_id' => $grupoB->id, 'postulante_id' => $postulanteMaria->id, 'fecha_asignacion' => now(), 'created_at' => now(), 'updated_at' => now()],
                ['grupo_id' => $grupoC->id, 'postulante_id' => $postulantePedro->id, 'fecha_asignacion' => now(), 'created_at' => now(), 'updated_at' => now()],
            ]);
        }
        $this->command->info('Asignación grupo-postulante creada.');

        // ============================================================
        // 10. HORARIOS
        // ============================================================
        $aula101 = Aula::where('numero', '101')->first();
        $aula102 = Aula::where('numero', '102')->first();
        $aula201 = Aula::where('numero', '201')->first();

        if ($grupoA && $grupoB && $grupoC && $docenteCarmen && $aula101 && $aula102 && $aula201) {
            $horarios = [
                ['grupo_id' => $grupoA->id, 'materia_id' => $materiaLogico->id, 'docente_id' => $docenteCarmen->id, 'aula_id' => $aula101->id, 'dia_semana' => 'Lunes', 'hora_inicio' => '07:30', 'hora_fin' => '09:00', 'gestion_id' => $gestionId],
                ['grupo_id' => $grupoA->id, 'materia_id' => $materiaMatematicas->id, 'docente_id' => $docenteCarmen->id, 'aula_id' => $aula101->id, 'dia_semana' => 'Miércoles', 'hora_inicio' => '07:30', 'hora_fin' => '09:00', 'gestion_id' => $gestionId],
                ['grupo_id' => $grupoB->id, 'materia_id' => $materiaVerbal->id, 'docente_id' => $docenteCarmen->id, 'aula_id' => $aula201->id, 'dia_semana' => 'Martes', 'hora_inicio' => '13:30', 'hora_fin' => '15:00', 'gestion_id' => $gestionId],
                ['grupo_id' => $grupoC->id, 'materia_id' => $materiaFisica->id, 'docente_id' => $docenteCarmen->id, 'aula_id' => $aula102->id, 'dia_semana' => 'Jueves', 'hora_inicio' => '18:30', 'hora_fin' => '20:00', 'gestion_id' => $gestionId],
            ];
            foreach ($horarios as $h) {
                Horario::firstOrCreate(
                    ['grupo_id' => $h['grupo_id'], 'materia_id' => $h['materia_id'], 'dia_semana' => $h['dia_semana'], 'hora_inicio' => $h['hora_inicio']],
                    $h
                );
            }
        }
        $this->command->info('Horarios creados.');

        // ============================================================
        // 11. HORARIO_BLOQUES
        // ============================================================
        if ($grupoA && $grupoB && $grupoC && $docenteCarmen && $aula101 && $aula102 && $aula201) {
            $horarioBloques = [
                ['grupo_id' => $grupoA->id, 'materia_id' => $materiaLogico->id, 'docente_id' => $docenteCarmen->id, 'aula_id' => $aula101->id, 'dia_semana' => 'Lunes', 'bloque_inicio' => 1, 'bloque_fin' => 2, 'hora_inicio' => '07:30', 'hora_fin' => '09:00', 'turno_id' => $turnoManana, 'gestion_id' => $gestionId],
                ['grupo_id' => $grupoA->id, 'materia_id' => $materiaMatematicas->id, 'docente_id' => $docenteCarmen->id, 'aula_id' => $aula101->id, 'dia_semana' => 'Miércoles', 'bloque_inicio' => 1, 'bloque_fin' => 2, 'hora_inicio' => '07:30', 'hora_fin' => '09:00', 'turno_id' => $turnoManana, 'gestion_id' => $gestionId],
                ['grupo_id' => $grupoB->id, 'materia_id' => $materiaVerbal->id, 'docente_id' => $docenteCarmen->id, 'aula_id' => $aula201->id, 'dia_semana' => 'Martes', 'bloque_inicio' => 1, 'bloque_fin' => 2, 'hora_inicio' => '13:30', 'hora_fin' => '15:00', 'turno_id' => $turnoTarde, 'gestion_id' => $gestionId],
                ['grupo_id' => $grupoC->id, 'materia_id' => $materiaFisica->id, 'docente_id' => $docenteCarmen->id, 'aula_id' => $aula102->id, 'dia_semana' => 'Jueves', 'bloque_inicio' => 1, 'bloque_fin' => 2, 'hora_inicio' => '18:30', 'hora_fin' => '20:00', 'turno_id' => $turnoNoche, 'gestion_id' => $gestionId],
            ];
            foreach ($horarioBloques as $hb) {
                HorarioBloque::firstOrCreate(
                    ['grupo_id' => $hb['grupo_id'], 'materia_id' => $hb['materia_id'], 'dia_semana' => $hb['dia_semana'], 'bloque_inicio' => $hb['bloque_inicio']],
                    $hb
                );
            }
        }
        $this->command->info('Bloques de horario creados.');

        // ============================================================
        // 12. EXAMENES
        // ============================================================
        if ($postulanteCarlos && $postulanteMaria && $postulantePedro && $postulanteAna && $postulanteLuis && $postulanteSofia) {
            $examenes = [
                ['postulante_id' => $postulanteCarlos->id, 'materia_id' => $materiaLogico->id, 'numero_examen' => 1, 'fecha' => '2026-03-20', 'estado' => 'pendiente'],
                ['postulante_id' => $postulanteCarlos->id, 'materia_id' => $materiaMatematicas->id, 'numero_examen' => 1, 'fecha' => '2026-03-22', 'estado' => 'pendiente'],
                ['postulante_id' => $postulanteMaria->id, 'materia_id' => $materiaVerbal->id, 'numero_examen' => 1, 'fecha' => '2026-03-20', 'estado' => 'pendiente'],
                ['postulante_id' => $postulantePedro->id, 'materia_id' => $materiaLogico->id, 'numero_examen' => 1, 'fecha' => '2026-03-21', 'estado' => 'pendiente'],
                ['postulante_id' => $postulanteAna->id, 'materia_id' => $materiaLogico->id, 'numero_examen' => 1, 'fecha' => '2026-03-20', 'estado' => 'pendiente'],
                ['postulante_id' => $postulanteAna->id, 'materia_id' => $materiaMatematicas->id, 'numero_examen' => 1, 'fecha' => '2026-03-22', 'estado' => 'pendiente'],
                ['postulante_id' => $postulanteLuis->id, 'materia_id' => $materiaVerbal->id, 'numero_examen' => 1, 'fecha' => '2026-03-21', 'estado' => 'pendiente'],
                ['postulante_id' => $postulanteSofia->id, 'materia_id' => $materiaLogico->id, 'numero_examen' => 1, 'fecha' => '2026-03-20', 'estado' => 'pendiente'],
                ['postulante_id' => $postulanteSofia->id, 'materia_id' => $materiaMatematicas->id, 'numero_examen' => 1, 'fecha' => '2026-03-22', 'estado' => 'pendiente'],
            ];
            foreach ($examenes as $e) {
                Examen::firstOrCreate(
                    ['postulante_id' => $e['postulante_id'], 'materia_id' => $e['materia_id'], 'numero_examen' => $e['numero_examen']],
                    $e
                );
            }
        }
        $this->command->info('Exámenes creados.');

        // ============================================================
        // 13. NOTAS (algunos exámenes ya calificados)
        // ============================================================
        $examenCarlosLogico = Examen::where('postulante_id', $postulanteCarlos?->id)->where('materia_id', $materiaLogico?->id)->first();
        $examenCarlosMate = Examen::where('postulante_id', $postulanteCarlos?->id)->where('materia_id', $materiaMatematicas?->id)->first();
        $examenMariaVerbal = Examen::where('postulante_id', $postulanteMaria?->id)->where('materia_id', $materiaVerbal?->id)->first();
        $examenAnaLogico = Examen::where('postulante_id', $postulanteAna?->id)->where('materia_id', $materiaLogico?->id)->first();
        $examenAnaMate = Examen::where('postulante_id', $postulanteAna?->id)->where('materia_id', $materiaMatematicas?->id)->first();

        $notasData = [
            ['examen_id' => $examenCarlosLogico?->id, 'nota' => 85.50, 'registrado_por' => $adminId],
            ['examen_id' => $examenCarlosMate?->id, 'nota' => 90.00, 'registrado_por' => $adminId],
            ['examen_id' => $examenMariaVerbal?->id, 'nota' => 78.00, 'registrado_por' => $adminId],
            ['examen_id' => $examenAnaLogico?->id, 'nota' => 92.50, 'registrado_por' => $adminId],
            ['examen_id' => $examenAnaMate?->id, 'nota' => 88.00, 'registrado_por' => $adminId],
        ];
        foreach ($notasData as $n) {
            if ($n['examen_id']) {
                Nota::firstOrCreate(['examen_id' => $n['examen_id']], $n);
            }
        }
        $this->command->info('Notas creadas.');

        // ============================================================
        // 14. NOTAS_MATERIA (promedios por materia)
        // ============================================================
        $notasMateria = [
            ['postulante_id' => $postulanteCarlos?->id, 'materia_id' => $materiaLogico->id, 'promedio' => 85.50, 'aprobado' => true],
            ['postulante_id' => $postulanteCarlos?->id, 'materia_id' => $materiaMatematicas->id, 'promedio' => 90.00, 'aprobado' => true],
            ['postulante_id' => $postulanteMaria?->id, 'materia_id' => $materiaVerbal->id, 'promedio' => 78.00, 'aprobado' => true],
            ['postulante_id' => $postulanteAna?->id, 'materia_id' => $materiaLogico->id, 'promedio' => 92.50, 'aprobado' => true],
            ['postulante_id' => $postulanteAna?->id, 'materia_id' => $materiaMatematicas->id, 'promedio' => 88.00, 'aprobado' => true],
        ];
        foreach ($notasMateria as $nm) {
            if ($nm['postulante_id']) {
                NotaMateria::firstOrCreate(
                    ['postulante_id' => $nm['postulante_id'], 'materia_id' => $nm['materia_id']],
                    $nm
                );
            }
        }
        $this->command->info('Notas por materia creadas.');

        // ============================================================
        // 15. DOCUMENTOS_POSTULANTE
        // ============================================================
        if ($postulanteCarlos && $postulanteMaria) {
            $docsPostulante = [
                ['postulante_id' => $postulanteCarlos->id, 'tipo_documento' => 'Cédula de Identidad', 'nombre_archivo' => 'ci_carlos.pdf', 'ruta_archivo' => '/documentos/postulantes/' . $postulanteCarlos->id . '/ci.pdf'],
                ['postulante_id' => $postulanteMaria->id, 'tipo_documento' => 'Cédula de Identidad', 'nombre_archivo' => 'ci_maria.pdf', 'ruta_archivo' => '/documentos/postulantes/' . $postulanteMaria->id . '/ci.pdf'],
                ['postulante_id' => $postulanteCarlos->id, 'tipo_documento' => 'Título de Bachiller', 'nombre_archivo' => 'titulo_carlos.pdf', 'ruta_archivo' => '/documentos/postulantes/' . $postulanteCarlos->id . '/titulo.pdf'],
            ];
            foreach ($docsPostulante as $d) {
                DocumentoPostulante::create($d);
            }
        }
        $this->command->info('Documentos de postulantes creados.');

        // ============================================================
        // 16. DOCUMENTOS_DOCENTE
        // ============================================================
        $lauraPd = PostulanteDocente::where('ci', '99999999')->first();
        $docsDocente = [];
        if ($carmenPd) {
            $docsDocente[] = ['postulante_docente_id' => $carmenPd->id, 'tipo_documento' => 'Cédula de Identidad', 'nombre_archivo' => 'ci_carmen.pdf', 'ruta_archivo' => '/documentos/docentes/' . $carmenPd->id . '/ci.pdf'];
            $docsDocente[] = ['postulante_docente_id' => $carmenPd->id, 'tipo_documento' => 'Título Académico', 'nombre_archivo' => 'titulo_carmen.pdf', 'ruta_archivo' => '/documentos/docentes/' . $carmenPd->id . '/titulo.pdf'];
        }
        if ($lauraPd) {
            $docsDocente[] = ['postulante_docente_id' => $lauraPd->id, 'tipo_documento' => 'Cédula de Identidad', 'nombre_archivo' => 'ci_laura.pdf', 'ruta_archivo' => '/documentos/docentes/' . $lauraPd->id . '/ci.pdf'];
        }
        foreach ($docsDocente as $d) {
            DocumentoDocente::create($d);
        }
        $this->command->info('Documentos de docentes creados.');

        // ============================================================
        // 17. DOCENTE_DISPONIBILIDAD
        // ============================================================
        $robertoPd = PostulanteDocente::where('ci', '11111111')->first();
        $jorgePd = PostulanteDocente::where('ci', '88888888')->first();

        $disponibilidades = [];
        if ($lauraPd) {
            $disponibilidades[] = ['postulante_docente_id' => $lauraPd->id, 'turno_id' => $turnoManana, 'horas_disponibles' => 15, 'gestion_id' => $gestionId];
            $disponibilidades[] = ['postulante_docente_id' => $lauraPd->id, 'turno_id' => $turnoTarde, 'horas_disponibles' => 10, 'gestion_id' => $gestionId];
        }
        if ($jorgePd) {
            $disponibilidades[] = ['postulante_docente_id' => $jorgePd->id, 'turno_id' => $turnoNoche, 'horas_disponibles' => 25, 'gestion_id' => $gestionId];
        }
        if ($carmenPd) {
            $disponibilidades[] = ['postulante_docente_id' => $carmenPd->id, 'turno_id' => $turnoTarde, 'horas_disponibles' => 18, 'gestion_id' => $gestionId];
        }
        if ($robertoPd) {
            $disponibilidades[] = ['postulante_docente_id' => $robertoPd->id, 'turno_id' => $turnoManana, 'horas_disponibles' => 20, 'gestion_id' => $gestionId];
            $disponibilidades[] = ['postulante_docente_id' => $robertoPd->id, 'turno_id' => $turnoTarde, 'horas_disponibles' => 20, 'gestion_id' => $gestionId];
        }
        foreach ($disponibilidades as $d) {
            DocenteDisponibilidad::firstOrCreate(
                ['postulante_docente_id' => $d['postulante_docente_id'], 'turno_id' => $d['turno_id'], 'gestion_id' => $d['gestion_id']],
                $d
            );
        }
        $this->command->info('Disponibilidades creadas.');

        // ============================================================
        // 18. BITACORA
        // ============================================================
        Bitacora::create([
            'usuario_id' => $adminId,
            'accion' => 'Datos de prueba insertados',
            'tabla_afectada' => 'multiple',
            'registro_id' => 1,
            'detalle' => 'Se insertaron datos de prueba para todas las tablas del sistema.',
            'ip' => '127.0.0.1',
        ]);
        $this->command->info('Bitácora actualizada.');

        $this->command->info('');
        $this->command->info('=========================================');
        $this->command->info('DATOS DE PRUEBA INSERTADOS CORRECTAMENTE');
        $this->command->info('=========================================');
    }
}
