<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 10px;
            color: #333;
            margin: 20px;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 3px solid #1E3A5F;
            padding-bottom: 10px;
        }
        .header h1 {
            font-size: 20px;
            color: #1E3A5F;
            margin: 0 0 5px 0;
            font-weight: bold;
        }
        .header h2 {
            font-size: 14px;
            color: #444;
            margin: 0 0 3px 0;
        }
        .header p {
            font-size: 10px;
            color: #666;
            margin: 2px 0;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        th {
            background-color: #1E3A5F;
            color: white;
            padding: 6px 4px;
            font-size: 8px;
            text-transform: uppercase;
            text-align: left;
            font-weight: bold;
        }
        td {
            padding: 4px;
            border: 1px solid #ddd;
            font-size: 9px;
        }
        tr:nth-child(even) td {
            background-color: #f5f6fa;
        }
        .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 8px;
            color: #999;
            border-top: 1px solid #ddd;
            padding-top: 8px;
        }
        .alerta-ocupacion {
            color: #e74c3c;
            font-weight: bold;
        }
        .page-break { page-break-after: always; }
    </style>
</head>
<body>
    <div class="header">
        <h1>UNIVERSIDAD CUP</h1>
        <h2>Reporte de Grupos</h2>
        <p>Gestión: {{ $gestion->codigo }} | Generado: {{ $fecha }} | Usuario: {{ $usuario }}</p>
        <p>Modo: {{ $modo === 'estatico' ? 'Estático' : 'Dinámico' }}</p>
    </div>

    <table>
        <thead>
            <tr>
                <th>Grupo</th>
                <th>Turno</th>
                <th>Modalidad</th>
                <th>Inscritos</th>
                <th>Capacidad</th>
                <th>Ocupación %</th>
                <th>Promedio</th>
                <th>Nota Máx</th>
                <th>Nota Mín</th>
                <th>Docentes</th>
            </tr>
        </thead>
        <tbody>
            @forelse($grupos as $g)
            <tr>
                <td>{{ $g->nombre }}</td>
                <td>{{ $g->turno ?? '-' }}</td>
                <td>{{ $g->modalidad }}</td>
                <td>{{ $g->total_inscritos }}</td>
                <td>{{ $g->capacidad_maxima }}</td>
                <td class="{{ $g->ocupacion > 95 ? 'alerta-ocupacion' : '' }}">
                    {{ $g->ocupacion }}%
                </td>
                <td>{{ $g->promedio_notas ?? '-' }}</td>
                <td>{{ $g->nota_maxima ?? '-' }}</td>
                <td>{{ $g->nota_minima ?? '-' }}</td>
                <td>{{ $g->docentes ?: 'Sin docentes' }}</td>
            </tr>
            @empty
            <tr>
                <td colspan="10" style="text-align:center;">No hay grupos registrados.</td>
            </tr>
            @endforelse
        </tbody>
    </table>

    <div style="margin-top:10px; font-size:9px;">
        <p><strong>Total grupos:</strong> {{ count($grupos) }}</p>
    </div>

    <div class="footer">
        Generado el {{ $fecha }} por {{ $usuario }} | Sistema CUP - Admisión FICCT
    </div>
</body>
</html>
