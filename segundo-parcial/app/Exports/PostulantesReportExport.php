<?php

namespace App\Exports;

use App\Models\Postulante;
use App\Models\Materia;
use App\Models\Gestion;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class PostulantesReportExport implements FromCollection, WithHeadings, WithMapping, WithTitle, WithStyles
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
        $query = Postulante::with(['carreraAdmitida', 'carreraPrincipal', 'carreraSecundaria', 'notasMateria.materia'])
            ->where('gestion_id', $this->gestionId);

        if ($this->modo === 'dinamico' && !empty($this->filtros)) {
            if (!empty($this->filtros['estado'])) {
                $query->where('estado', $this->filtros['estado']);
            }
            if (!empty($this->filtros['carrera_principal_id'])) {
                $query->where('carrera_principal_id', $this->filtros['carrera_principal_id']);
            }
            if (!empty($this->filtros['carrera_admitida_id'])) {
                $query->where('carrera_admitida_id', $this->filtros['carrera_admitida_id']);
            }
            if (!empty($this->filtros['turno_preferido'])) {
                $query->where('turno_preferido', $this->filtros['turno_preferido']);
            }
            if (!empty($this->filtros['nota_min'])) {
                $query->where('nota_final', '>=', (float) $this->filtros['nota_min']);
            }
            if (!empty($this->filtros['nota_max'])) {
                $query->where('nota_final', '<=', (float) $this->filtros['nota_max']);
            }
        }

        return $query->orderByRaw('nota_final DESC NULLS LAST')->get();
    }

    public function headings(): array
    {
        $cols = ['ID Postulante', 'CI', 'Nombres', 'Apellidos', 'Nota Final', 'Estado', 'Carrera Admitida'];

        if ($this->modo === 'dinamico') {
            if (!empty($this->filtros['incluir_carrera_secundaria'])) {
                $cols[] = 'Carrera Secundaria';
            }
            if (!empty($this->filtros['incluir_turno'])) {
                $cols[] = 'Turno Preferido';
            }
            if (!empty($this->filtros['incluir_colegio'])) {
                $cols[] = 'Colegio Procedencia';
            }
            if (!empty($this->filtros['incluir_notas_materia'])) {
                $materias = Materia::orderBy('nombre')->get();
                foreach ($materias as $m) {
                    $cols[] = $m->nombre;
                }
            }
        }

        return $cols;
    }

    public function map($postulante): array
    {
        $row = [
            $postulante->id_postulante,
            $postulante->ci,
            $postulante->nombres,
            $postulante->apellidos,
            $postulante->nota_final,
            $postulante->estado,
            $postulante->carreraAdmitida?->nombre ?? '',
        ];

        if ($this->modo === 'dinamico') {
            if (!empty($this->filtros['incluir_carrera_secundaria'])) {
                $row[] = $postulante->carreraSecundaria?->nombre ?? '';
            }
            if (!empty($this->filtros['incluir_turno'])) {
                $row[] = $postulante->turno_preferido ?? '';
            }
            if (!empty($this->filtros['incluir_colegio'])) {
                $row[] = $postulante->colegio_procedencia ?? '';
            }
            if (!empty($this->filtros['incluir_notas_materia'])) {
                $materias = Materia::orderBy('nombre')->get();
                $notasPorMateria = $postulante->notasMateria->keyBy('materia_id');
                foreach ($materias as $m) {
                    $nm = $notasPorMateria->get($m->id);
                    $row[] = $nm ? (float) $nm->promedio : '';
                }
            }
        }

        return $row;
    }

    public function title(): string
    {
        return 'Postulantes';
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
