<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

// Manejar preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require 'conexion.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            // Obtener todas las bodegas (solo campos necesarios)
            $sql = "SELECT id, nombre, descripcion FROM bodegas ORDER BY id DESC";
            $result = $conn->query($sql);
            $bodegas = [];
            
            if ($result && $result->num_rows > 0) {
                while ($row = $result->fetch_assoc()) {
                    $bodegas[] = $row;
                }
            }
            
            echo json_encode([
                'success' => true,
                'data' => $bodegas
            ], JSON_UNESCAPED_UNICODE);
            break;

        case 'POST':
            // Crear nueva bodega (solo nombre y descripcion)
            $input = file_get_contents('php://input');
            $data = json_decode($input, true);
            
            if (!$data) {
                echo json_encode([
                    'success' => false,
                    'error' => 'Datos inválidos'
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }
            
            $nombre = isset($data['nombre']) ? trim($data['nombre']) : '';
            $descripcion = isset($data['descripcion']) ? trim($data['descripcion']) : '';
            
            // Validaciones
            if (empty($nombre)) {
                echo json_encode([
                    'success' => false,
                    'error' => 'El nombre es obligatorio'
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }
            
            if (strlen($nombre) > 100) {
                echo json_encode([
                    'success' => false,
                    'error' => 'El nombre no puede superar 100 caracteres'
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }
            
            // Escapar datos
            $nombre = $conn->real_escape_string($nombre);
            $descripcion = $conn->real_escape_string($descripcion);
            
            // Verificar nombre único
            $checkNameSql = "SELECT id FROM bodegas WHERE nombre = '$nombre'";
            $checkNameResult = $conn->query($checkNameSql);
            
            if ($checkNameResult && $checkNameResult->num_rows > 0) {
                echo json_encode([
                    'success' => false,
                    'error' => 'Ya existe una bodega con este nombre'
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }
            
            // Insertar
            $sql = "INSERT INTO bodegas (nombre, descripcion, fecha_creacion) 
                    VALUES ('$nombre', '$descripcion', NOW())";
            
            if ($conn->query($sql)) {
                echo json_encode([
                    'success' => true,
                    'id' => $conn->insert_id,
                    'message' => 'Bodega creada exitosamente'
                ], JSON_UNESCAPED_UNICODE);
            } else {
                echo json_encode([
                    'success' => false,
                    'error' => 'Error al crear: ' . $conn->error
                ], JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'PUT':
            // Actualizar bodega
            $input = file_get_contents('php://input');
            $data = json_decode($input, true);
            
            if (!$data) {
                echo json_encode([
                    'success' => false,
                    'error' => 'Datos inválidos'
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }
            
            $id = isset($data['id']) ? intval($data['id']) : 0;
            $nombre = isset($data['nombre']) ? trim($data['nombre']) : '';
            $descripcion = isset($data['descripcion']) ? trim($data['descripcion']) : '';
            
            // Validaciones
            if ($id <= 0) {
                echo json_encode([
                    'success' => false,
                    'error' => 'ID inválido'
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }
            
            if (empty($nombre)) {
                echo json_encode([
                    'success' => false,
                    'error' => 'El nombre es obligatorio'
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }
            
            if (strlen($nombre) > 100) {
                echo json_encode([
                    'success' => false,
                    'error' => 'El nombre no puede superar 100 caracteres'
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }
            
            // Escapar datos
            $nombre = $conn->real_escape_string($nombre);
            $descripcion = $conn->real_escape_string($descripcion);
            
            // Verificar que existe
            $checkSql = "SELECT id FROM bodegas WHERE id = $id";
            $checkResult = $conn->query($checkSql);
            
            if (!$checkResult || $checkResult->num_rows === 0) {
                echo json_encode([
                    'success' => false,
                    'error' => 'Bodega no encontrada'
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }
            
            // Verificar nombre único (excepto el actual)
            $checkNameSql = "SELECT id FROM bodegas WHERE nombre = '$nombre' AND id != $id";
            $checkNameResult = $conn->query($checkNameSql);
            
            if ($checkNameResult && $checkNameResult->num_rows > 0) {
                echo json_encode([
                    'success' => false,
                    'error' => 'Ya existe otra bodega con este nombre'
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }
            
            // Actualizar
            $sql = "UPDATE bodegas SET 
                    nombre = '$nombre',
                    descripcion = '$descripcion',
                    fecha_actualizacion = NOW()
                    WHERE id = $id";
            
            if ($conn->query($sql)) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Bodega actualizada exitosamente'
                ], JSON_UNESCAPED_UNICODE);
            } else {
                echo json_encode([
                    'success' => false,
                    'error' => 'Error al actualizar: ' . $conn->error
                ], JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'DELETE':
            // Eliminar bodega
            $input = file_get_contents('php://input');
            $data = json_decode($input, true);
            
            if (!$data) {
                echo json_encode([
                    'success' => false,
                    'error' => 'Datos inválidos'
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }
            
            $id = isset($data['id']) ? intval($data['id']) : 0;
            
            if ($id <= 0) {
                echo json_encode([
                    'success' => false,
                    'error' => 'ID inválido'
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }
            
            // Verificar que existe
            $checkSql = "SELECT id FROM bodegas WHERE id = $id";
            $checkResult = $conn->query($checkSql);
            
            if (!$checkResult || $checkResult->num_rows === 0) {
                echo json_encode([
                    'success' => false,
                    'error' => 'Bodega no encontrada'
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }
            
            // Verificar productos asociados (si existe la tabla)
            $productCheckSql = "SHOW TABLES LIKE 'productos'";
            $tableExists = $conn->query($productCheckSql);
            
            if ($tableExists && $tableExists->num_rows > 0) {
                $productCheckSql = "SELECT COUNT(*) as count FROM productos WHERE bodega_id = $id";
                $productResult = $conn->query($productCheckSql);
                
                if ($productResult) {
                    $productCount = $productResult->fetch_assoc()['count'];
                    
                    if ($productCount > 0) {
                        echo json_encode([
                            'success' => false,
                            'error' => 'No se puede eliminar. Tiene ' . $productCount . ' producto(s) asociado(s)'
                        ], JSON_UNESCAPED_UNICODE);
                        exit;
                    }
                }
            }
            
            // Eliminar
            $sql = "DELETE FROM bodegas WHERE id = $id";
            
            if ($conn->query($sql)) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Bodega eliminada exitosamente'
                ], JSON_UNESCAPED_UNICODE);
            } else {
                echo json_encode([
                    'success' => false,
                    'error' => 'Error al eliminar: ' . $conn->error
                ], JSON_UNESCAPED_UNICODE);
            }
            break;

        default:
            echo json_encode([
                'success' => false,
                'error' => 'Método no permitido'
            ], JSON_UNESCAPED_UNICODE);
            break;
    }
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => 'Error del servidor: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

$conn->close();
?>