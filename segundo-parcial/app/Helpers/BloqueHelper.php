<?php

namespace App\Helpers;

class BloqueHelper
{
    public static function obtenerBloquesPorTurno(): array
    {
        return [
            'Mañana' => [
                ['nro' => 1,  'inicio' => '07:00', 'fin' => '07:45'],
                ['nro' => 2,  'inicio' => '07:45', 'fin' => '08:30'],
                ['nro' => 3,  'inicio' => '08:30', 'fin' => '09:15'],
                ['nro' => 4,  'inicio' => '09:15', 'fin' => '10:00'],
                ['nro' => 5,  'inicio' => '10:00', 'fin' => '10:45'],
                ['nro' => 6,  'inicio' => '10:45', 'fin' => '11:30'],
                ['nro' => 7,  'inicio' => '11:30', 'fin' => '12:15'],
            ],
            'Tarde' => [
                ['nro' => 1,  'inicio' => '14:00', 'fin' => '14:45'],
                ['nro' => 2,  'inicio' => '14:45', 'fin' => '15:30'],
                ['nro' => 3,  'inicio' => '15:30', 'fin' => '16:15'],
                ['nro' => 4,  'inicio' => '16:15', 'fin' => '17:00'],
                ['nro' => 5,  'inicio' => '17:00', 'fin' => '17:45'],
                ['nro' => 6,  'inicio' => '17:45', 'fin' => '18:30'],
            ],
            'Noche' => [
                ['nro' => 1,  'inicio' => '19:00', 'fin' => '19:45'],
                ['nro' => 2,  'inicio' => '19:45', 'fin' => '20:30'],
                ['nro' => 3,  'inicio' => '20:30', 'fin' => '21:15'],
                ['nro' => 4,  'inicio' => '21:15', 'fin' => '22:00'],
                ['nro' => 5,  'inicio' => '22:00', 'fin' => '22:45'],
                ['nro' => 6,  'inicio' => '22:45', 'fin' => '23:30'],
            ],
        ];
    }

    public static function calcularHorasBloque(string $turnoNombre, int $bloqueInicio, int $bloqueFin): ?array
    {
        $bloques = self::obtenerBloquesPorTurno()[$turnoNombre] ?? null;
        if (!$bloques) return null;

        $inicio = collect($bloques)->firstWhere('nro', $bloqueInicio);
        $fin = collect($bloques)->firstWhere('nro', $bloqueFin);
        if (!$inicio || !$fin) return null;

        return [
            'hora_inicio' => $inicio['inicio'],
            'hora_fin'    => $fin['fin'],
        ];
    }

    public static function calcularDuracionBloques(string $turnoNombre, int $bloqueInicio, int $bloqueFin): float
    {
        $horas = self::calcularHorasBloque($turnoNombre, $bloqueInicio, $bloqueFin);
        if (!$horas) return 0;
        return (strtotime($horas['hora_fin']) - strtotime($horas['hora_inicio'])) / 3600;
    }
}
