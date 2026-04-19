<?php
// ================================================================
//  ProStockTool — login.php
//  Ubicación: database/login.php (ENDPOINT OFICIAL)
//  Método: POST  |  Body JSON: { "email": "...", "contrasena": "..." }
// ================================================================

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/cors.php';
pst_cors(['POST', 'OPTIONS']);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/conexion.php';

header('Content-Type: application/json; charset=utf-8');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Método no permitido']);
        exit;
    }

    $input = file_get_contents('php://input');
    $data  = json_decode($input, true);

    if (!$data) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Datos inválidos']);
        exit;
    }

    $email      = isset($data['email'])      ? trim($data['email']) : '';
    $contrasena = isset($data['contrasena']) ? (string)$data['contrasena'] : '';

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Email inválido']);
        exit;
    }

    if (strlen($contrasena) < 6) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Contraseña muy corta']);
        exit;
    }

    // Buscar usuario
    $emailEsc = $conn->real_escape_string($email);
    $sql = "SELECT id, email, nombre, identidad, password, rol, estado, 
                   intentos_fallidos, bloqueado_hasta
            FROM usuarios
            WHERE email = '$emailEsc'
            LIMIT 1";

    $result = $conn->query($sql);

    if (!$result || $result->num_rows === 0) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Credenciales incorrectas']);
        exit;
    }

    $usuario = $result->fetch_assoc();

    // Verificar bloqueo temporal
    if ($usuario['bloqueado_hasta'] && strtotime($usuario['bloqueado_hasta']) > time()) {
        $minutos = (int) ceil((strtotime($usuario['bloqueado_hasta']) - time()) / 60);
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error'   => "Cuenta bloqueada. Intente en $minutos minuto(s)."
        ]);
        exit;
    }

    // Verificar estado
    if ($usuario['estado'] !== 'activo') {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Cuenta inactiva. Contacte al administrador.']);
        exit;
    }

    // Verificar contraseña
    if (!password_verify($contrasena, $usuario['password'])) {
        $intentos = $usuario['intentos_fallidos'] + 1;
        $actualizarBloqueo = '';

        if ($intentos >= 5) {
            $actualizarBloqueo = ", bloqueado_hasta = DATE_ADD(NOW(), INTERVAL 15 MINUTE)";
            $intentos = 0;
        }

        $conn->query(
            "UPDATE usuarios SET intentos_fallidos = $intentos $actualizarBloqueo WHERE id = {$usuario['id']}"
        );

        $msgExtra = ($intentos >= 4) ? " Intento $intentos de 5." : '';
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Contraseña incorrecta.' . $msgExtra]);
        exit;
    }

    // Login exitoso
    $conn->query(
        "UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL, ultimo_acceso = NOW() 
         WHERE id = {$usuario['id']}"
    );

    // Generar token
    $token = bin2hex(random_bytes(32));
    $expira_en = date('Y-m-d H:i:s', time() + 86400);
    $ip = $conn->real_escape_string($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    $ua = $conn->real_escape_string($_SERVER['HTTP_USER_AGENT'] ?? 'unknown');
    $tokenEsc = $conn->real_escape_string($token);

    $conn->query(
        "INSERT INTO sesiones (usuario_id, token, ip_address, user_agent, expira_en)
         VALUES ({$usuario['id']}, '$tokenEsc', '$ip', '$ua', '$expira_en')"
    );

    // Auditoría
    @$conn->query(
        "INSERT INTO auditoria (usuario_id, accion, ip_address, user_agent)
         VALUES ({$usuario['id']}, 'login', '$ip', '$ua')"
    );

    // Crear sesión PHP
    session_regenerate_id(true);
    $_SESSION['usuario_id']   = $usuario['id'];
    $_SESSION['usuario_email'] = $usuario['email'];
    $_SESSION['usuario_nombre'] = $usuario['nombre'];
    $_SESSION['usuario_rol']  = $usuario['rol'];
    $_SESSION['token']        = $token;

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Inicio de sesión exitoso',
        'data' => [
            'id'     => $usuario['id'],
            'email'  => $usuario['email'],
            'nombre' => $usuario['nombre'],
            'rol'    => $usuario['rol'],
            'token'  => $token
        ]
    ]);

} catch (Exception $e) {
    error_log('[ProStockTool] database/login.php Exception: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error del servidor: ' . (APP_DEBUG ? $e->getMessage() : 'Contacte al administrador')
    ]);
}

if (isset($conn)) {
    $conn->close();
}
