<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

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
            // Obtener todas las subcategorías o por categoría
            $categoria_id = isset($_GET['categoria_id']) ? intval($_GET['categoria_id']) : null;
            
            if ($categoria_id) {
                $sql = "SELECT * FROM subcategorias WHERE categoria_id = $categoria_id ORDER BY id DESC";
            } else {
                $sql = "SELECT * FROM subcategorias ORDER BY id DESC";
            }
            
            $result = $conn->query($sql);
            $subcategorias = [];
            
            if ($result && $result->num_rows > 0) {
                while ($row = $result->fetch_assoc()) {
                    $subcategorias[] = $row;
                }
            }
            
            echo json_encode([
                'success' => true,
                'data' => $subcategorias
            ], JSON_UNESCAPED_UNICODE);
            break;

        case 'POST':
            // Crear nueva subcategoría
            $input = file_get_contents('php://input');
            $data = json_decode($input, true);
            
            if (!$data) {
                echo json_encode([
                    'success' => false,
                    'error' => 'Datos inválidos'
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }
            
            $categoria_id = isset($data['categoria_id']) ? intval($data['categoria_id']) : 0;
            $nombre = isset($data['nombre']) ? trim($data['nombre']) : '';
            $descripcion = isset($data['descripcion']) ? trim($data['descripcion']) : '';
            $color = isset($data['color']) ? $data['color'] : '#2e6df6';
            $estado = isset($data['estado']) ? $data['estado'] : 'ACTIVO';
            
            // Validaciones
            if ($categoria_id <= 0) {
                echo json_encode([
                    'success' => false,
                    'error' => 'Categoría inválida'
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
            
            if (strlen($nombre) > 50) {
                echo json_encode([
                    'success' => false,
                    'error' => 'El nombre no puede superar 50 caracteres'
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }
            
            if (strlen($descripcion) > 200) {
                echo json_encode([
                    'success' => false,
                    'error' => 'La descripción no puede superar 200 caracteres'
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }
            
            // Verificar que la categoría existe
            $checkCatSql = "SELECT id FROM categorias WHERE id = $categoria_id";
            $checkCatResult = $conn->query($checkCatSql);
            
            if (!$checkCatResult || $checkCatResult->num_rows === 0) {
                echo json_encode([
                    'success' => false,
                    'error' => 'Categoría no encontrada'
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }
            
            // Escapar datos
            $nombre = $conn->real_escape_string($nombre);
            $descripcion = $conn->real_escape_string($descripcion);
            $color = $conn->real_escape_string($color);
            $estado = $conn->real_escape_string($estado);
            
            // Verificar nombre único dentro de la categoría
            $checkSql = "SELECT id FROM subcategorias WHERE nombre = '$nombre' AND categoria_id = $categoria_id";
            $checkResult = $conn->query($checkSql);
            
            if ($checkResult && $checkResult->num_rows > 0) {
                echo json_encode([
                    'success' => false,
                    'error' => 'Ya existe una subcategoría con este nombre en esta categoría'
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }
            
            // Insertar
            $sql = "INSERT INTO subcategorias (categoria_id, nombre, descripcion, color, estado, fecha_creacion) 
                    VALUES ($categoria_id, '$nombre', '$descripcion', '$color', '$estado', NOW())";
            
            if ($conn->query($sql)) {
                echo json_encode([
                    'success' => true,
                    'id' => $conn->insert_id,
                    'message' => 'Subcategoría creada exitosamente'
                ], JSON_UNESCAPED_UNICODE);
            } else {
                echo json_encode([
                    'success' => false,
                    'error' => 'Error al crear: ' . $conn->error
                ], JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'PUT':
            // Actualizar subcategoría
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
            $color = isset($data['color']) ? $data['color'] : '#2e6df6';
            $estado = isset($data['estado']) ? $data['estado'] : 'ACTIVO';
            
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
            
            if (strlen($nombre) > 50) {
                echo json_encode([
                    'success' => false,
                    'error' => 'El nombre no puede superar 50 caracteres'
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }
            
            if (strlen($descripcion) > 200) {
                echo json_encode([
                    'success' => false,
                    'error' => 'La descripción no puede superar 200 caracteres'
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }
            
            // Escapar datos
            $nombre = $conn->real_escape_string($nombre);
            $descripcion = $conn->real_escape_string($descripcion);
            $color = $conn->real_escape_string($color);
            $estado = $conn->real_escape_string($estado);
            
            // Verificar que existe
            $checkSql = "SELECT categoria_id FROM subcategorias WHERE id = $id";
            $checkResult = $conn->query($checkSql);
            
            if (!$checkResult || $checkResult->num_rows === 0) {
                echo json_encode([
                    'success' => false,
                    'error' => 'Subcategoría no encontrada'
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }
            
            $row = $checkResult->fetch_assoc();
            $categoria_id = $row['categoria_id'];
            
            // Verificar nombre único (excepto el actual)
            $checkNameSql = "SELECT id FROM subcategorias WHERE nombre = '$nombre' AND categoria_id = $categoria_id AND id != $id";
            $checkNameResult = $conn->query($checkNameSql);
            
            if ($checkNameResult && $checkNameResult->num_rows > 0) {
                echo json_encode([
                    'success' => false,
                    'error' => 'Ya existe otra subcategoría con este nombre en esta categoría'
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }
            
            // Actualizar
            $sql = "UPDATE subcategorias SET 
                    nombre = '$nombre',
                    descripcion = '$descripcion',
                    color = '$color',
                    estado = '$estado',
                    fecha_actualizacion = NOW()
                    WHERE id = $id";
            
            if ($conn->query($sql)) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Subcategoría actualizada exitosamente'
                ], JSON_UNESCAPED_UNICODE);
            } else {
                echo json_encode([
                    'success' => false,
                    'error' => 'Error al actualizar: ' . $conn->error
                ], JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'DELETE':
            // Eliminar subcategoría
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
            $checkSql = "SELECT id FROM subcategorias WHERE id = $id";
            $checkResult = $conn->query($checkSql);
            
            if (!$checkResult || $checkResult->num_rows === 0) {
                echo json_encode([
                    'success' => false,
                    'error' => 'Subcategoría no encontrada'
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }
            
            // Verificar productos asociados (si existe la tabla)
            $productCheckSql = "SHOW TABLES LIKE 'productos'";
            $tableExists = $conn->query($productCheckSql);
            
            if ($tableExists && $tableExists->num_rows > 0) {
                $productCheckSql = "SELECT COUNT(*) as count FROM productos WHERE subcategoria_id = $id";
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
            $sql = "DELETE FROM subcategorias WHERE id = $id";
            
            if ($conn->query($sql)) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Subcategoría eliminada exitosamente'
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