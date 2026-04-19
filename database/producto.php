<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once 'conexion.php';
require_once 'verificar_rol.php';
verificarAutenticacion();
bloquearEscritura();

if (!isset($conn) || $conn->connect_error) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error de conexión'], JSON_UNESCAPED_UNICODE);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':    handleGet($conn);    break;
        case 'POST':   handlePost($conn);   break;
        case 'PUT':    handlePut($conn);    break;
        case 'DELETE': handleDelete($conn); break;
        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Método no permitido'], JSON_UNESCAPED_UNICODE);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
}

$conn->close();

// ── GET — listar productos con JOINs solo a tablas existentes ─────
function handleGet($conn) {
    $sql = "SELECT p.*,
                prov.nombre AS proveedor_nombre,
                b.nombre    AS bodega_nombre,
                c.nombre    AS categoria_nombre,
                s.nombre    AS subcategoria_nombre,
                par.nombre  AS estado_nombre
            FROM productos p
            LEFT JOIN proveedores  prov ON prov.id = p.proveedor_id
            LEFT JOIN bodegas      b    ON b.id    = p.bodega_id
            LEFT JOIN categorias   c    ON c.id    = p.categoria_id
            LEFT JOIN subcategorias s   ON s.id    = p.subcategoria_id
            LEFT JOIN parametros   par  ON par.id  = p.estado_id
            ORDER BY p.id DESC";

    $result = $conn->query($sql);
    if ($result === false) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Error al consultar: ' . $conn->error], JSON_UNESCAPED_UNICODE);
        return;
    }

    $productos = [];
    while ($row = $result->fetch_assoc()) { $productos[] = $row; }

    echo json_encode(['success' => true, 'data' => $productos, 'count' => count($productos)], JSON_UNESCAPED_UNICODE);
}

// ── POST — crear producto ─────────────────────────────────────────
function handlePost($conn) {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) { http_response_code(400); echo json_encode(['success'=>false,'error'=>'JSON inválido'],JSON_UNESCAPED_UNICODE); return; }

    $nombre = isset($input['nombre']) ? trim($input['nombre']) : '';
    if ($nombre === '') { http_response_code(400); echo json_encode(['success'=>false,'error'=>'Nombre obligatorio'],JSON_UNESCAPED_UNICODE); return; }

    $nombre         = $conn->real_escape_string($nombre);
    $proveedor_id   = !empty($input['proveedor_id'])   ? intval($input['proveedor_id'])   : null;
    $unidad_medida  = $conn->real_escape_string(trim($input['unidad_medida'] ?? ''));
    $nit            = $conn->real_escape_string(trim($input['nit'] ?? ''));
    $bodega_id      = !empty($input['bodega_id'])      ? intval($input['bodega_id'])      : null;
    $categoria_id   = !empty($input['categoria_id'])   ? intval($input['categoria_id'])   : null;
    $subcategoria_id= !empty($input['subcategoria_id'])? intval($input['subcategoria_id']): null;
    $stock          = isset($input['stock'])      ? floatval($input['stock'])      : 0;
    $stock_min      = isset($input['stock_min'])  ? floatval($input['stock_min'])  : 0;
    $stock_max      = isset($input['stock_max'])  ? floatval($input['stock_max'])  : 0;
    $precio         = isset($input['precio'])     ? floatval($input['precio'])     : 0;
    $fv             = !empty($input['fecha_vencimiento']) ? "'".$conn->real_escape_string($input['fecha_vencimiento'])."'" : 'NULL';
    $estado_id      = !empty($input['estado_id']) ? intval($input['estado_id'])    : null;

    $sql = "INSERT INTO productos
                (nombre, proveedor_id, unidad_medida, nit, bodega_id, categoria_id, subcategoria_id,
                 stock, stock_min, stock_max, precio, fecha_vencimiento, estado_id)
            VALUES (
                '$nombre',
                ".($proveedor_id    ? $proveedor_id    : 'NULL').",
                '$unidad_medida', '$nit',
                ".($bodega_id       ? $bodega_id       : 'NULL').",
                ".($categoria_id    ? $categoria_id    : 'NULL').",
                ".($subcategoria_id ? $subcategoria_id : 'NULL').",
                $stock, $stock_min, $stock_max, $precio, $fv,
                ".($estado_id       ? $estado_id       : 'NULL')."
            )";

    if ($conn->query($sql)) {
        http_response_code(201);
        echo json_encode(['success'=>true,'id'=>$conn->insert_id,'message'=>'Producto creado'],JSON_UNESCAPED_UNICODE);
    } else {
        http_response_code(500);
        echo json_encode(['success'=>false,'error'=>'Error al crear: '.$conn->error],JSON_UNESCAPED_UNICODE);
    }
}

