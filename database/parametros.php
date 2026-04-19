<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { 
    http_response_code(200); 
    exit; 
}

require 'conexion.php';

// ── Control de acceso por roles ──────────────────────────────
// Parámetros: módulo exclusivo del administrador
require_once 'verificar_rol.php';
verificarAutenticacion();
soloAdmin();
// ─────────────────────────────────────────────────────────────
if (!isset($conn) || $conn->connect_error) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error de conexión a la base de datos'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            // Usar columna correcta (estado_id) para contar productos asociados
            $sql = "SELECT par.id, par.codigo, par.nombre, par.descripcion, par.color,
                           (SELECT COUNT(*) FROM productos prod WHERE prod.estado_id = par.id) AS productos_count
                    FROM parametros par
                    ORDER BY par.id";
            
            $res = $conn->query($sql);
            
            if ($res === false) {
                throw new Exception('Error en consulta: ' . $conn->error);
            }
            
            $rows = [];
            while ($r = $res->fetch_assoc()) { 
                $rows[] = $r; 
            }
            
            echo json_encode([
                'success' => true, 
                'data' => $rows
            ], JSON_UNESCAPED_UNICODE);
            break;

        case 'POST':
            $input = file_get_contents('php://input');
            $data = json_decode($input, true);
            
            if (!$data) { 
                echo json_encode([
                    'success' => false,
                    'error' => 'Datos inválidos'
                ], JSON_UNESCAPED_UNICODE); 
                break; 
            }
            
            $codigo = isset($data['codigo']) ? trim($data['codigo']) : '';
            $nombre = isset($data['nombre']) ? trim($data['nombre']) : '';
            $descripcion = isset($data['descripcion']) ? trim($data['descripcion']) : '';
            $color = isset($data['color']) ? trim($data['color']) : '#4a90e2';
            
            if ($nombre === '') { 
                echo json_encode([
                    'success' => false,
                    'error' => 'El nombre es obligatorio'
                ], JSON_UNESCAPED_UNICODE); 
                break; 
            }
            
            if (strlen($nombre) > 50) { 
                echo json_encode([
                    'success' => false,
                    'error' => 'Longitud de nombre inválida'
                ], JSON_UNESCAPED_UNICODE); 
                break; 
            }
            
            if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $color)) { 
                echo json_encode([
                    'success' => false,
                    'error' => 'Color inválido. Use formato #RRGGBB'
                ], JSON_UNESCAPED_UNICODE); 
                break; 
            }
            
            // Generar código automático si no se proporciona
            if ($codigo === '') {
                $resNext = $conn->query("SELECT LPAD(COALESCE(MAX(CAST(codigo AS UNSIGNED)),0)+1,3,'0') AS next_codigo FROM parametros");
                $rowNext = $resNext ? $resNext->fetch_assoc() : null;
                $codigo = $rowNext && isset($rowNext['next_codigo']) ? $rowNext['next_codigo'] : '001';
            }
            
            $codigo = $conn->real_escape_string($codigo);
            $nombre = $conn->real_escape_string($nombre);
            $descripcion = $conn->real_escape_string($descripcion);
            $color = $conn->real_escape_string($color);
            
            // Verificar duplicados
            $chk = $conn->query("SELECT 1 FROM parametros WHERE codigo='$codigo' OR nombre='$nombre' LIMIT 1");
            if ($chk && $chk->num_rows > 0) { 
                echo json_encode([
                    'success' => false,
                    'error' => 'Código o nombre ya existe'
                ], JSON_UNESCAPED_UNICODE); 
                break; 
            }
            
            $sql = "INSERT INTO parametros (codigo, nombre, descripcion, color, fecha_creacion) 
                    VALUES ('$codigo', '$nombre', '$descripcion', '$color', NOW())";
            
            if ($conn->query($sql)) {
                echo json_encode([
                    'success' => true,
                    'id' => $conn->insert_id,
                    'message' => 'Parámetro creado exitosamente'
                ], JSON_UNESCAPED_UNICODE);
            } else {
                echo json_encode([
                    'success' => false,
                    'error' => 'Error al crear: ' . $conn->error
                ], JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'PUT':
            $input = file_get_contents('php://input');
            $data = json_decode($input, true);
            
            if (!$data) { 
                echo json_encode([
                    'success' => false,
                    'error' => 'Datos inválidos'
                ], JSON_UNESCAPED_UNICODE); 
                break; 
            }
            
            $id = isset($data['id']) ? intval($data['id']) : 0;
            $nombre = isset($data['nombre']) ? trim($data['nombre']) : '';
            $descripcion = isset($data['descripcion']) ? trim($data['descripcion']) : '';
            $color = isset($data['color']) ? trim($data['color']) : '#4a90e2';
            
            if ($id <= 0 || $nombre === '') { 
                echo json_encode([
                    'success' => false,
                    'error' => 'ID y nombre son obligatorios'
                ], JSON_UNESCAPED_UNICODE); 
                break; 
            }
            
            if (strlen($nombre) > 50) { 
                echo json_encode([
                    'success' => false,
                    'error' => 'Longitud de nombre inválida'
                ], JSON_UNESCAPED_UNICODE); 
                break; 
            }
            
            if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $color)) { 
                echo json_encode([
                    'success' => false,
                    'error' => 'Color inválido. Use formato #RRGGBB'
                ], JSON_UNESCAPED_UNICODE); 
                break; 
            }
            
            $nombre = $conn->real_escape_string($nombre);
            $descripcion = $conn->real_escape_string($descripcion);
            $color = $conn->real_escape_string($color);
            
            // Verificar que existe
            $ex = $conn->query("SELECT id FROM parametros WHERE id=$id");
            if (!$ex || $ex->num_rows === 0) { 
                echo json_encode([
                    'success' => false,
                    'error' => 'Parámetro no encontrado'
                ], JSON_UNESCAPED_UNICODE); 
                break; 
            }
            
            // Verificar duplicados
            $chk = $conn->query("SELECT 1 FROM parametros WHERE nombre='$nombre' AND id!=$id LIMIT 1");
            if ($chk && $chk->num_rows > 0) { 
                echo json_encode([
                    'success' => false,
                    'error' => 'Nombre ya existe'
                ], JSON_UNESCAPED_UNICODE); 
                break; 
            }
            
            $sql = "UPDATE parametros 
                    SET nombre='$nombre', 
                        descripcion='$descripcion', 
                        color='$color', 
                        fecha_actualizacion=NOW() 
                    WHERE id=$id";
            
            if ($conn->query($sql)) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Parámetro actualizado exitosamente'
                ], JSON_UNESCAPED_UNICODE);
            } else {
                echo json_encode([
                    'success' => false,
                    'error' => 'Error al actualizar: ' . $conn->error
                ], JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'DELETE':
            $input = file_get_contents('php://input');
            $data = json_decode($input, true);
            
            if (!$data) { 
                echo json_encode([
                    'success' => false,
                    'error' => 'Datos inválidos'
                ], JSON_UNESCAPED_UNICODE); 
                break; 
            }
            
            $id = isset($data['id']) ? intval($data['id']) : 0;
            
            if ($id <= 0) { 
                echo json_encode([
                    'success' => false,
                    'error' => 'ID inválido'
                ], JSON_UNESCAPED_UNICODE); 
                break; 
            }
            
            // CORRECCIÓN: Verificar productos asociados usando estado_id (no parametro_id)
            $cnt = 0;
            $rc = $conn->query("SELECT COUNT(*) AS c FROM productos WHERE estado_id=$id");
            
            if ($rc) { 
                $row = $rc->fetch_assoc();
                $cnt = intval($row['c']); 
            }
            
            if ($cnt > 0) { 
                echo json_encode([
                    'success' => false,
                    'error' => "No se puede eliminar: tiene $cnt producto(s) asociado(s)"
                ], JSON_UNESCAPED_UNICODE); 
                break; 
            }
            
            // Verificar que el parámetro existe antes de eliminar
            $check = $conn->query("SELECT id FROM parametros WHERE id=$id");
            if (!$check || $check->num_rows === 0) {
                echo json_encode([
                    'success' => false,
                    'error' => 'Parámetro no encontrado'
                ], JSON_UNESCAPED_UNICODE);
                break;
            }
            
            $sql = "DELETE FROM parametros WHERE id=$id";
            
            if ($conn->query($sql)) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Parámetro eliminado exitosamente'
                ], JSON_UNESCAPED_UNICODE);
            } else {
                echo json_encode([
                    'success' => false,
                    'error' => 'Error al eliminar: ' . $conn->error
                ], JSON_UNESCAPED_UNICODE);
            }
            break;

        default:
            http_response_code(405);
            echo json_encode([
                'success' => false,
                'error' => 'Método no permitido'
            ], JSON_UNESCAPED_UNICODE);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error del servidor: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

$conn->close();
?>