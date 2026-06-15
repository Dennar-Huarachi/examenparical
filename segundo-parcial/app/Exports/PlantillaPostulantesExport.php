<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;

class PlantillaPostulantesExport implements FromArray, WithHeadings, WithTitle
{
    public function array(): array
    {
        return [
            [
                'ci' => '12345678',
                'nombres' => 'Juan',
                'apellidos' => 'Pérez López',
                'fecha_nacimiento' => '15/05/2005',
                'sexo' => 'M',
                'direccion' => 'Av. Principal #123',
                'telefono' => '71234567',
                'correo' => 'juan.perez@email.com',
                'colegio_procedencia' => 'Colegio San Simón',
                'ciudad' => 'Cochabamba',
                'carrera_principal' => 'Ingeniería Informática',
                'carrera_secundaria' => 'Ingeniería de Sistemas',
                'titulo_bachiller' => 'SI',
                'año_bachillerato' => '2023',
                'turno_preferido' => 'Mañana',
            ],
            [
                'ci' => '87654321',
                'nombres' => 'María',
                'apellidos' => 'García Rodríguez',
                'fecha_nacimiento' => '20/08/2006',
                'sexo' => 'F',
                'direccion' => 'Calle Bolívar #456',
                'telefono' => '72345678',
                'correo' => 'maria.garcia@email.com',
                'colegio_procedencia' => 'Colegio Alemán',
                'ciudad' => 'La Paz',
                'carrera_principal' => 'Ingeniería de Sistemas',
                'carrera_secundaria' => '',
                'titulo_bachiller' => 'SI',
                'año_bachillerato' => '2024',
                'turno_preferido' => 'Tarde',
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
            'direccion',
            'telefono',
            'correo',
            'colegio_procedencia',
            'ciudad',
            'carrera_principal',
            'carrera_secundaria',
            'titulo_bachiller',
            'año_bachillerato',
            'turno_preferido',
        ];
    }

    public function title(): string
    {
        return 'Postulantes';
    }
}
