<?php
// ================================================================
//  ProStockTool — conexion.php
//  Ubicación: database/conexion.php
//  Lee las constantes definidas por config.php
// ================================================================

if (!defined('DB_HOST')) {
    require_once __DIR__ . '/../config.php';
}

// ── Conexión mysqli (usada en todos los endpoints) ───────────────
$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT);

if ($conn->connect_errno) {
    $errMsg = defined('APP_DEBUG') && APP_DEBUG
        ? 'Error mysqli: ' . $conn->connect_error
        : 'Error de conexión a la base de datos';

    error_log('[ProStockTool] mysqli connect error: ' . $conn->connect_error);

    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => $errMsg]);
    exit;
}

$conn->set_charset(DB_CHARSET);

// ── Conexión PDO (opcional — InfinityFree puede no tenerla) ─────
//    Un fallo aquí NO mata el script, mysqli sigue disponible.
$conexion = null;
if (extension_loaded('pdo_mysql')) {
    try {
        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            DB_HOST, DB_PORT, DB_NAME, DB_CHARSET
        );
        $conexion = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    } catch (PDOException $e) {
        error_log('[ProStockTool] PDO connect error: ' . $e->getMessage());
    }
}