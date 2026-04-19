<?php
// ================================================================
//  ProStockTool — config.php
//  Cargador central de configuración
//  Ubicación: raíz del proyecto  (Pro-Stock-Tool/config.php)
//
//  Uso en cualquier PHP del proyecto:
//      require_once __DIR__ . '/config.php';   // si estás en raíz
//      require_once __DIR__ . '/../config.php'; // si estás en subdirectorio
// ================================================================

// ── 1. Cargador de .env minimalista (sin dependencias externas) ──
function pst_load_env(string $file): void
{
    if (!file_exists($file)) {
        return;
    }

    $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        // Ignorar comentarios y líneas vacías
        if ($line === '' || $line[0] === '#') {
            continue;
        }
        // Solo procesar líneas con formato KEY=VALUE
        if (!str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = explode('=', $line, 2);
        $key   = trim($key);
        $value = trim($value);
        // Eliminar comillas opcionales del valor
        if (strlen($value) >= 2
            && (($value[0] === '"'  && $value[-1] === '"')
             || ($value[0] === "'"  && $value[-1] === "'"))) {
            $value = substr($value, 1, -1);
        }
        if (!array_key_exists($key, $_ENV)) {
            $_ENV[$key]    = $value;
            putenv("$key=$value");
        }
    }
}

// ── 2. Ruta al .env (siempre en la raíz del proyecto) ───────────
define('PST_ROOT', dirname(__FILE__));
pst_load_env(PST_ROOT . '/.env');

// ── 3. Función helper para leer variables con valor por defecto ──
function env(string $key, mixed $default = null): mixed
{
    $val = $_ENV[$key] ?? getenv($key);
    if ($val === false || $val === '') {
        return $default;
    }
    // Convertir booleanos de string
    if (strtolower($val) === 'true')  return true;
    if (strtolower($val) === 'false') return false;
    if (strtolower($val) === 'null')  return null;
    return $val;
}

// ── 4. Configuración de errores según entorno ────────────────────
$appEnv   = env('APP_ENV', 'production');
$appDebug = env('APP_DEBUG', false);

if ($appDebug === true || $appEnv === 'development') {
    ini_set('display_errors',  '1');
    ini_set('display_startup_errors', '1');
    error_reporting(E_ALL);
} else {
    ini_set('display_errors',  '0');
    ini_set('display_startup_errors', '0');
    error_reporting(E_ALL & ~E_NOTICE & ~E_DEPRECATED);
    // En producción los errores van al log del servidor
    ini_set('log_errors', '1');
}

// ── 5. Configuración de sesión segura ───────────────────────────
if (session_status() === PHP_SESSION_NONE) {
    $sessionLifetime = (int) env('SESSION_LIFETIME', 86400);
    $sessionSecure   = env('SESSION_SECURE', false) === true;
    $sessionName     = env('SESSION_NAME', 'PST_SESSION');

    ini_set('session.gc_maxlifetime', $sessionLifetime);

    session_set_cookie_params([
        'lifetime' => $sessionLifetime,
        'path'     => '/',
        'domain'   => '',           // vacío = dominio actual
        'secure'   => $sessionSecure,
        'httponly' => true,         // siempre true
        'samesite' => 'Lax',        // protección CSRF básica
    ]);

    session_name($sessionName);
}

// ── 6. Zona horaria ─────────────────────────────────────────────
date_default_timezone_set('America/Bogota');

// ── 7. Constantes de configuración ──────────────────────────────
define('APP_ENV',    env('APP_ENV',    'production'));
define('APP_URL',    rtrim(env('APP_URL', ''), '/'));
define('APP_NAME',   env('APP_NAME',   'ProStockTool'));
define('APP_DEBUG',  $appDebug);
define('APP_SECRET', env('APP_SECRET', ''));

define('DB_HOST',    env('DB_HOST',    'sql201.infinityfree.com'));
define('DB_PORT',    (int) env('DB_PORT', 3306));
define('DB_NAME',    env('DB_NAME',    'if0_41398178_prostocktool'));
define('DB_USER',    env('DB_USER',    'if0_41398178'));
define('DB_PASS',    env('DB_PASS',    'z17e05d2025an'));
define('DB_CHARSET', env('DB_CHARSET', 'utf8mb4'));

define('UPLOAD_PATH',     PST_ROOT . '/' . trim(env('UPLOAD_PATH', 'uploads'), '/'));
define('UPLOAD_MAX_SIZE', (int) env('UPLOAD_MAX_SIZE', 2097152));
