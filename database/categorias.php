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

// ── Control de acceso por roles ──────────────────────────────
require_once 'verificar_rol.php';
verificarAutenticacion();
bloquearEscritura(); // Jefe de bodega y tendero solo pueden leer
// ─────────────────────────────────────────────────────────────
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            // Verificar si se solicitan productos de una categoría específica
            if (isset($_GET['categoria_id']) && !empty($_GET['categoria_id'])) {
                $categoria_id = intval($_GET['categoria_id']);
                $sql = "SELECT p.id, p.nombre, p.proveedor_id, p.unidad_medida, p.nit, p.bodega_id,
                               p.categoria_id, p.subcategoria_id, p.stock, p.stock_min, p.stock_max,
                               p.precio, p.fecha_vencimiento, p.estado_id, p.fecha_creacion,
                               prov.nombre AS proveedor_nombre,
                               b.nombre AS bodega_nombre,
                               s.nombre AS subcategoria_nombre,
                               par.nombre AS estado_nombre
                        FROM productos p
                        LEFT JOIN proveedores prov ON prov.id = p.proveedor_id
                        LEFT JOIN bodegas b ON b.id = p.bodega_id
                        LEFT JOIN subcategorias s ON s.id = p.subcategoria_id
                        LEFT JOIN parametros par ON par.id = p.estado_id
                        WHERE p.categoria_id = $categoria_id
                        ORDER BY p.nombre ASC";
                $res = $conn->query($sql);
                $rows = [];
                if ($res && $res->num_rows > 0) {
                    while ($r = $res->fetch_assoc()) { $rows[] = $r; }
                }
                echo json_encode(['success'=>true, 'data'=>$rows], JSON_UNESCAPED_UNICODE);
            } else {
                // Obtener todas las categorías
                $sql = "SELECT * FROM categorias ORDER BY id DESC";
                $result = $conn->query($sql);
                $categorias = [];
                
                if ($result && $result->num_rows > 0) {
                    while ($row = $result->fetch_assoc()) {
                        $categorias[] = $row;
                    }
                }
                
                echo json_encode([
                    'success' => true,
                    'data' => $categorias
                ], JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'POST':
            // Crear nueva categoría
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
            $color = isset($data['color']) ? $data['color'] : '#2e6df6';
            $estado = isset($data['estado']) ? $data['estado'] : 'ACTIVO';
            
            // Validaciones
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
            
            // Verificar nombre único
            $checkSql = "SELECT id FROM categorias WHERE nombre = '$nombre'";
            $checkResult = $conn->query($checkSql);
            
            if ($checkResult && $checkResult->num_rows > 0) {
                echo json_encode([
                    'success' => false,
                    'error' => 'Ya existe una categoría con este nombre'
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }
            
            // Insertar
            $sql = "INSERT INTO categorias (nombre, descripcion, color, estado, fecha_creacion) 
                    VALUES ('$nombre', '$descripcion', '$color', '$estado', NOW())";
            
            if ($conn->query($sql)) {
                echo json_encode([
                    'success' => true,
                    'id' => $conn->insert_id,
                    'message' => 'Categoría creada exitosamente'
                ], JSON_UNESCAPED_UNICODE);
            } else {
                echo json_encode([
                    'success' => false,
                    'error' => 'Error al crear: ' . $conn->error
                ], JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'PUT':
            // Actualizar categoría
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
            $checkSql = "SELECT id FROM categorias WHERE id = $id";
            $checkResult = $conn->query($checkSql);
            
            if (!$checkResult || $checkResult->num_rows === 0) {
                echo json_encode([
                    'success' => false,
                    'error' => 'Categoría no encontrada'
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }
            
            // Verificar nombre único (excepto el actual)
            $checkNameSql = "SELECT id FROM categorias WHERE nombre = '$nombre' AND id != $id";
            $checkNameResult = $conn->query($checkNameSql);
            
            if ($checkNameResult && $checkNameResult->num_rows > 0) {
                echo json_encode([
                    'success' => false,
                    'error' => 'Ya existe otra categoría con este nombre'
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }
            
            // Actualizar
            $sql = "UPDATE categorias SET 
                    nombre = '$nombre',
                    descripcion = '$descripcion',
                    color = '$color',
                    estado = '$estado',
                    fecha_actualizacion = NOW()
                    WHERE id = $id";
            
            if ($conn->query($sql)) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Categoría actualizada exitosamente'
                ], JSON_UNESCAPED_UNICODE);
            } else {
                echo json_encode([
                    'success' => false,
                    'error' => 'Error al actualizar: ' . $conn->error
                ], JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'DELETE':
            // Eliminar categoría
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
            $checkSql = "SELECT id FROM categorias WHERE id = $id";
            $checkResult = $conn->query($checkSql);
            
            if (!$checkResult || $checkResult->num_rows === 0) {
                echo json_encode([
                    'success' => false,
                    'error' => 'Categoría no encontrada'
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }

            // Verificar productos asociados (si existe la tabla y columna FK)
            $productCheckSql = "SHOW TABLES LIKE 'productos'";
            $tableExists = $conn->query($productCheckSql);

            if ($tableExists && $tableExists->num_rows > 0) {
                // Descubrir nombre de columna de relación
                $dbRow = $conn->query("SELECT DATABASE() AS db");
                $dbName = $dbRow ? $dbRow->fetch_assoc()['db'] : null;

                $candidateCols = ["categoria_id", "id_categoria", "categoria", "categoriaId"]; // orden de preferencia
                $categoryColumn = null;
                if ($dbName) {
                    // Buscar si alguna columna candidata existe
                    foreach ($candidateCols as $cand) {
                        $colSql = "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='" . $conn->real_escape_string($dbName) . "' AND TABLE_NAME='productos' AND COLUMN_NAME='" . $conn->real_escape_string($cand) . "' LIMIT 1";
                        $colRes = $conn->query($colSql);
                        if ($colRes && $colRes->num_rows > 0) { $categoryColumn = $cand; break; }
                    }
                }

                if ($categoryColumn) {
                    $productCountSql = "SELECT COUNT(*) as count FROM productos WHERE `$categoryColumn` = $id";
                    $productResult = $conn->query($productCountSql);
                    if ($productResult) {
                        $productCount = (int)$productResult->fetch_assoc()['count'];
                        if ($productCount > 0) {
                            echo json_encode([
                                'success' => false,
                                'error' => 'No se puede eliminar. Tiene ' . $productCount . ' producto(s) asociado(s)'
                            ], JSON_UNESCAPED_UNICODE);
                            exit;
                        }
                    }
                }
            }

            // Eliminar
            $sql = "DELETE FROM categorias WHERE id = $id";
            
            if ($conn->query($sql)) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Categoría eliminada exitosamente'
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