<?php
// API simple de búsqueda de productos
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'conexion.php';

$query = isset($_GET['q']) ? trim($_GET['q']) : '';
$limit = isset($_GET['limit']) ? intval($_GET['limit']) : 20;
if ($limit <= 0) $limit = 20;

try {
    if ($query === '') {
        echo json_encode([ 'success' => true, 'data' => [] ]);
        exit;
    }
    
    $like = "%" . $query . "%";
    
    $sql = "SELECT p.id, p.nombre, p.nit AS sku, p.stock,
                   COALESCE(b.nombre,'') AS bodega,
                   COALESCE(c.nombre,'') AS categoria
            FROM productos p
            LEFT JOIN bodegas b ON b.id = p.bodega_id
            LEFT JOIN categorias c ON c.id = p.categoria_id
            WHERE (p.nombre LIKE ? OR p.nit LIKE ?)
          ";

    $params = [$like, $like];
    $types = 'ss';

    if (is_numeric($query)) {
        $sql .= " OR p.id = ?";
        $types .= 'i';
        $params[] = intval($query);
    }

    $sql .= " ORDER BY p.nombre ASC LIMIT ?";
    $types .= 'i';
    $params[] = $limit;

    $stmt = $conn->prepare($sql);
    if ($stmt === false) {
        throw new Exception('Error en la preparación: ' . $conn->error);
    }

    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $res = $stmt->get_result();
    $items = [];
    while ($row = $res->fetch_assoc()) {
        $items[] = $row;
    }

    echo json_encode([ 'success' => true, 'data' => $items ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([ 'success' => false, 'error' => $e->getMessage() ]);
}
?>