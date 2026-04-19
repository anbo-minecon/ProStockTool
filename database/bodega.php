<?php
// filepath: c:\xampp\htdocs\Pro-Stock-Tool\database\bodega.php
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

// ── Control de acceso por roles ──────────────────────────────
require_once 'verificar_rol.php';
verificarAutenticacion();
bloquearTendero();   // Tendero no accede a bodegas
bloquearEscritura(); // Jefe de bodega solo puede leer
// ─────────────────────────────────────────────────────────────
$method = $_SERVER['REQUEST_METHOD'];
$type = $_GET['type'] ?? 'bodegas'; // bodegas o conceptos

try {
    switch ($method) {
        case 'GET':
            if ($type === 'conceptos') {
                // Obtener conceptos de inventario
                $sql = "SELECT id, nombre, descripcion, tipo FROM conceptos_inventario ORDER BY id DESC";
                $result = $conn->query($sql);
                $conceptos = [];
                
                if ($result && $result->num_rows > 0) {
                    while ($row = $result->fetch_assoc()) {
                        $conceptos[] = $row;
                    }
                }
                
                echo json_encode([
                    'success' => true,
                    'data' => $conceptos
                ], JSON_UNESCAPED_UNICODE);
            } else if ($type === 'productos_bodega') {
                // Retornar todos los productos de una bodega específica (para el modal de consulta)
                $bodega_id = isset($_GET['bodega_id']) ? intval($_GET['bodega_id']) : 0;
                if ($bodega_id <= 0) {
                    echo json_encode(['success' => false, 'error' => 'bodega_id requerido'], JSON_UNESCAPED_UNICODE);
                    break;
                }

                $sqlProd = "SELECT
                                p.id,
                                p.nombre,
                                p.stock,
                                p.stock_min,
                                p.stock_max,
                                p.precio,
                                p.unidad_medida,
                                c.nombre   AS categoria,
                                par.nombre AS estado,
                                par.color  AS estado_color
                            FROM productos p
                            LEFT JOIN categorias c   ON c.id  = p.categoria_id
                            LEFT JOIN parametros par ON par.id = p.estado_id
                            WHERE p.bodega_id = $bodega_id
                            ORDER BY p.nombre ASC";

                $resProd = $conn->query($sqlProd);
                if ($resProd === false) {
                    $dbErr = $conn->error;
                    error_log("[bodega.php GET productos_bodega] SQL error: $dbErr");
                    echo json_encode(['success' => false, 'error' => 'Error al consultar productos', 'debug' => $dbErr], JSON_UNESCAPED_UNICODE);
                    break;
                }

                $productos = [];
                while ($row = $resProd->fetch_assoc()) {
                    $row['stock']     = (float) $row['stock'];
                    $row['stock_min'] = (float) $row['stock_min'];
                    $row['stock_max'] = (float) $row['stock_max'];
                    $row['precio']    = (float) $row['precio'];
                    $productos[] = $row;
                }
                echo json_encode(['success' => true, 'data' => $productos], JSON_UNESCAPED_UNICODE);

            } else {
                // Obtener bodegas originales (sin duplicados por bodegas_compartidas).
                // El jefe se obtiene como subconsulta correlated para evitar que el LEFT JOIN
                // multiplique filas cuando varias personas tienen la misma bodega_asignada_id.
                $sql = "SELECT
                            b.id,
                            b.nombre,
                            b.descripcion,
                            b.fecha_creacion,
                            (
                                SELECT u.id
                                FROM usuarios u
                                WHERE u.bodega_asignada_id = b.id
                                  AND u.rol = 'jefe_bodega'
                                  AND u.estado = 'activo'
                                ORDER BY u.id ASC
                                LIMIT 1
                            ) AS jefe_id,
                            (
                                SELECT u.nombre
                                FROM usuarios u
                                WHERE u.bodega_asignada_id = b.id
                                  AND u.rol = 'jefe_bodega'
                                  AND u.estado = 'activo'
                                ORDER BY u.id ASC
                                LIMIT 1
                            ) AS jefe_nombre,
                            (SELECT COUNT(*) FROM productos p WHERE p.bodega_id = b.id) AS total_productos,
                            (
                                SELECT GROUP_CONCAT(p2.nombre ORDER BY p2.nombre ASC SEPARATOR '||')
                                FROM productos p2
                                WHERE p2.bodega_id = b.id
                            ) AS productos_muestra
                        FROM bodegas b
                        ORDER BY b.id DESC";

                $result = $conn->query($sql);

                // Si la query falla, se registra el error en el log del servidor
                // y se devuelve un mensaje genérico al cliente
                if ($result === false) {
                    $dbErr = $conn->error;
                    error_log("[bodega.php GET bodegas] SQL error: $dbErr");
                    echo json_encode([
                        'success' => false,
                        'error'   => 'Error al consultar bodegas',
                        'debug'   => $dbErr   // visible solo en entorno de desarrollo
                    ], JSON_UNESCAPED_UNICODE);
                    break;
                }

                $bodegas = [];

                if ($result && $result->num_rows > 0) {
                    while ($row = $result->fetch_assoc()) {
                        $row['total_productos'] = (int) $row['total_productos'];
                        if (!empty($row['productos_muestra'])) {
                            $todos = explode('||', $row['productos_muestra']);
                            // Se limita a 5 para la vista previa; el total real ya está en total_productos
                            $row['productos_muestra'] = array_slice($todos, 0, 5);
                        } else {
                            $row['productos_muestra'] = [];
                        }
                        $bodegas[] = $row;
                    }
                }

                echo json_encode([
                    'success' => true,
                    'data'    => $bodegas
                ], JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'POST':
            if ($type === 'conceptos') {
                // Crear nuevo concepto
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
                $tipo = isset($data['tipo']) ? trim($data['tipo']) : 'entrada';
                
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
                
                $tiposValidos = ['entrada', 'salida', 'ajuste'];
                if (!in_array($tipo, $tiposValidos)) {
                    $tipo = 'entrada';
                }
                
                // Escapar datos
                $nombre = $conn->real_escape_string($nombre);
                $descripcion = $conn->real_escape_string($descripcion);
                
                // Verificar nombre único
                $checkNameSql = "SELECT id FROM conceptos_inventario WHERE nombre = '$nombre'";
                $checkNameResult = $conn->query($checkNameSql);
                
                if ($checkNameResult && $checkNameResult->num_rows > 0) {
                    echo json_encode([
                        'success' => false,
                        'error' => 'Ya existe un concepto con este nombre'
                    ], JSON_UNESCAPED_UNICODE);
                    exit;
                }
                
                // Insertar
                $sql = "INSERT INTO conceptos_inventario (nombre, descripcion, tipo, fecha_creacion) 
                        VALUES ('$nombre', '$descripcion', '$tipo', NOW())";
                
                if ($conn->query($sql)) {
                    echo json_encode([
                        'success' => true,
                        'id' => $conn->insert_id,
                        'message' => 'Concepto creado exitosamente'
                    ], JSON_UNESCAPED_UNICODE);
                } else {
                    echo json_encode([
                        'success' => false,
                        'error' => 'Error al crear: ' . $conn->error
                    ], JSON_UNESCAPED_UNICODE);
                }
            } else {
                // Crear nueva bodega
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
            }
            break;

        case 'PUT':
            if ($type === 'conceptos') {
                // Actualizar concepto
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
                $tipo = isset($data['tipo']) ? trim($data['tipo']) : 'entrada';
                
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
                
                $tiposValidos = ['entrada', 'salida', 'ajuste'];
                if (!in_array($tipo, $tiposValidos)) {
                    $tipo = 'entrada';
                }
                
                // Escapar datos
                $nombre = $conn->real_escape_string($nombre);
                $descripcion = $conn->real_escape_string($descripcion);
                
                // Verificar que existe
                $checkSql = "SELECT id FROM conceptos_inventario WHERE id = $id";
                $checkResult = $conn->query($checkSql);
                
                if (!$checkResult || $checkResult->num_rows === 0) {
                    echo json_encode([
                        'success' => false,
                        'error' => 'Concepto no encontrado'
                    ], JSON_UNESCAPED_UNICODE);
                    exit;
                }
                
                // Verificar nombre único (excepto el actual)
                $checkNameSql = "SELECT id FROM conceptos_inventario WHERE nombre = '$nombre' AND id != $id";
                $checkNameResult = $conn->query($checkNameSql);
                
                if ($checkNameResult && $checkNameResult->num_rows > 0) {
                    echo json_encode([
                        'success' => false,
                        'error' => 'Ya existe otro concepto con este nombre'
                    ], JSON_UNESCAPED_UNICODE);
                    exit;
                }
                
                // Actualizar
                $sql = "UPDATE conceptos_inventario SET 
                        nombre = '$nombre',
                        descripcion = '$descripcion',
                        tipo = '$tipo',
                        fecha_actualizacion = NOW()
                        WHERE id = $id";
                
                if ($conn->query($sql)) {
                    echo json_encode([
                        'success' => true,
                        'message' => 'Concepto actualizado exitosamente'
                    ], JSON_UNESCAPED_UNICODE);
                } else {
                    echo json_encode([
                        'success' => false,
                        'error' => 'Error al actualizar: ' . $conn->error
                    ], JSON_UNESCAPED_UNICODE);
                }
            } else {
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
            }
            break;

        case 'DELETE':
            if ($type === 'conceptos') {
                // Eliminar concepto
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
                $checkSql = "SELECT id FROM conceptos_inventario WHERE id = $id";
                $checkResult = $conn->query($checkSql);
                
                if (!$checkResult || $checkResult->num_rows === 0) {
                    echo json_encode([
                        'success' => false,
                        'error' => 'Concepto no encontrado'
                    ], JSON_UNESCAPED_UNICODE);
                    exit;
                }
                
                // Eliminar
                $sql = "DELETE FROM conceptos_inventario WHERE id = $id";
                
                if ($conn->query($sql)) {
                    echo json_encode([
                        'success' => true,
                        'message' => 'Concepto eliminado exitosamente'
                    ], JSON_UNESCAPED_UNICODE);
                } else {
                    echo json_encode([
                        'success' => false,
                        'error' => 'Error al eliminar: ' . $conn->error
                    ], JSON_UNESCAPED_UNICODE);
                }
            } else {
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
    $msg = $e->getMessage();
    error_log("[bodega.php] Exception: $msg");
    echo json_encode([
        'success' => false,
        'error'   => 'Error del servidor',
        'debug'   => $msg   // visible solo en entorno de desarrollo
    ], JSON_UNESCAPED_UNICODE);
}

$conn->close();
?>