<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;

class PlantillaDocentesExport implements FromArray, WithHeadings, WithTitle
{
    public function array(): array
    {
        return [
            [
                'ci' => '23456789',
                'nombres' => 'Carlos',
                'apellidos' => 'Mendoza Ríos',
                'fecha_nacimiento' => '10/03/1990',
                'sexo' => 'M',
                'telefono' => '73456789',
                'correo' => 'carlos.mendoza@email.com',
                'titulo_academico' => 'Licenciatura en Matemáticas',
                'especialidad' => 'Álgebra Lineal',
                'materia_preferida' => 'Matemáticas',
                'disponibilidad_horaria' => 'Mañana',
                'carga_horaria_maxima' => '40',
            ],
            [
                'ci' => '34567890',
                'nombres' => 'Ana',
                'apellidos' => 'Vargas Soliz',
                'fecha_nacimiento' => '25/07/1992',
                'sexo' => 'F',
                'telefono' => '74567890',
                'correo' => 'ana.vargas@email.com',
                'titulo_academico' => 'Licenciatura en Física',
                'especialidad' => 'Física Cuántica',
                'materia_preferida' => 'Física',
                'disponibilidad_horaria' => 'Tarde',
                'carga_horaria_maxima' => '30',
            ],
        ];
    }

    public function headings(): array
    {
        return [
            'ci',
            'nombres',
            'apellidos',
            'fecha_nacimiento',
            'sexo',
            'telefono',
            'correo',
            'titulo_academico',
            'especialidad',
            'materia_preferida',
            'disponibilidad_horaria',
            'carga_horaria_maxima',
        ];
    }

    public function title(): string
    {
        return 'Docentes';
    }
}
