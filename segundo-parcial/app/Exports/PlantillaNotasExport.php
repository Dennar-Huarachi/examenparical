<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;

class PlantillaNotasExport implements FromArray, WithHeadings, WithTitle
{
    protected $postulantes;
    protected $materiaNombre;

    public function __construct(array $postulantes, $materiaNombre)
    {
        $this->postulantes = $postulantes;
        $this->materiaNombre = $materiaNombre;
    }

    public function array(): array
    {
        $data = [];
        foreach ($this->postulantes as $p) {
            $data[] = [
                'ci' => $p['ci'],
                'nombres' => $p['nombres'],
                'apellidos' => $p['apellidos'],
                'nota' => '',
            ];
        }
        return $data;
    }

    public function headings(): array
    {
        return [
            'ci',
            'nombres',
            'apellidos',
            'nota',
        ];
    }

    public function title(): string
    {
        return 'Notas - ' . ($this->materiaNombre ?? 'Materia');
    }
}
