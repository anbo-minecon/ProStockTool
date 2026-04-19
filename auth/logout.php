<?php
// ================================================================
//  ProStockTool — logout.php
//  Ubicación: database/logout.php
//  Método: POST
// ================================================================

require_once __DIR__ . '/../config.php';

require_once __DIR__ . '/cors.php';
pst_cors(['POST', 'OPTIONS']);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/conexion.php';

try {
    $usuario_id = $_SESSION['usuario_id'] ?? null;
    $token      = $_SESSION['token']      ?? null;
    $ip         = $conn->real_escape_string($_SERVER['REMOTE_ADDR']    ?? 'unknown');
    $ua         = $conn->real_escape_string($_SERVER['HTTP_USER_AGENT'] ?? 'unknown');

    if ($usuario_id && $token) {
        $tokenEsc = $conn->real_escape_string($token);

        // Invalidar el token en BD
        $conn->query("DELETE FROM sesiones WHERE token = '$tokenEsc'");

        // Registrar auditoría
        $conn->query(
            "INSERT INTO auditoria (usuario_id, accion, ip_address, user_agent)
             VALUES ($usuario_id, 'logout', '$ip', '$ua')"
        );
    }

    // Vaciar sesión PHP
    $_SESSION = [];

    // Destruir la cookie de sesión con los mismos parámetros con que fue creada
    $cookieName = session_name();
    if (isset($_COOKIE[$cookieName])) {
        $params = session_get_cookie_params();
        setcookie(
            $cookieName,
            '',
            time() - 3600,
            $params['path'],
            $params['domain'],
            $params['secure'],
            $params['httponly']
        );
    }

    session_destroy();

    echo json_encode(['success' => true, 'message' => 'Sesión cerrada exitosamente']);

} catch (Exception $e) {
    error_log('[ProStockTool] logout.php Exception: ' . $e->getMessage());
    $errMsg = defined('APP_DEBUG') && APP_DEBUG ? $e->getMessage() : 'Error al cerrar sesión';
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $errMsg]);
}

$conn->close();