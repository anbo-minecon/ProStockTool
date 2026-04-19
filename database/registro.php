<?php
// ================================================================
//  ProStockTool — registro.php
//  Registro de nuevos usuarios (solo desde panel admin)
//  Ubicación: Pro-Stock-Tool/database/registro.php
//  Método: POST
//  Body JSON: { "email", "nombre", "identidad", "contrasena" }
// ================================================================

require_once __DIR__ . '/../config.php';

require_once __DIR__ . '/cors.php';
pst_cors(['POST', 'OPTIONS']);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/conexion.php';

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

    $email      = isset($data['email'])      ? trim($data['email'])      : '';
    $nombre     = isset($data['nombre'])     ? trim($data['nombre'])     : '';
    $identidad  = isset($data['identidad'])  ? trim($data['identidad'])  : '';
    $contrasena = isset($data['contrasena']) ? (string) $data['contrasena'] : '';

    // ── Validaciones ─────────────────────────────────────────────
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Email inválido']);
        exit;
    }

    if (strlen($nombre) < 2 || strlen($nombre) > 100) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'El nombre debe tener entre 2 y 100 caracteres']);
        exit;
    }

    if (!preg_match('/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/', $nombre)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'El nombre solo debe contener letras']);
        exit;
    }

    if (!preg_match('/^[0-9]{6,20}$/', $identidad)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'La identidad debe contener entre 6 y 20 dígitos']);
        exit;
    }

    if (strlen($contrasena) < 6) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'La contraseña debe tener mínimo 6 caracteres']);
        exit;
    }

    $emailEsc     = $conn->real_escape_string($email);
    $identidadEsc = $conn->real_escape_string($identidad);

    // ── Verificar duplicados ──────────────────────────────────────
    $checkEmail = $conn->query("SELECT id FROM usuarios WHERE email = '$emailEsc' LIMIT 1");
    if ($checkEmail && $checkEmail->num_rows > 0) {
        http_response_code(409);
        echo json_encode(['success' => false, 'error' => 'El email ya está registrado']);
        exit;
    }

    $checkId = $conn->query("SELECT id FROM usuarios WHERE identidad = '$identidadEsc' LIMIT 1");
    if ($checkId && $checkId->num_rows > 0) {
        http_response_code(409);
        echo json_encode(['success' => false, 'error' => 'El número de identidad ya está registrado']);
        exit;
    }

    // ── Insertar usuario ──────────────────────────────────────────
    $nombre    = ucwords(strtolower($nombre));
    $nombreEsc = $conn->real_escape_string($nombre);
    $hash      = password_hash($contrasena, PASSWORD_BCRYPT, ['cost' => 12]);
    $hashEsc   = $conn->real_escape_string($hash);

    $ip = $conn->real_escape_string($_SERVER['REMOTE_ADDR']    ?? 'unknown');
    $ua = $conn->real_escape_string($_SERVER['HTTP_USER_AGENT'] ?? 'unknown');

    $conn->begin_transaction();

    try {
        $sql = "INSERT INTO usuarios (email, nombre, identidad, password, rol, estado, creado_en)
                VALUES ('$emailEsc', '$nombreEsc', '$identidadEsc', '$hashEsc', 'tendero', 'activo', NOW())";

        if (!$conn->query($sql)) {
            throw new Exception('Error al registrar usuario: ' . $conn->error);
        }

        $nuevo_id = $conn->insert_id;

        $conn->query(
            "INSERT INTO auditoria (usuario_id, accion, tabla_afectada, registro_id, ip_address, user_agent)
             VALUES ($nuevo_id, 'registro_usuario', 'usuarios', $nuevo_id, '$ip', '$ua')"
        );

        $conn->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Registro exitoso. Ya puedes iniciar sesión.',
            'data'    => [
                'id'     => $nuevo_id,
                'email'  => $email,
                'nombre' => $nombre
            ]
        ]);

    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }

} catch (Exception $e) {
    error_log('[ProStockTool] registro.php Exception: ' . $e->getMessage());
    $errMsg = APP_DEBUG ? $e->getMessage() : 'Error del servidor';
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $errMsg]);
}

$conn->close();
