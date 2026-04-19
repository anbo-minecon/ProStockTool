<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { 
    http_response_code(200); 
    exit; 
}

require 'conexion.php';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        echo json_encode(['success' => false, 'error' => 'Método no permitido']);
        exit;
    }

    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!$data) { 
        echo json_encode(['success' => false, 'error' => 'Datos inválidos']); 
        exit; 
    }

    $email = isset($data['email']) ? trim($data['email']) : '';
    $nombre = isset($data['nombre']) ? trim($data['nombre']) : '';
    $identidad = isset($data['identidad']) ? trim($data['identidad']) : '';
    $contrasena = isset($data['contrasena']) ? (string)$data['contrasena'] : '';

    // Validaciones
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'error' => 'Email inválido']); 
        exit;
    }

    if (strlen($nombre) < 2 || strlen($nombre) > 100) {
        echo json_encode(['success' => false, 'error' => 'El nombre debe tener entre 2 y 100 caracteres']); 
        exit;
    }

    // Validar que el nombre solo contenga letras y espacios
    if (!preg_match('/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/', $nombre)) {
        echo json_encode(['success' => false, 'error' => 'El nombre solo debe contener letras']); 
        exit;
    }

    if (!preg_match('/^[0-9]{6,20}$/', $identidad)) {
        echo json_encode(['success' => false, 'error' => 'La identidad debe contener entre 6 y 20 dígitos']); 
        exit;
    }

    if (strlen($contrasena) < 6) {
        echo json_encode(['success' => false, 'error' => 'La contraseña debe tener mínimo 6 caracteres']); 
        exit;
    }

    // Validar fortaleza de contraseña (opcional)
    if (strlen($contrasena) < 8) {
        // Advertencia: contraseña débil pero permitida
    }

    $emailEsc = $conn->real_escape_string($email);
    $identidadEsc = $conn->real_escape_string($identidad);

    // Verificar si el email ya existe
    $checkEmail = $conn->query("SELECT id FROM usuarios WHERE email = '$emailEsc' LIMIT 1");
    if ($checkEmail && $checkEmail->num_rows > 0) {
        echo json_encode(['success' => false, 'error' => 'El email ya está registrado']); 
        exit;
    }

    // Verificar si la identidad ya existe
    $checkIdentidad = $conn->query("SELECT id FROM usuarios WHERE identidad = '$identidadEsc' LIMIT 1");
    if ($checkIdentidad && $checkIdentidad->num_rows > 0) {
        echo json_encode(['success' => false, 'error' => 'El número de identidad ya está registrado']); 
        exit;
    }

    // Capitalizar nombre correctamente
    $nombre = ucwords(strtolower($nombre));
    $nombreEsc = $conn->real_escape_string($nombre);

    // Hash de la contraseña
    $hash = password_hash($contrasena, PASSWORD_BCRYPT, ['cost' => 10]);
    $hashEsc = $conn->real_escape_string($hash);

    // Iniciar transacción
    $conn->begin_transaction();

    try {
        // Insertar usuario
        $sql = "INSERT INTO usuarios (email, nombre, identidad, password, rol, estado, creado_en) 
                VALUES ('$emailEsc', '$nombreEsc', '$identidadEsc', '$hashEsc', 'tendero', 'activo', NOW())";
        
        if (!$conn->query($sql)) {
            throw new Exception('Error al registrar usuario: ' . $conn->error);
        }

        $usuario_id = $conn->insert_id;
        
        // Obtener IP y User Agent
        $ip_address = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
        $ipEsc = $conn->real_escape_string($ip_address);
        $userAgentEsc = $conn->real_escape_string($user_agent);

        // Registrar en auditoría
        $sqlAuditoria = "INSERT INTO auditoria (usuario_id, accion, tabla_afectada, registro_id, ip_address, user_agent) 
                        VALUES ($usuario_id, 'registro_usuario', 'usuarios', $usuario_id, '$ipEsc', '$userAgentEsc')";
        
        $conn->query($sqlAuditoria);

        // Commit de la transacción
        $conn->commit();

        // Respuesta exitosa
        echo json_encode([
            'success' => true,
            'message' => 'Registro exitoso. Ya puedes iniciar sesión.',
            'data' => [
                'id' => $usuario_id,
                'email' => $email,
                'nombre' => $nombre
            ]
        ]);

    } catch (Exception $e) {
        // Rollback en caso de error
        $conn->rollback();
        throw $e;
    }

} catch (Exception $e) {
    echo json_encode([
        'success' => false, 
        'error' => 'Error del servidor: ' . $e->getMessage()
    ]);
}

$conn->close();
?>