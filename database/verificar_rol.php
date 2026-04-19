<?php
// ================================================================
//  ProStockTool — verificar_rol.php
//  Middleware de Roles y Permisos
//  Ubicación: database/verificar_rol.php
// ================================================================

function iniciarSesionSegura(): void {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
}

function obtenerRolSesion(): ?string {
    iniciarSesionSegura();
    return $_SESSION['usuario_rol'] ?? null;
}

function obtenerIdSesion(): ?int {
    iniciarSesionSegura();
    return isset($_SESSION['usuario_id']) ? (int)$_SESSION['usuario_id'] : null;
}

/**
 * Verifica que el usuario tenga uno de los roles permitidos.
 * Si no, responde 403 y termina.
 */
function verificarRolPermitido(array $rolesPermitidos): void {
    $rol = obtenerRolSesion();
    if (!$rol || !in_array($rol, $rolesPermitidos, true)) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error'   => 'Acceso denegado. No tienes permisos para esta acción.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

/**
 * Bloquea escritura (POST/PUT/DELETE/PATCH) para roles que no sean admin.
 */
function bloquearEscritura(): void {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (in_array($method, ['POST', 'PUT', 'DELETE', 'PATCH'], true)) {
        $rol = obtenerRolSesion();
        if ($rol !== 'admin') {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'error'   => 'Acceso denegado. Solo el administrador puede modificar esta información.'
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }
}

/**
 * Bloquea completamente el acceso a roles que no sean admin.
 */
function soloAdmin(): void {
    $rol = obtenerRolSesion();
    if ($rol !== 'admin') {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error'   => 'Acceso denegado. Este módulo es exclusivo del administrador.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

/**
 * Bloquea el acceso al rol tendero.
 */
function bloquearTendero(): void {
    $rol = obtenerRolSesion();
    if ($rol === 'tendero') {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error'   => 'Acceso denegado para este rol.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

/**
 * Verifica que el usuario esté autenticado (sesión activa + token válido en BD).
 * Si no, responde 401.
 */
function verificarAutenticacion(): int {
    global $conn;
    
    iniciarSesionSegura();
    
    if (empty($_SESSION['usuario_id']) || empty($_SESSION['token'])) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error'   => 'No autenticado. Inicia sesión primero.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $usuario_id = (int)$_SESSION['usuario_id'];
    $token = $conn->real_escape_string($_SESSION['token']);

    // Validar que el token exista en BD y no esté expirado
    $sql = "SELECT s.id, u.id as uid, u.estado 
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
        echo json_encode([
            'success' => false,
            'error'   => 'Sesión expirada o inválida. Inicia sesión nuevamente.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    return $usuario_id;
    }

?>