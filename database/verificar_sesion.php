<?php
// ================================================================
//  ProStockTool — verificar_sesion.php
//  Ubicación: database/verificar_sesion.php
//  Método: GET
// ================================================================

require_once __DIR__ . '/../config.php';

require_once __DIR__ . '/cors.php';
pst_cors(['GET', 'OPTIONS']);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/conexion.php';

try {
    // Sin sesión activa
    if (empty($_SESSION['usuario_id']) || empty($_SESSION['token'])) {
        echo json_encode([
            'success'       => false,
            'authenticated' => false,
            'message'       => 'No hay sesión activa'
        ]);
        exit;
    }

    $usuario_id = (int) $_SESSION['usuario_id'];
    $token      = $conn->real_escape_string($_SESSION['token']);

    // Verificar token en BD (no expirado + usuario activo)
    $sql = "SELECT s.id, s.expira_en,
                   u.id    AS usuario_id,
                   u.email, u.nombre, u.rol, u.estado
            FROM sesiones s
            INNER JOIN usuarios u ON s.usuario_id = u.id
            WHERE s.usuario_id = $usuario_id
              AND s.token      = '$token'
              AND s.expira_en  > NOW()
              AND u.estado     = 'activo'
            LIMIT 1";

    $result = $conn->query($sql);

    if (!$result || $result->num_rows === 0) {
        // Sesión expirada — limpiar
        $_SESSION = [];
        session_destroy();

        echo json_encode([
            'success'       => false,
            'authenticated' => false,
            'message'       => 'Sesión expirada o inválida'
        ]);
        exit;
    }

    $usuario = $result->fetch_assoc();

    echo json_encode([
        'success'       => true,
        'authenticated' => true,
        'user'          => [
            'id'     => (int) $usuario['usuario_id'],
            'email'  => $usuario['email'],
            'nombre' => $usuario['nombre'],
            'rol'    => $usuario['rol']
        ]
    ]);

} catch (Exception $e) {
    error_log('[ProStockTool] verificar_sesion.php Exception: ' . $e->getMessage());
    $errMsg = defined('APP_DEBUG') && APP_DEBUG ? $e->getMessage() : 'Error al verificar sesión';
    http_response_code(500);
    echo json_encode([
        'success'       => false,
        'authenticated' => false,
        'error'         => $errMsg
    ]);
}

$conn->close();