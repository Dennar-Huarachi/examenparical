<?php

namespace App\Exports;

use App\Models\Bitacora;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class BitacoraExport implements FromCollection, WithHeadings, WithMapping, WithTitle, WithStyles
{
    protected $filtros;

    public function __construct($filtros = [])
    {
        $this->filtros = $filtros;
    }

    public function collection()
    {
        $query = Bitacora::with(['usuario.rol']);

        if (!empty($this->filtros['fecha_inicio'])) {
            $query->whereDate('created_at', '>=', $this->filtros['fecha_inicio']);
        }
        if (!empty($this->filtros['fecha_fin'])) {
            $query->whereDate('created_at', '<=', $this->filtros['fecha_fin']);
        }
        if (!empty($this->filtros['usuario_id'])) {
            $query->where('usuario_id', $this->filtros['usuario_id']);
        }
        if (!empty($this->filtros['accion'])) {
            $acciones = is_array($this->filtros['accion']) ? $this->filtros['accion'] : [$this->filtros['accion']];
            $query->whereIn('accion', $acciones);
        }
        if (!empty($this->filtros['tabla_afectada'])) {
            $query->where('tabla_afectada', 'like', '%' . $this->filtros['tabla_afectada'] . '%');
        }
        if (!empty($this->filtros['ip'])) {
            $query->where('ip', 'like', '%' . $this->filtros['ip'] . '%');
        }
        if (!empty($this->filtros['busqueda'])) {
            $busq = $this->filtros['busqueda'];
            $query->where(function ($q) use ($busq) {
                $q->where('detalle', 'like', "%{$busq}%")
                  ->orWhere('accion', 'like', "%{$busq}%");
            });
        }

        return $query->orderBy('created_at', 'desc')->get();
    }

    public function headings(): array
    {
        return ['ID', 'Usuario', 'Email', 'Rol', 'Acción', 'Tabla Afectada', 'Registro ID', 'Detalle', 'IP', 'Fecha y Hora'];
    }

    public function map($bitacora): array
    {
        return [
            $bitacora->id,
            $bitacora->usuario?->name ?? 'Sistema',
            $bitacora->usuario?->email ?? '-',
            $bitacora->usuario?->rol?->nombre ?? '-',
            $bitacora->accion,
            $bitacora->tabla_afectada ?? '-',
            $bitacora->registro_id ?? '-',
            $bitacora->detalle ?? '',
            $bitacora->ip ?? '-',
            $bitacora->created_at ? $bitacora->created_at->format('d/m/Y H:i:s') : '-',
        ];
    }

    public function title(): string
    {
        return 'Bitácora';
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
