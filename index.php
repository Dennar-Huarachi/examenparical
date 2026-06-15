<?php
// ==========================
// ENVIRONMENT DETECTION
// ==========================
$isLocal = in_array($_SERVER['REMOTE_ADDR'], ['127.0.0.1', '::1'], true);

// ==========================
// HELPER TO READ .ENV
// ==========================
function getEnvValue($key, $default = '') {
    $envPath = __DIR__ . '/segundo-parcial/.env';
    if (!file_exists($envPath)) {
        return $default;
    }
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') === false) continue;
        list($name, $value) = array_pad(explode('=', $line, 2), 2, null);
        if ($name !== null && trim($name) === $key) {
            $value = trim($value);
            if (preg_match('/^"([^"]*)"$/', $value, $matches) || preg_match('/^\'([^\']*)\'$/', $value, $matches)) {
                return $matches[1];
            }
            return $value;
        }
    }
    return $default;
}

// ==========================
// PORT CHECKS
// ==========================
function checkPort($host, $port) {
    $connection = @fsockopen($host, $port, $errno, $errstr, 0.5);
    if (is_resource($connection)) {
        fclose($connection);
        return true;
    }
    return false;
}

$backendRunning = checkPort('127.0.0.1', 8000);
$frontendPort = 5173;
$frontendRunning = false;
if (checkPort('127.0.0.1', 5173)) {
    $frontendPort = 5173;
    $frontendRunning = true;
} elseif (checkPort('127.0.0.1', 5174)) {
    $frontendPort = 5174;
    $frontendRunning = true;
}

// ==========================
// DATABASE CHECK
// ==========================
$dbConn = getEnvValue('DB_CONNECTION', 'pgsql');
$dbHost = getEnvValue('DB_HOST', '127.0.0.1');
$dbPort = getEnvValue('DB_PORT', '5432');
$dbDatabase = getEnvValue('DB_DATABASE', 'ficct_cup');
$dbUser = getEnvValue('DB_USERNAME', 'postgres');
$dbPassword = getEnvValue('DB_PASSWORD', 'admin123');

$dbStatus = 'Desconectado';
$dbError = '';
try {
    if ($dbConn === 'pgsql') {
        $dsn = "pgsql:host=$dbHost;port=$dbPort;dbname=$dbDatabase";
        $pdo = new PDO($dsn, $dbUser, $dbPassword, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_TIMEOUT => 1
        ]);
        $dbStatus = 'Conectado';
    } elseif ($dbConn === 'mysql') {
        $dsn = "mysql:host=$dbHost;port=$dbPort;dbname=$dbDatabase";
        $pdo = new PDO($dsn, $dbUser, $dbPassword, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_TIMEOUT => 1
        ]);
        $dbStatus = 'Conectado';
    } else {
        $dbStatus = 'Desconocido';
    }
} catch (Exception $e) {
    $dbStatus = 'Error de Conexión';
    $dbError = $e->getMessage();
}

