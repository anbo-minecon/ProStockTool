<?php
// ================================================================
//  ProStockTool — conexion.php
//  Ubicación: auth/conexion.php (Legacy - redirige a database/conexion.php)
//  Lee las constantes definidas por config.php
// ================================================================

// Cargar configuración
require_once __DIR__ . '/../config.php';

// Verificar constantes cargadas correctamente
if (!defined('DB_HOST') || !defined('DB_USER') || !defined('DB_PASS') || !defined('DB_NAME')) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Configuración incompleta - contacte al administrador']);
    error_log('[ProStockTool] Constantes BD no definidas. DB_HOST=' . (defined('DB_HOST') ? 'OK' : 'FALTA'));
    exit;
}

// ── Conexión mysqli ───────────────────────────────────────────────
$conn = new mysqli(
    DB_HOST,
    DB_USER,
    DB_PASS,
    DB_NAME,
    (int) env('DB_PORT', 3306)
);

// Verificar conexión
if ($conn->connect_errno) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    
    $errMsg = (defined('APP_DEBUG') && APP_DEBUG)
        ? 'Error mysqli: ' . $conn->connect_error
        : 'Error de conexión a la base de datos';
    
    error_log('[ProStockTool] mysqli ERROR: ' . $conn->connect_error . 
              ' [Host: ' . DB_HOST . ', DB: ' . DB_NAME . ']');
    
    echo json_encode(['error' => $errMsg, 'debug' => $conn->connect_error]);
    exit;
}

// Establecer charset
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