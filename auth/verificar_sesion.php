<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
if (isset($_SERVER['HTTP_ORIGIN'])) {
    header('Access-Control-Allow-Origin: ' . $_SERVER['HTTP_ORIGIN']);
    header('Access-Control-Allow-Credentials: true');
}
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../database/conexion.php';

try {
    if (empty($_SESSION['usuario_id']) || empty($_SESSION['token'])) {
        echo json_encode(['success' => false, 'authenticated' => false, 'message' => 'No hay sesión activa']);
        exit;
    }

    $usuario_id = (int) $_SESSION['usuario_id'];
    $token      = $conn->real_escape_string($_SESSION['token']);

    $sql = "SELECT s.id, u.id AS usuario_id, u.email, u.nombre, u.rol, u.estado
            FROM sesiones s
            INNER JOIN usuarios u ON s.usuario_id = u.id
            WHERE s.usuario_id = $usuario_id
              AND s.token      = '$token'
              AND s.expira_en  > NOW()
              AND u.estado     = 'activo'
            LIMIT 1";

    $result = $conn->query($sql);

    if (!$result || $result->num_rows === 0) {
        $_SESSION = [];
        session_destroy();
        echo json_encode(['success' => false, 'authenticated' => false, 'message' => 'Sesión expirada o inválida']);
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
    http_response_code(500);
    echo json_encode(['success' => false, 'authenticated' => false, 'error' => 'Error al verificar sesión']);
}

$conn->close();
?>