<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;

class ErroresExport implements FromArray, WithHeadings, WithTitle
{
    protected $errores;

    public function __construct(array $errores)
    {
        $this->errores = $errores;
    }

    public function array(): array
    {
        return $this->errores;
    }

    public function headings(): array
    {
        return ['Fila', 'CI', 'Motivo del Error'];
    }

    public function title(): string
    {
        return 'Errores';
    }
}
