<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recuperación de contraseña - Sistema CUP</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .container {
            max-width: 600px;
            margin: 30px auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }
        .header {
            background-color: #1e3a5f;
            padding: 30px 40px;
            text-align: center;
        }
        .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 28px;
            font-weight: 700;
        }
        .body {
            padding: 40px;
            color: #333333;
            line-height: 1.6;
        }
        .body p {
            margin: 0 0 20px 0;
            font-size: 16px;
        }
        .button-container {
            text-align: center;
            margin: 30px 0;
        }
        .button {
            display: inline-block;
            padding: 14px 36px;
            background-color: #2563eb;
            color: #ffffff;
            text-decoration: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
        }
        .warning {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 12px 16px;
            margin: 20px 0;
            font-size: 14px;
            color: #856404;
            border-radius: 4px;
        }
        .footer {
            padding: 20px 40px;
            text-align: center;
            font-size: 12px;
            color: #999999;
            border-top: 1px solid #eeeeee;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Sistema CUP</h1>
        </div>
        <div class="body">
            <p>Hola, <strong>{{ $usuario->nombre }} {{ $usuario->apellido }}</strong></p>

            <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>

            <div class="button-container">
                <a href="{{ $link }}" class="button">Restablecer contraseña</a>
            </div>

            <div class="warning">
                ⚠ Este link expira en <strong>60 minutos</strong>. Si no solicitaste esto, ignora este email.
            </div>

            <p style="color: #666; font-size: 14px;">
                Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:<br>
                <span style="color: #2563eb; word-break: break-all;">{{ $link }}</span>
            </p>
        </div>
        <div class="footer">
            <p>Sistema de Admisión CUP &mdash; FICCT</p>
            <p>&copy; {{ date('Y') }} Todos los derechos reservados</p>
        </div>
    </div>
</body>
</html>
