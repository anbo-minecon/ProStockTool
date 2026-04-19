<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require 'conexion.php';
if (!isset($conn) || $conn->connect_error) {
    http_response_code(500);
    echo json_encode(['success'=>false,'error'=>'Error de conexión a la base de datos'], JSON_UNESCAPED_UNICODE);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            // Verificar si se solicitan productos de una subcategoría específica
            if (isset($_GET['subcategoria_id']) && !empty($_GET['subcategoria_id'])) {
                $subcategoria_id = intval($_GET['subcategoria_id']);
                $sql = "SELECT p.id, p.nombre, p.proveedor_id, p.unidad_medida, p.nit, p.bodega_id,
                               p.categoria_id, p.subcategoria_id, p.stock, p.stock_min, p.stock_max,
                               p.precio, p.fecha_vencimiento, p.estado_id, p.fecha_creacion,
                               prov.nombre AS proveedor_nombre,
                               b.nombre AS bodega_nombre,
                               c.nombre AS categoria_nombre,
                               par.nombre AS estado_nombre
                        FROM productos p
                        LEFT JOIN proveedores prov ON prov.id = p.proveedor_id
                        LEFT JOIN bodegas b ON b.id = p.bodega_id
                        LEFT JOIN categorias c ON c.id = p.categoria_id
                        LEFT JOIN parametros par ON par.id = p.estado_id
                        WHERE p.subcategoria_id = $subcategoria_id
                        ORDER BY p.nombre ASC";
                $res = $conn->query($sql);
                $rows = [];
                if ($res && $res->num_rows > 0) {
                    while ($r = $res->fetch_assoc()) { $rows[] = $r; }
                }
                echo json_encode(['success'=>true, 'data'=>$rows], JSON_UNESCAPED_UNICODE);
            } else {
                // Obtener todas las subcategorías
                $sql = "SELECT s.*, c.nombre AS categoria_nombre FROM subcategorias s LEFT JOIN categorias c ON c.id = s.categoria_id ORDER BY s.categoria_id, s.nombre";
                $res = $conn->query($sql);
                $rows = [];
                if ($res) {
                    while ($r = $res->fetch_assoc()) $rows[] = $r;
                }
                echo json_encode(['success' => true, 'data' => $rows], JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) { echo json_encode(['success'=>false,'error'=>'Datos inválidos'], JSON_UNESCAPED_UNICODE); break; }
            $nombre = trim($input['nombre'] ?? '');
            $categoria_id = intval($input['categoria_id'] ?? 0);
            $descripcion = $conn->real_escape_string(trim($input['descripcion'] ?? ''));
            $color = preg_match('/^#[0-9A-Fa-f]{6}$/', ($input['color'] ?? '')) ? $input['color'] : '#2e6df6';
            $estado = in_array($input['estado'] ?? 'ACTIVO', ['ACTIVO','INACTIVO']) ? $input['estado'] : 'ACTIVO';
            if ($nombre === '' || $categoria_id <= 0) { echo json_encode(['success'=>false,'error'=>'Nombre y categoría obligatorios'], JSON_UNESCAPED_UNICODE); break; }
            $nombreEsc = $conn->real_escape_string($nombre);
            $chk = $conn->query("SELECT 1 FROM subcategorias WHERE nombre='$nombreEsc' AND categoria_id=$categoria_id LIMIT 1");
            if ($chk && $chk->num_rows > 0) { echo json_encode(['success'=>false,'error'=>'Ya existe subcategoría con ese nombre en la categoría'], JSON_UNESCAPED_UNICODE); break; }
            $sql = "INSERT INTO subcategorias (categoria_id,nombre,descripcion,color,estado,fecha_creacion) VALUES ($categoria_id,'$nombreEsc','$descripcion','$color','$estado',NOW())";
            if ($conn->query($sql)) echo json_encode(['success'=>true,'id'=>$conn->insert_id,'message'=>'Subcategoría creada'], JSON_UNESCAPED_UNICODE);
            else echo json_encode(['success'=>false,'error'=>'Error al crear: '.$conn->error], JSON_UNESCAPED_UNICODE);
            break;

        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) { echo json_encode(['success'=>false,'error'=>'Datos inválidos'], JSON_UNESCAPED_UNICODE); break; }
            $id = intval($input['id'] ?? 0);
            $nombre = trim($input['nombre'] ?? '');
            $categoria_id = intval($input['categoria_id'] ?? 0);
            if ($id<=0 || $nombre==='' || $categoria_id<=0) { echo json_encode(['success'=>false,'error'=>'ID, nombre y categoría obligatorios'], JSON_UNESCAPED_UNICODE); break; }
            $nombreEsc = $conn->real_escape_string($nombre);
            $descripcion = $conn->real_escape_string(trim($input['descripcion'] ?? ''));
            $color = preg_match('/^#[0-9A-Fa-f]{6}$/', ($input['color'] ?? '')) ? $input['color'] : '#2e6df6';
            $estado = in_array($input['estado'] ?? 'ACTIVO', ['ACTIVO','INACTIVO']) ? $input['estado'] : 'ACTIVO';
            $chk = $conn->query("SELECT 1 FROM subcategorias WHERE nombre='$nombreEsc' AND categoria_id=$categoria_id AND id!=$id LIMIT 1");
            if ($chk && $chk->num_rows > 0) { echo json_encode(['success'=>false,'error'=>'Nombre duplicado en la categoría'], JSON_UNESCAPED_UNICODE); break; }
            $sql = "UPDATE subcategorias SET nombre='$nombreEsc', descripcion='$descripcion', categoria_id=$categoria_id, color='$color', estado='$estado', fecha_actualizacion=NOW() WHERE id=$id";
            if ($conn->query($sql)) echo json_encode(['success'=>true,'message'=>'Subcategoría actualizada'], JSON_UNESCAPED_UNICODE);
            else echo json_encode(['success'=>false,'error'=>'Error al actualizar: '.$conn->error], JSON_UNESCAPED_UNICODE);
            break;

        case 'DELETE':
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) { echo json_encode(['success'=>false,'error'=>'Datos inválidos'], JSON_UNESCAPED_UNICODE); break; }
            $id = intval($input['id'] ?? 0);
            if ($id<=0) { echo json_encode(['success'=>false,'error'=>'ID inválido'], JSON_UNESCAPED_UNICODE); break; }
            // verificar productos asociados
            $rc = $conn->query("SELECT COUNT(*) AS c FROM productos WHERE subcategoria_id=$id");
            $cnt = $rc ? intval($rc->fetch_assoc()['c']) : 0;
            if ($cnt>0) { echo json_encode(['success'=>false,'error'=>"No se puede eliminar: tiene $cnt producto(s) asociados"], JSON_UNESCAPED_UNICODE); break; }
            $sql = "DELETE FROM subcategorias WHERE id=$id";
            if ($conn->query($sql)) echo json_encode(['success'=>true,'message'=>'Subcategoría eliminada'], JSON_UNESCAPED_UNICODE);
            else echo json_encode(['success'=>false,'error'=>'Error al eliminar: '.$conn->error], JSON_UNESCAPED_UNICODE);
            break;

        default:
            echo json_encode(['success'=>false,'error'=>'Método no permitido'], JSON_UNESCAPED_UNICODE);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success'=>false,'error'=>'Error del servidor: '.$e->getMessage()], JSON_UNESCAPED_UNICODE);
}

$conn->close();
?>