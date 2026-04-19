<?php
// ================================================================
//  ProStockTool — middleware.php
//  Middleware de autenticación centralizado
//  Ubicación: database/middleware.php
// ================================================================

/**
 * Verifica que el usuario esté autenticado validando sesión + token en BD
 * Si falla, responde 401 y termina la ejecución
 */
function verificarAutenticacion(): int
{
    global $conn;

    // Iniciar sesión si no está iniciada
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    // Verificar que hay sesión
    if (empty($_SESSION['usuario_id']) || empty($_SESSION['token'])) {
        http_response_code(401);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => false,
            'error' => 'No autenticado. Inicia sesión primero.'
        ]);
        exit;
    }

    $usuario_id = (int)$_SESSION['usuario_id'];
    $token = $conn->real_escape_string($_SESSION['token']);

    // Verificar que el token sea válido y no haya expirado
    $sql = "SELECT s.id, s.expira_en, u.id as uid, u.email, u.nombre, u.rol, u.estado
            FROM sesiones s
            INNER JOIN usuarios u ON s.usuario_id = u.id
            WHERE s.usuario_id = $usuario_id
              AND s.token = '$token'
              AND s.expira_en > NOW()
              AND u.estado = 'activo'
            LIMIT 1";

    $result = $conn->query($sql);

    if (!$result || $result->num_rows === 0) {
        // Sesión inválida o expirada
        $_SESSION = [];
        session_destroy();

        http_response_code(401);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => false,
            'error' => 'Sesión expirada. Inicia sesión nuevamente.'
        ]);
        exit;
    }

    $usuario = $result->fetch_assoc();
    
    return (int)$usuario['uid'];
}

/**
 * Verifica que el usuario tenga un rol permitido
 */
function verificarRol(array $rolesPermitidos): void
{
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    $rol = $_SESSION['usuario_rol'] ?? null;

    if (!$rol || !in_array($rol, $rolesPermitidos, true)) {
        http_response_code(403);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => false,
            'error' => 'No tienes permisos para esta acción.'
        ]);
        exit;
    }
}
