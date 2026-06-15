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
        .badge {
            display: inline-block;
            padding: 1px 5px;
            border-radius: 3px;
            font-size: 8px;
            font-weight: bold;
        }
        .badge-admitido { background-color: #27ae60; color: white; }
        .badge-reprobado { background-color: #e74c3c; color: white; }
        .badge-aprobado { background-color: #2ecc71; color: white; }
        .badge-inscrito { background-color: #f39c12; color: white; }
        .badge-pendiente { background-color: #95a5a6; color: white; }
        .page-break { page-break-after: always; }
    </style>
</head>
<body>
    <div class="header">
        <h1>UNIVERSIDAD CUP</h1>
        <h2>Reporte de Postulantes</h2>
        <p>Gestión: {{ $gestion->codigo }} | Generado: {{ $fecha }} | Usuario: {{ $usuario }}</p>
        <p>Modo: {{ $modo === 'estatico' ? 'Estático' : 'Dinámico' }}</p>
    </div>

    <table>
        <thead>
            <tr>
                <th>ID</th>
                <th>CI</th>
                <th>Nombres</th>
                <th>Apellidos</th>
                <th>Nota Final</th>
                <th>Estado</th>
                <th>Carrera Admitida</th>
            </tr>
        </thead>
        <tbody>
            @forelse($postulantes as $p)
            <tr>
                <td>{{ $p->id_postulante }}</td>
                <td>{{ $p->ci }}</td>
                <td>{{ $p->nombres }}</td>
                <td>{{ $p->apellidos }}</td>
                <td>{{ $p->nota_final ?? '-' }}</td>
                <td>
                    <span class="badge badge-{{ $p->estado }}">{{ $p->estado }}</span>
                </td>
                <td>{{ $p->carrera_admitida }}</td>
            </tr>
            @empty
            <tr>
                <td colspan="7" style="text-align:center;">No hay postulantes registrados.</td>
            </tr>
            @endforelse
        </tbody>
    </table>

    <div style="margin-top:10px; font-size:9px;">
        <p><strong>Total postulantes:</strong> {{ count($postulantes) }}</p>
    </div>

    <div class="footer">
        Generado el {{ $fecha }} por {{ $usuario }} | Sistema CUP - Admisión FICCT
    </div>
</body>
</html>
