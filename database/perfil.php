<?php
// ============================================
// API DE PERFIL DE USUARIO - BACKEND
// CONVERTIDO A MySQLi (compatible avec InfinityFree)
// ============================================

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/cors.php';
pst_cors(['GET', 'POST', 'OPTIONS']);

header('Content-Type: application/json; charset=utf-8');

// Conexión a BD (MySQLi)
require_once __DIR__ . '/conexion.php';

// Middleware de autenticación
require_once __DIR__ . '/middleware.php';
$usuario_id = verificarAutenticacion();

$action = isset($_GET['action']) ? $_GET['action'] : (isset($_POST['action']) ? $_POST['action'] : '');

try {
    switch ($action) {
        
        // ========================================
        // OBTENER DATOS DEL USUARIO
        // ========================================
        case 'getDatos':
            $sql = "SELECT 
                        id, email, nombre, identidad, rol, estado, 
                        foto_perfil, telefono, direccion, 
                        ultimo_acceso, creado_en, actualizado_en
                    FROM usuarios 
                    WHERE id = ?";
            
            $stmt = $conn->prepare($sql);
            $stmt->bind_param('i', $usuario_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $usuario = $result->fetch_assoc();
            
            if ($usuario) {
                http_response_code(200);
                echo json_encode([
                    'success' => true,
                    'usuario' => $usuario
                ]);
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Usuario no encontrado']);
            }
            break;
        
        // ========================================
        // CAMBIAR FOTO DE PERFIL
        // ========================================
        case 'cambiarFoto':
            if (!isset($_FILES['foto']) || $_FILES['foto']['error'] !== UPLOAD_ERR_OK) {
                throw new Exception('Error al subir imagen');
            }
            
            $file = $_FILES['foto'];
            $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            
            if (!in_array($file['type'], $allowedTypes)) {
                throw new Exception('Tipo no permitido');
            }
            
            if ($file['size'] > 5 * 1024 * 1024) {
                throw new Exception('Archivo muy grande');
            }
            
            $uploadDir = __DIR__ . '/../uploads/perfil/';
            if (!file_exists($uploadDir)) mkdir($uploadDir, 0755, true);
            
            $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
            $nombreArchivo = 'perfil_' . $usuario_id . '_' . time() . '.' . $extension;
            $rutaDestino = $uploadDir . $nombreArchivo;
            
            $sqlFoto = "SELECT foto_perfil FROM usuarios WHERE id = ?";
            $stmtFoto = $conn->prepare($sqlFoto);
            $stmtFoto->bind_param('i', $usuario_id);
            $stmtFoto->execute();
            $resFoto = $stmtFoto->get_result();
            $fotoAnterior = $resFoto->fetch_assoc()['foto_perfil'];
            
            if ($fotoAnterior && file_exists(__DIR__ . '/../' . $fotoAnterior)) {
                @unlink(__DIR__ . '/../' . $fotoAnterior);
            }
            
            if (!move_uploaded_file($file['tmp_name'], $rutaDestino)) {
                throw new Exception('Error guardar imagen');
            }
            
            $fotoUrl = 'uploads/perfil/' . $nombreArchivo;
            $sqlUpd = "UPDATE usuarios SET foto_perfil = ? WHERE id = ?";
            $stmtUpd = $conn->prepare($sqlUpd);
            $stmtUpd->bind_param('si', $fotoUrl, $usuario_id);
            $stmtUpd->execute();
            
            registrarAuditoria($conn, $usuario_id, 'actualizar_foto', 'usuarios', $usuario_id);
            
            http_response_code(200);
            echo json_encode(['success' => true, 'message' => 'Foto actualizada', 'foto_url' => $fotoUrl]);
            break;
        
        // ========================================
        // ACTUALIZAR INFORMACIÓN PERSONAL
        // ========================================
        case 'actualizarInfo':
            $nombre = trim($_POST['nombre'] ?? '');
            $telefono = trim($_POST['telefono'] ?? '');
            $direccion = trim($_POST['direccion'] ?? '');
            
            if (empty($nombre)) throw new Exception('Nombre obligatorio');
            if (!empty($telefono) && !preg_match('/^[0-9]{7,15}$/', $telefono)) {
                throw new Exception('Teléfono inválido');
            }
            
            $sql = "UPDATE usuarios SET nombre = ?, telefono = ?, direccion = ?, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param('sssi', $nombre, $telefono, $direccion, $usuario_id);
            $stmt->execute();
            
            registrarAuditoria($conn, $usuario_id, 'actualizar_perfil', 'usuarios', $usuario_id);
            
            http_response_code(200);
            echo json_encode(['success' => true, 'message' => 'Actualizado correctamente']);
            break;
        
        // ========================================
        // CAMBIAR CONTRASEÑA
        // ========================================
        case 'cambiarPassword':
            $pwActual = $_POST['password_actual'] ?? '';
            $pwNueva = $_POST['password_nueva'] ?? '';
            
            if (empty($pwActual) || empty($pwNueva)) throw new Exception('Campos obligatorios');
            if (strlen($pwNueva) < 8) throw new Exception('Mínimo 8 caracteres');
            
            $sqlVerif = "SELECT password FROM usuarios WHERE id = ?";
            $stmtVerif = $conn->prepare($sqlVerif);
            $stmtVerif->bind_param('i', $usuario_id);
            $stmtVerif->execute();
            $resVerif = $stmtVerif->get_result();
            $usuarioData = $resVerif->fetch_assoc();
            
            if (!password_verify($pwActual, $usuarioData['password'])) {
                throw new Exception('Contraseña actual incorrecta');
            }
            
            $pwHash = password_hash($pwNueva, PASSWORD_BCRYPT, ['cost' => 10]);
            $sqlUpd = "UPDATE usuarios SET password = ?, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?";
            $stmtUpd = $conn->prepare($sqlUpd);
            $stmtUpd->bind_param('si', $pwHash, $usuario_id);
            $stmtUpd->execute();
            
            registrarAuditoria($conn, $usuario_id, 'cambiar_password', 'usuarios', $usuario_id);
            
            http_response_code(200);
            echo json_encode(['success' => true, 'message' => 'Contraseña cambiada']);
            break;
        
        // ========================================
        // OBTENER ACTIVIDAD RECIENTE
        // ========================================
        case 'getActividad':
            $sql = "SELECT accion, tabla_afectada, creado_en FROM auditoria WHERE usuario_id = ? ORDER BY creado_en DESC LIMIT 10";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param('i', $usuario_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $actividad = [];
            while ($row = $result->fetch_assoc()) $actividad[] = $row;
            
            http_response_code(200);
            echo json_encode(['success' => true, 'actividad' => $actividad]);
            break;
        
        // ========================================
        // OBTENER ESTADÍSTICAS
        // ========================================
        case 'getEstadisticas':
            $sqlSes = "SELECT COUNT(*) as total FROM auditoria WHERE usuario_id = ? AND accion = 'login'";
            $stmtSes = $conn->prepare($sqlSes);
            $stmtSes->bind_param('i', $usuario_id);
            $stmtSes->execute();
            $resSes = $stmtSes->get_result();
            $sesiones = $resSes->fetch_assoc()['total'] ?? 0;
            
            $sqlAcc = "SELECT COUNT(*) as total FROM auditoria WHERE usuario_id = ?";
            $stmtAcc = $conn->prepare($sqlAcc);
            $stmtAcc->bind_param('i', $usuario_id);
            $stmtAcc->execute();
            $resAcc = $stmtAcc->get_result();
            $acciones = $resAcc->fetch_assoc()['total'] ?? 0;
            
            $sqlC = "SELECT creado_en FROM usuarios WHERE id = ?";
            $stmtC = $conn->prepare($sqlC);
            $stmtC->bind_param('i', $usuario_id);
            $stmtC->execute();
            $resC = $stmtC->get_result();
            $creado = $resC->fetch_assoc()['creado_en'] ?? null;
            
            $diasEnSistema = 0;
            if ($creado) {
                $d1 = new DateTime($creado);
                $d2 = new DateTime();
                $diasEnSistema = $d2->diff($d1)->days;
            }
            
            http_response_code(200);
            echo json_encode(['success' => true, 'estadisticas' => ['sesiones' => (int)$sesiones, 'acciones' => (int)$acciones, 'diasEnSistema' => (int)$diasEnSistema]]);
            break;
        
        default:
            throw new Exception('Acción no válida');
    }
} catch (Exception $e) {
    error_log('[ProStockTool] perfil.php ERROR: ' . $e->getMessage());
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

// ============================================
// FUNCIÓN: REGISTRAR AUDITORÍA
// ============================================
function registrarAuditoria($conn, $usuario_id, $accion, $tabla, $registro_id) {
    try {
        $sql = "INSERT INTO auditoria (usuario_id, accion, tabla_afectada, registro_id, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)";
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $ua = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param('isssss', $usuario_id, $accion, $tabla, $registro_id, $ip, $ua);
        $stmt->execute();
    } catch (Exception $e) {
        error_log('Error en auditoría: ' . $e->getMessage());
    }
}
?>