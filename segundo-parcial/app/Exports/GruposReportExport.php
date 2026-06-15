<?php

namespace App\Exports;

use App\Models\Grupo;
use App\Models\Gestion;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class GruposReportExport implements FromCollection, WithHeadings, WithMapping, WithTitle, WithStyles
{
    protected $gestionId;
    protected $filtros;
    protected $modo;

    public function __construct($gestionId, $modo = 'estatico', $filtros = [])
    {
        $this->gestionId = $gestionId;
        $this->modo = $modo;
        $this->filtros = $filtros;
    }

    public function collection()
    {
        $query = Grupo::with(['turno', 'postulantes', 'horarios.materia', 'horarios.docente.postulanteDocente'])
            ->where('gestion_id', $this->gestionId);

        if ($this->modo === 'dinamico') {
            if (!empty($this->filtros['turno_id'])) {
                $query->where('turno_id', $this->filtros['turno_id']);
            }
            if (!empty($this->filtros['modalidad'])) {
                $query->where('modalidad', $this->filtros['modalidad']);
            }
            if (!empty($this->filtros['estado'])) {
                $query->where('estado', $this->filtros['estado']);
            }
        }

        return $query->orderBy('nombre')->get();
    }

    public function headings(): array
    {
        return [
            'Grupo', 'Turno', 'Modalidad', 'Inscritos', 'Capacidad',
            'Ocupación %', 'Promedio Notas', 'Nota Máx', 'Nota Mín', 'Docentes Asignados',
        ];
    }

    public function map($grupo): array
    {
        $notas = $grupo->postulantes->pluck('nota_final')->filter(function ($n) { return !is_null($n); });
        $promedio = $notas->count() > 0 ? round($notas->avg(), 2) : null;
        $notaMax = $notas->count() > 0 ? $notas->max() : null;
        $notaMin = $notas->count() > 0 ? $notas->min() : null;
        $ocupacion = $grupo->capacidad_maxima > 0 ? round(($grupo->total_inscritos / $grupo->capacidad_maxima) * 100, 1) : 0;

        $docentes = $grupo->horarios->map(function ($h) {
            $doc = $h->docente;
            if ($doc && $doc->postulanteDocente) {
                return $doc->postulanteDocente->nombres . ' ' . $doc->postulanteDocente->apellidos . ' (' . ($h->materia->nombre ?? '') . ')';
            }
            return null;
        })->filter()->implode(', ');

        return [
            $grupo->nombre,
            $grupo->turno?->nombre ?? '',
            $grupo->modalidad,
            $grupo->total_inscritos,
            $grupo->capacidad_maxima,
            $ocupacion,
            $promedio,
            $notaMax,
            $notaMin,
            $docentes,
        ];
    }

    public function title(): string
    {
        return 'Grupos';
    }

    public function styles(Worksheet $sheet)
    {
        $sheet->getStyle('A1:' . $sheet->getHighestColumn() . '1')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => 'solid', 'startColor' => ['rgb' => '1E3A5F']],
        ]);
        return [];
    }
}
