<?php
// =================================================================
//  usuarios.php  —  API Backend · Gestión de Usuarios (Admin)
//  Ubicación: database/usuarios.php
// =================================================================

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

require_once __DIR__ . '/conexion.php';

// ── Sesión ───────────────────────────────────────────────────────
if (session_status() === PHP_SESSION_NONE) session_start();

if (empty($_SESSION['usuario_id'])) {
    http_response_code(401);
    exit(json_encode(['success' => false, 'error' => 'Sesión no iniciada']));
}

// ── Verificar que es ADMIN ────────────────────────────────────
$uid = (int) $_SESSION['usuario_id'];
$stmt = $conn->prepare("SELECT rol FROM usuarios WHERE id = ? LIMIT 1");
$stmt->bind_param('i', $uid);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$row || $row['rol'] !== 'admin') {
    http_response_code(403);
    exit(json_encode(['success' => false, 'error' => 'Acceso denegado. Solo administradores']));
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';

// ── Router ───────────────────────────────────────────────────────
try {
    switch ($method) {
        case 'GET':
            if ($action === 'listar') {
                responder(listarUsuarios($conn));
            } elseif ($action === 'bodegas') {
                responder(listarBodegas($conn));
            } else {
                errorRespuesta('Acción GET no reconocida', 400);
            }
            break;

        case 'POST':
            responder(crearUsuario($conn));
            break;

        case 'PUT':
            $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
            $body = json_decode(file_get_contents('php://input'), true) ?? [];
            responder(actualizarUsuario($conn, $id, $body));
            break;

        case 'DELETE':
            $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
            responder(eliminarUsuario($conn, $id));
            break;

        default:
            errorRespuesta('Método HTTP no permitido', 405);
    }
} catch (Throwable $e) {
    errorRespuesta('Error interno: ' . $e->getMessage(), 500);
}

// =================================================================
//  GET  listar
// =================================================================
function listarUsuarios(mysqli $conn): array
{
    $stmt = $conn->prepare("
        SELECT
            u.id,
            u.nombre,
            u.email,
            u.identidad,
            u.rol,
            u.estado,
            u.bodega_asignada_id,
            b.nombre AS bodega_nombre,
            u.creado_en,
            u.actualizado_en
        FROM usuarios u
        LEFT JOIN bodegas b ON b.id = u.bodega_asignada_id
        ORDER BY u.creado_en DESC
    ");
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    return ['success' => true, 'data' => $rows];
}

// =================================================================
//  GET  bodegas
// =================================================================
function listarBodegas(mysqli $conn): array
{
    $stmt = $conn->prepare("
        SELECT id, nombre, descripcion
        FROM bodegas
        ORDER BY nombre ASC
    ");
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    return ['success' => true, 'data' => $rows];
}

// =================================================================
//  POST  crear usuario
// =================================================================
function crearUsuario(mysqli $conn): array
{
    $body = json_decode(file_get_contents('php://input'), true) ?? [];

    $nombre = isset($body['nombre']) ? trim((string) $body['nombre']) : '';
    $email  = isset($body['email'])  ? trim((string) $body['email'])  : '';
    $identidad = isset($body['identidad']) ? trim((string) $body['identidad']) : '';
    $password = isset($body['password']) ? trim((string) $body['password']) : '';
    $rol = isset($body['rol']) ? trim((string) $body['rol']) : '';
    $bodegaId = isset($body['bodega_asignada_id']) ? (int) $body['bodega_asignada_id'] : null;
    $estado = isset($body['estado']) ? trim((string) $body['estado']) : 'activo';

    // Validaciones
    if (empty($nombre)) return ['success' => false, 'error' => 'El nombre es obligatorio'];
    if (empty($email)) return ['success' => false, 'error' => 'El email es obligatorio'];
    if (empty($identidad)) return ['success' => false, 'error' => 'La identidad es obligatoria'];
    if (empty($password)) return ['success' => false, 'error' => 'La contraseña es obligatoria'];
    if (empty($rol)) return ['success' => false, 'error' => 'El rol es obligatorio'];

    if (strlen($password) < 8) {
        return ['success' => false, 'error' => 'La contraseña debe tener mínimo 8 caracteres'];
    }

    $rolesValidos = ['admin', 'jefe_bodega', 'tendero'];
    if (!in_array($rol, $rolesValidos, true)) {
        return ['success' => false, 'error' => 'Rol inválido'];
    }

    if ($rol === 'jefe_bodega' && !$bodegaId) {
        return ['success' => false, 'error' => 'Debe asignar una bodega a los Jefes de Bodega'];
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return ['success' => false, 'error' => 'Email inválido'];
    }

    // Verificar email y identidad únicos
    $chkEmail = $conn->prepare("SELECT id FROM usuarios WHERE email = ? LIMIT 1");
    $chkEmail->bind_param('s', $email);
    $chkEmail->execute();
    if ($chkEmail->get_result()->num_rows > 0) {
        $chkEmail->close();
        return ['success' => false, 'error' => 'El email ya existe'];
    }
    $chkEmail->close();

    $chkId = $conn->prepare("SELECT id FROM usuarios WHERE identidad = ? LIMIT 1");
    $chkId->bind_param('s', $identidad);
    $chkId->execute();
    if ($chkId->get_result()->num_rows > 0) {
        $chkId->close();
        return ['success' => false, 'error' => 'La identidad ya existe'];
    }
    $chkId->close();

    // Hash password
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);

    // Validar bodega si es jefe_bodega
    if ($rol === 'jefe_bodega' && $bodegaId) {
        $chkBod = $conn->prepare("SELECT id FROM bodegas WHERE id = ? LIMIT 1");
        $chkBod->bind_param('i', $bodegaId);
        $chkBod->execute();
        if ($chkBod->get_result()->num_rows === 0) {
            $chkBod->close();
            return ['success' => false, 'error' => 'La bodega no existe'];
        }
        $chkBod->close();
    }

    // Insertar
    $ins = $conn->prepare(
        "INSERT INTO usuarios
            (email, nombre, identidad, password, rol, bodega_asignada_id, estado, creado_en)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())"
    );
    $ins->bind_param('sssssis', $email, $nombre, $identidad, $passwordHash, $rol, $bodegaId, $estado);
    $ins->execute();

    if ($ins->affected_rows < 1) {
        $ins->close();
        return ['success' => false, 'error' => 'No se pudo crear el usuario'];
    }
    $ins->close();

    return ['success' => true, 'message' => 'Usuario creado exitosamente'];
}

// =================================================================
//  PUT  actualizar usuario
// =================================================================
function actualizarUsuario(mysqli $conn, int $id, array $body): array
{
    if ($id <= 0) return ['success' => false, 'error' => 'ID inválido'];

    $nombre = isset($body['nombre']) ? trim((string) $body['nombre']) : '';
    $email  = isset($body['email'])  ? trim((string) $body['email'])  : '';
    $identidad = isset($body['identidad']) ? trim((string) $body['identidad']) : '';
    $password = isset($body['password']) ? trim((string) $body['password']) : '';
    $rol = isset($body['rol']) ? trim((string) $body['rol']) : '';
    $bodegaId = isset($body['bodega_asignada_id']) ? (int) $body['bodega_asignada_id'] : null;
    $estado = isset($body['estado']) ? trim((string) $body['estado']) : '';

    // Validaciones
    if (empty($nombre)) return ['success' => false, 'error' => 'El nombre es obligatorio'];
    if (empty($email)) return ['success' => false, 'error' => 'El email es obligatorio'];
    if (empty($identidad)) return ['success' => false, 'error' => 'La identidad es obligatoria'];
    if (empty($rol)) return ['success' => false, 'error' => 'El rol es obligatorio'];
    if (empty($estado)) return ['success' => false, 'error' => 'El estado es obligatorio'];

    if ($password && strlen($password) < 8) {
        return ['success' => false, 'error' => 'La contraseña debe tener mínimo 8 caracteres'];
    }

    $rolesValidos = ['admin', 'jefe_bodega', 'tendero'];
    if (!in_array($rol, $rolesValidos, true)) {
        return ['success' => false, 'error' => 'Rol inválido'];
    }

    if ($rol === 'jefe_bodega' && !$bodegaId) {
        return ['success' => false, 'error' => 'Debe asignar una bodega a los Jefes de Bodega'];
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return ['success' => false, 'error' => 'Email inválido'];
    }

    // Verificar que existe el usuario
    $chk = $conn->prepare("SELECT id FROM usuarios WHERE id = ? LIMIT 1");
    $chk->bind_param('i', $id);
    $chk->execute();
    if ($chk->get_result()->num_rows === 0) {
        $chk->close();
        return ['success' => false, 'error' => 'Usuario no encontrado'];
    }
    $chk->close();

    // Verificar email único (excepto el actual)
    $chkEmail = $conn->prepare("SELECT id FROM usuarios WHERE email = ? AND id != ? LIMIT 1");
    $chkEmail->bind_param('si', $email, $id);
    $chkEmail->execute();
    if ($chkEmail->get_result()->num_rows > 0) {
        $chkEmail->close();
        return ['success' => false, 'error' => 'El email ya existe en otro usuario'];
    }
    $chkEmail->close();

    // Verificar identidad única (excepto el actual)
    $chkId = $conn->prepare("SELECT id FROM usuarios WHERE identidad = ? AND id != ? LIMIT 1");
    $chkId->bind_param('si', $identidad, $id);
    $chkId->execute();
    if ($chkId->get_result()->num_rows > 0) {
        $chkId->close();
        return ['success' => false, 'error' => 'La identidad ya existe en otro usuario'];
    }
    $chkId->close();

    // Validar bodega si es jefe_bodega
    if ($rol === 'jefe_bodega' && $bodegaId) {
        $chkBod = $conn->prepare("SELECT id FROM bodegas WHERE id = ? LIMIT 1");
        $chkBod->bind_param('i', $bodegaId);
        $chkBod->execute();
        if ($chkBod->get_result()->num_rows === 0) {
            $chkBod->close();
            return ['success' => false, 'error' => 'La bodega no existe'];
        }
        $chkBod->close();
    }

    // Preparar actualización
    if ($password) {
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        $upd = $conn->prepare(
            "UPDATE usuarios
             SET nombre = ?, email = ?, identidad = ?, password = ?,
                 rol = ?, bodega_asignada_id = ?, estado = ?, actualizado_en = NOW()
             WHERE id = ?"
        );
        $upd->bind_param('sssssisi', $nombre, $email, $identidad, $passwordHash, $rol, $bodegaId, $estado, $id);
    } else {
        $upd = $conn->prepare(
            "UPDATE usuarios
             SET nombre = ?, email = ?, identidad = ?,
                 rol = ?, bodega_asignada_id = ?, estado = ?, actualizado_en = NOW()
             WHERE id = ?"
        );
        $upd->bind_param('ssssisi', $nombre, $email, $identidad, $rol, $bodegaId, $estado, $id);
    }

    $upd->execute();

    if ($upd->affected_rows < 0) {
        $upd->close();
        return ['success' => false, 'error' => 'Error al actualizar'];
    }
    $upd->close();

    return ['success' => true, 'message' => 'Usuario actualizado exitosamente'];
}

// =================================================================
//  DELETE  eliminar usuario
// =================================================================
function eliminarUsuario(mysqli $conn, int $id): array
{
    if ($id <= 0) return ['success' => false, 'error' => 'ID inválido'];

    // No permitir eliminar al usuario actual
    $uid = (int) $_SESSION['usuario_id'];
    if ($id === $uid) {
        return ['success' => false, 'error' => 'No puedes eliminar tu propia cuenta'];
    }

    $del = $conn->prepare("DELETE FROM usuarios WHERE id = ?");
    $del->bind_param('i', $id);
    $del->execute();

    if ($del->affected_rows < 1) {
        $del->close();
        return ['success' => false, 'error' => 'Usuario no encontrado'];
    }
    $del->close();

    return ['success' => true, 'message' => 'Usuario eliminado exitosamente'];
}

// =================================================================
//  HELPERS
// =================================================================

function responder(array $data): void
{
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function errorRespuesta(string $error, int $code = 400): void
{
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $error], JSON_UNESCAPED_UNICODE);
    exit;
}

$conn->close();
?>