// ── PUT — actualizar producto ─────────────────────────────────────
function handlePut($conn) {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input || empty($input['id'])) { http_response_code(400); echo json_encode(['success'=>false,'error'=>'ID obligatorio'],JSON_UNESCAPED_UNICODE); return; }

    $id = intval($input['id']);
    $check = $conn->query("SELECT id FROM productos WHERE id=$id");
    if (!$check || $check->num_rows === 0) { http_response_code(404); echo json_encode(['success'=>false,'error'=>'Producto no encontrado'],JSON_UNESCAPED_UNICODE); return; }

    $nombre = isset($input['nombre']) ? trim($input['nombre']) : '';
    if ($nombre === '') { http_response_code(400); echo json_encode(['success'=>false,'error'=>'Nombre obligatorio'],JSON_UNESCAPED_UNICODE); return; }

    $nombre         = $conn->real_escape_string($nombre);
    $proveedor_id   = !empty($input['proveedor_id'])   ? intval($input['proveedor_id'])   : null;
    $unidad_medida  = $conn->real_escape_string(trim($input['unidad_medida'] ?? ''));
    $nit            = $conn->real_escape_string(trim($input['nit'] ?? ''));
    $bodega_id      = !empty($input['bodega_id'])      ? intval($input['bodega_id'])      : null;
    $categoria_id   = !empty($input['categoria_id'])   ? intval($input['categoria_id'])   : null;
    $subcategoria_id= !empty($input['subcategoria_id'])? intval($input['subcategoria_id']): null;
    $stock          = isset($input['stock'])      ? floatval($input['stock'])      : 0;
    $stock_min      = isset($input['stock_min'])  ? floatval($input['stock_min'])  : 0;
    $stock_max      = isset($input['stock_max'])  ? floatval($input['stock_max'])  : 0;
    $precio         = isset($input['precio'])     ? floatval($input['precio'])     : 0;
    $fv             = !empty($input['fecha_vencimiento']) ? "'".$conn->real_escape_string($input['fecha_vencimiento'])."'" : 'NULL';
    $estado_id      = !empty($input['estado_id']) ? intval($input['estado_id'])    : null;

    $sql = "UPDATE productos SET
                nombre='$nombre',
                proveedor_id=".($proveedor_id    ? $proveedor_id    : 'NULL').",
                unidad_medida='$unidad_medida', nit='$nit',
                bodega_id=".($bodega_id           ? $bodega_id       : 'NULL').",
                categoria_id=".($categoria_id     ? $categoria_id    : 'NULL').",
                subcategoria_id=".($subcategoria_id? $subcategoria_id: 'NULL').",
                stock=$stock, stock_min=$stock_min, stock_max=$stock_max, precio=$precio,
                fecha_vencimiento=$fv,
                estado_id=".($estado_id           ? $estado_id       : 'NULL').",
                fecha_actualizacion=NOW()
            WHERE id=$id";

    if ($conn->query($sql)) {
        echo json_encode(['success'=>true,'message'=>'Producto actualizado'],JSON_UNESCAPED_UNICODE);
    } else {
        http_response_code(500);
        echo json_encode(['success'=>false,'error'=>'Error al actualizar: '.$conn->error],JSON_UNESCAPED_UNICODE);
    }
}

// ── DELETE — eliminar producto ────────────────────────────────────
function handleDelete($conn) {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input || empty($input['id'])) { http_response_code(400); echo json_encode(['success'=>false,'error'=>'ID obligatorio'],JSON_UNESCAPED_UNICODE); return; }

    $id = intval($input['id']);
    $check = $conn->query("SELECT id FROM productos WHERE id=$id");
    if (!$check || $check->num_rows === 0) { http_response_code(404); echo json_encode(['success'=>false,'error'=>'Producto no encontrado'],JSON_UNESCAPED_UNICODE); return; }

    if ($conn->query("DELETE FROM productos WHERE id=$id")) {
        echo json_encode(['success'=>true,'message'=>'Producto eliminado'],JSON_UNESCAPED_UNICODE);
    } else {
        http_response_code(500);
        echo json_encode(['success'=>false,'error'=>'Error al eliminar: '.$conn->error],JSON_UNESCAPED_UNICODE);
    }
}
?>