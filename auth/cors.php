<?php
// ================================================================
//  ProStockTool — cors.php
//  Helper centralizado de cabeceras CORS y Content-Type
//  Ubicación: database/cors.php
// ================================================================

if (!defined('APP_URL')) {
    require_once __DIR__ . '/../config.php';
}

/**
 * Emite las cabeceras CORS correctas y responde al preflight OPTIONS.
 *
 * En producción solo se permite el origen definido en APP_URL.
 * En development se refleja el origen de la petición (más permisivo).
 *
 * @param string[] $methods  Métodos HTTP permitidos en este endpoint
 */
function pst_cors(array $methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']): void
{
    $allowedOrigin = rtrim(APP_URL, '/');
    $requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';

    if (APP_ENV === 'development' || $allowedOrigin === '') {
        $origin = $requestOrigin !== '' ? $requestOrigin : '*';
        header('Access-Control-Allow-Origin: ' . $origin);
    } else {
        header('Access-Control-Allow-Origin: ' . $allowedOrigin);
    }

    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: ' . implode(', ', $methods));
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Access-Control-Max-Age: 86400');
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}