// ==========================
// QUERY HANDLING (SAFE)
// ==========================
if (isset($_GET['q'])) {
    $query = $_GET['q'];
    if ($query === 'info') {
        if ($isLocal) {
            phpinfo();
            exit;
        }
        http_response_code(403);
        exit('Forbidden! phpinfo allowed ONLY on localhost');
    }
    http_response_code(404);
    exit('Invalid query parameter.');
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Segundo Parcial - Portal de Admisión FICCT</title>
    <meta name="description" content="Portal de control y accesos para el proyecto de Segundo Parcial de la FICCT. Verifica servidores, bases de datos y credenciales.">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-primary: #0f172a;
            --bg-secondary: #1e293b;
            --accent-primary: #3b82f6;
            --accent-secondary: #60a5fa;
            --success: #10b981;
            --error: #ef4444;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --glass-bg: rgba(30, 41, 59, 0.7);
            --glass-border: rgba(255, 255, 255, 0.08);
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Outfit', sans-serif;
            background-color: var(--bg-primary);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            overflow-x: hidden;
            position: relative;
        }

        /* Ambient background glow effects */
        .ambient-glow-1 {
            position: absolute;
            width: 500px;
            height: 500px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, rgba(0,0,0,0) 70%);
            top: -100px;
            left: -100px;
            z-index: 1;
            pointer-events: none;
        }

        .ambient-glow-2 {
            position: absolute;
            width: 600px;
            height: 600px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, rgba(0,0,0,0) 70%);
            bottom: -150px;
            right: -150px;
            z-index: 1;
            pointer-events: none;
        }

        .container {
            max-width: 900px;
            width: 95%;
            margin: 40px auto;
            z-index: 2;
        }

        /* Glassmorphic Card */
        .card {
            background: var(--glass-bg);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            text-align: center;
            transition: transform 0.3s ease;
        }

        .header {
            margin-bottom: 35px;
        }

        .title {
            font-size: 2.8rem;
            font-weight: 700;
            background: linear-gradient(135deg, #ffffff 0%, var(--accent-secondary) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
            letter-spacing: -0.5px;
        }

        .subtitle {
            color: var(--text-muted);
            font-size: 1.1rem;
            font-weight: 300;
        }

        /* Server Status Grid */
        .status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 20px;
            margin-bottom: 35px;
        }

        .status-card {
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid var(--glass-border);
            border-radius: 15px;
            padding: 20px;
            display: flex;
            align-items: center;
            gap: 15px;
            text-align: left;
            transition: all 0.2s ease;
        }

        .status-card:hover {
            border-color: rgba(59, 130, 246, 0.3);
            transform: translateY(-2px);
        }

        .status-icon {
            width: 45px;
            height: 45px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.05);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.4rem;
        }

        .status-details {
            flex-grow: 1;
        }

        .status-label {
            font-size: 0.85rem;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 3px;
        }

        .status-value {
            font-size: 1.05rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            display: inline-block;
        }

        .dot-running {
            background-color: var(--success);
            box-shadow: 0 0 10px var(--success);
            animation: pulse 1.8s infinite;
        }

        .dot-stopped {
            background-color: var(--error);
            box-shadow: 0 0 10px var(--error);
        }

        /* Action Buttons */
        .actions {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 15px;
            margin-bottom: 35px;
        }

        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 14px 28px;
            font-family: inherit;
            font-size: 1rem;
            font-weight: 500;
            border-radius: 12px;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.2s ease;
            gap: 8px;
            outline: none;
        }

        .btn-primary {
            background: linear-gradient(135deg, var(--accent-primary) 0%, #2563eb 100%);
            color: white;
            border: none;
            box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
        }

        .btn-primary:hover {
            background: linear-gradient(135deg, var(--accent-secondary) 0%, var(--accent-primary) 100%);
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
        }

        .btn-secondary {
            background: transparent;
            color: var(--text-main);
            border: 1px solid var(--glass-border);
        }

        .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.05);
            border-color: rgba(255, 255, 255, 0.2);
            transform: translateY(-2px);
        }

        .btn-disabled {
            background: rgba(255, 255, 255, 0.05);
            color: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.05);
            cursor: not-allowed;
            pointer-events: none;
        }

        /* Credentials Section */
        .credentials-box {
            background: rgba(15, 23, 42, 0.4);
            border: 1px solid var(--glass-border);
            border-radius: 15px;
            padding: 25px;
            text-align: left;
        }

        .credentials-title {
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 8px;
            color: var(--accent-secondary);
        }

        .credentials-table-wrapper {
            overflow-x: auto;
        }

        .credentials-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.95rem;
        }

        .credentials-table th, .credentials-table td {
            padding: 10px 12px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .credentials-table th {
            color: var(--text-muted);
            font-weight: 500;
            text-align: left;
        }

        .credentials-table code {
            background: rgba(255, 255, 255, 0.08);
            padding: 2px 6px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 0.9rem;
            color: var(--accent-secondary);
        }

        .footer {
            margin-top: 30px;
            font-size: 0.85rem;
            color: var(--text-muted);
        }

        .footer a {
            color: var(--accent-secondary);
            text-decoration: none;
            transition: color 0.2s ease;
        }

        .footer a:hover {
            color: var(--accent-primary);
            text-decoration: underline;
        }

        @keyframes pulse {
            0% {
                box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
            }
            70% {
                box-shadow: 0 0 0 8px rgba(16, 185, 129, 0);
            }
            100% {
                box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
            }
        }

        @media (max-width: 600px) {
            .card {
                padding: 25px 15px;
            }
            .title {
                font-size: 2rem;
            }
            .btn {
                width: 100%;
            }
        }
    </style>
</head>
<body>

    <div class="ambient-glow-1"></div>
    <div class="ambient-glow-2"></div>

    <div class="container">
        <main class="card">
            <header class="header">
                <h1 class="title" id="main-title">Admisión FICCT</h1>
                <p class="subtitle">Panel de Control & Accesos Locales - Segundo Parcial</p>
            </header>

            <!-- Status Indicators -->
            <section class="status-grid" aria-label="Estado de los servicios">
                <!-- Frontend -->
                <article class="status-card" id="status-frontend">
                    <div class="status-icon">💻</div>
                    <div class="status-details">
                        <p class="status-label">React Frontend</p>
                        <p class="status-value">
                            <span class="dot <?= $frontendRunning ? 'dot-running' : 'dot-stopped' ?>"></span>
                            <?= $frontendRunning ? "Puerto $frontendPort" : 'Inactivo' ?>
                        </p>
                    </div>
                </article>

                <!-- Backend -->
                <article class="status-card" id="status-backend">
                    <div class="status-icon">⚙️</div>
                    <div class="status-details">
                        <p class="status-label">Laravel API</p>
                        <p class="status-value">
                            <span class="dot <?= $backendRunning ? 'dot-running' : 'dot-stopped' ?>"></span>
                            <?= $backendRunning ? 'Puerto 8000' : 'Inactivo' ?>
                        </p>
                    </div>
                </article>

                <!-- Database -->
                <article class="status-card" id="status-database">
                    <div class="status-icon">🗄️</div>
                    <div class="status-details">
                        <p class="status-label">Base de Datos (<?= htmlspecialchars($dbConn) ?>)</p>
                        <p class="status-value" title="<?= htmlspecialchars($dbError) ?>">
                            <span class="dot <?= $dbStatus === 'Conectado' ? 'dot-running' : 'dot-stopped' ?>"></span>
                            <?= htmlspecialchars($dbStatus) ?>
                        </p>
                    </div>
                </article>
            </section>

            <!-- Actions -->
            <section class="actions">
                <?php if ($frontendRunning): ?>
                    <a href="http://localhost:<?= $frontendPort ?>" target="_blank" rel="noopener" class="btn btn-primary" id="btn-open-app">
                        🚀 Abrir Aplicación
                    </a>
                <?php else: ?>
                    <button class="btn btn-disabled" id="btn-open-app-disabled" disabled>
                        ❌ Iniciar frontend para abrir
                    </button>
                <?php endif; ?>

                <?php if ($backendRunning): ?>
                    <a href="http://127.0.0.1:8000/api/documentos" target="_blank" rel="noopener" class="btn btn-secondary" id="btn-open-api">
                        🔗 Probar API Backend
                    </a>
                <?php endif; ?>
                
                <?php if ($isLocal): ?>
                    <a href="/?q=info" class="btn btn-secondary" id="btn-phpinfo">
                        ℹ️ PHP Info
                    </a>
                <?php endif; ?>
            </section>

            <!-- Credentials Box -->
            <section class="credentials-box">
                <h2 class="credentials-title">
                    🔑 Credenciales de Prueba (Sembradas en BD)
                </h2>
                <div class="credentials-table-wrapper">
                    <table class="credentials-table">
                        <thead>
                            <tr>
                                <th>Rol</th>
                                <th>Email</th>
                                <th>Contraseña</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><strong>Administrador</strong></td>
                                <td><code>admin@admin.com</code></td>
                                <td><code>12345678</code></td>
                            </tr>
                            <tr>
                                <td><strong>Docente</strong></td>
                                <td><code>docente@admin.com</code></td>
                                <td><code>12345678</code></td>
                            </tr>
                            <tr>
                                <td><strong>Coordinador</strong></td>
                                <td><code>coordinador@admin.com</code></td>
                                <td><code>12345678</code></td>
                            </tr>
                            <tr>
                                <td><strong>Autoridad</strong></td>
                                <td><code>autoridad@admin.com</code></td>
                                <td><code>12345678</code></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            <footer class="footer">
                <p>Desarrollado con ❤️ para el Segundo Parcial. Entorno PHP: <?= htmlspecialchars(PHP_VERSION) ?></p>
            </footer>
        </main>
    </div>

</body>
</html>