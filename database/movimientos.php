<?php
// movimientos.php — sin tabla lotes, usa productos.stock directamente
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

require_once 'conexion.php';
session_start();

require_once 'verificar_rol.php';
verificarAutenticacion();

$action = $_GET['action'] ?? '';
if ($action !== 'recientes') { soloAdmin(); }

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

function jsonOk($data)  { echo json_encode(['success' => true,  'data' => $data]); exit; }
function jsonErr($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $msg]);
    exit;
}
function bodyJson() {
    $raw = file_get_contents('php://input');
    $d   = json_decode($raw, true);
    if ($d === null && $raw !== '') jsonErr('JSON inválido');
    return $d ?? [];
}

switch ($method) {

    // ══════════════════════════════════════════════════════════════
    case 'GET':
        switch ($action) {

            // ── Listar movimientos con filtros y paginación ─────
            case 'listar':
                $tipo   = $_GET['tipo']   ?? null;
                $desde  = $_GET['desde']  ?? null;
                $hasta  = $_GET['hasta']  ?? null;
                $buscar = $_GET['buscar'] ?? null;
                $pagina = max(1, (int)($_GET['pagina'] ?? 1));
                $limite = (int)($_GET['limite'] ?? 20);
                $offset = ($pagina - 1) * $limite;

                $where = ['1=1']; $params = []; $types = '';
                if ($tipo)   { $where[] = 'm.tipo = ?';                       $params[] = $tipo;  $types .= 's'; }
                if ($desde)  { $where[] = 'DATE(m.fecha_creacion) >= ?';      $params[] = $desde; $types .= 's'; }
                if ($hasta)  { $where[] = 'DATE(m.fecha_creacion) <= ?';      $params[] = $hasta; $types .= 's'; }
                if ($buscar) {
                    $like = "%$buscar%";
                    $where[] = '(m.referencia LIKE ? OR m.tipo_detalle LIKE ? OR pr.nombre LIKE ?)';
                    $params[] = $like; $params[] = $like; $params[] = $like; $types .= 'sss';
                }
                $cond = implode(' AND ', $where);

                $stmtC = $conn->prepare("SELECT COUNT(DISTINCT m.id) AS total
                                         FROM movimientos m
                                         LEFT JOIN proveedores pr ON pr.id = m.proveedor_id
                                         WHERE $cond");
                if ($types) $stmtC->bind_param($types, ...$params);
                $stmtC->execute();
                $total = $stmtC->get_result()->fetch_assoc()['total'];

                $sql = "SELECT m.id, m.tipo, m.referencia, m.tipo_detalle, m.cliente,
                               m.notas, m.total, m.estado, m.fecha_creacion,
                               pr.nombre AS proveedor_nombre, u.nombre AS usuario_nombre,
                               COUNT(DISTINCT d.producto_id) AS num_productos,
                               SUM(d.cantidad) AS cantidad_total
                        FROM movimientos m
                        LEFT JOIN proveedores      pr ON pr.id = m.proveedor_id
                        LEFT JOIN usuarios         u  ON u.id  = m.usuario_id
                        LEFT JOIN movimientos_detalle d ON d.movimiento_id = m.id
                        WHERE $cond
                        GROUP BY m.id
                        ORDER BY m.fecha_creacion DESC
                        LIMIT ? OFFSET ?";
                $params[] = $limite; $params[] = $offset; $types .= 'ii';
                $stmt = $conn->prepare($sql);
                $stmt->bind_param($types, ...$params);
                $stmt->execute();
                $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
                jsonOk(['movimientos' => $rows, 'total' => (int)$total, 'pagina' => $pagina, 'limite' => $limite]);

            // ── Detalle de un movimiento ────────────────────────
            case 'detalle':
                $id = (int)($_GET['id'] ?? 0);
                if (!$id) jsonErr('ID requerido');
                $mov = $conn->query(
                    "SELECT m.*, pr.nombre AS proveedor_nombre, u.nombre AS usuario_nombre
                     FROM movimientos m
                     LEFT JOIN proveedores pr ON pr.id = m.proveedor_id
                     LEFT JOIN usuarios    u  ON u.id  = m.usuario_id
                     WHERE m.id = $id"
                )->fetch_assoc();
                if (!$mov) jsonErr('Movimiento no encontrado', 404);

                $detalle = $conn->query(
                    "SELECT d.*, p.nombre AS producto_nombre, p.unidad_medida
                     FROM movimientos_detalle d
                     JOIN productos p ON p.id = d.producto_id
                     WHERE d.movimiento_id = $id"
                )->fetch_all(MYSQLI_ASSOC);
                $mov['detalle'] = $detalle;
                jsonOk($mov);

            // ── Catálogo de proveedores ─────────────────────────
            case 'proveedores':
                jsonOk($conn->query("SELECT id, nombre FROM proveedores ORDER BY nombre")->fetch_all(MYSQLI_ASSOC));

            // ── Catálogo de productos con stock ─────────────────
            case 'productos':
                jsonOk($conn->query(
                    "SELECT p.id, p.nombre, p.stock, p.precio, p.unidad_medida
                     FROM productos p
                     ORDER BY p.nombre"
                )->fetch_all(MYSQLI_ASSOC));

            // ── Movimientos recientes por bodega ────────────────
            case 'recientes':
                $bodegaId = (int)($_GET['bodega_id'] ?? 0);
                $limit    = (int)($_GET['limit'] ?? 15);
                if (!$bodegaId) jsonErr('bodega_id requerido');
                $sql = "SELECT m.id, m.tipo, m.fecha_creacion,
                               d.cantidad, d.precio_unit,
                               p.nombre AS producto_nombre, u.nombre AS usuario_nombre
                        FROM movimientos m
                        LEFT JOIN movimientos_detalle d ON d.movimiento_id = m.id
                        LEFT JOIN productos  p ON p.id = d.producto_id
                        LEFT JOIN usuarios   u ON u.id = m.usuario_id
                        WHERE p.bodega_id = ?
                        ORDER BY m.fecha_creacion DESC
                        LIMIT ?";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param('ii', $bodegaId, $limit);
                $stmt->execute();
                jsonOk($stmt->get_result()->fetch_all(MYSQLI_ASSOC));

            default:
                jsonErr('Acción GET no válida');
        }

    // ══════════════════════════════════════════════════════════════
    case 'POST':
        $d = bodyJson();

        $tipo        = trim($d['tipo']        ?? '');
        $referencia  = trim($d['referencia']  ?? '');
        $tipoDetalle = trim($d['tipo_detalle'] ?? '');
        $notas       = trim($d['notas']       ?? '');

        if (!in_array($tipo, ['entrada','salida'])) jsonErr('Tipo inválido: entrada | salida');
        if (!$referencia)  jsonErr('Referencia requerida');
        if (!$tipoDetalle) jsonErr('Tipo de detalle requerido');

        $uId = $_SESSION['usuario_id'] ?? null;

        $conn->begin_transaction();
        try {

            // ── ENTRADA ──────────────────────────────────────────
            if ($tipo === 'entrada') {
                $prodId      = (int)($d['producto_id'] ?? 0);
                $cantidad    = (float)($d['cantidad']  ?? 0);
                $precio      = (float)($d['precio']    ?? 0);
                $proveedorId = !empty($d['proveedor_id']) ? (int)$d['proveedor_id'] : null;

                if (!$prodId)    jsonErr('producto_id requerido para entradas');
                if ($cantidad <= 0) jsonErr('La cantidad debe ser mayor a 0');

                $prod = $conn->query("SELECT id FROM productos WHERE id=$prodId")->fetch_assoc();
                if (!$prod) jsonErr("Producto $prodId no encontrado", 404);

                $total    = round($cantidad * $precio, 2);
                $pId      = $proveedorId ?? 'NULL';
                $refS     = $conn->real_escape_string($referencia);
                $tipS     = $conn->real_escape_string($tipoDetalle);
                $notS     = $conn->real_escape_string($notas);

                $conn->query("INSERT INTO movimientos
                                  (tipo, referencia, tipo_detalle, proveedor_id, notas, total, usuario_id, estado)
                              VALUES ('entrada','$refS','$tipS',$pId,'$notS',$total,".($uId??'NULL').",'confirmado')");
                $movId = $conn->insert_id;

                $subtotal = round($cantidad * $precio, 2);
                $conn->query("INSERT INTO movimientos_detalle
                                  (movimiento_id, producto_id, cantidad, precio_unit, subtotal)
                              VALUES ($movId, $prodId, $cantidad, $precio, $subtotal)");

                // Sumar stock directamente
                $conn->query("UPDATE productos SET stock = stock + $cantidad WHERE id = $prodId");

                $conn->commit();
                jsonOk(['id' => $movId, 'mensaje' => 'Entrada registrada correctamente']);
            }

            // ── SALIDA ───────────────────────────────────────────
            if ($tipo === 'salida') {
                $cliente = trim($d['cliente'] ?? '');
                $items   = $d['items'] ?? [];
                if (empty($items)) jsonErr('Debe incluir al menos un item');

                $refS      = $conn->real_escape_string($referencia);
                $tipS      = $conn->real_escape_string($tipoDetalle);
                $notS      = $conn->real_escape_string($notas);
                $cliS      = $conn->real_escape_string($cliente);
                $totalMov  = 0;
                $lineas    = [];

                foreach ($items as $item) {
                    $prodId   = (int)($item['producto_id'] ?? 0);
                    $cantidad = (float)($item['cantidad']  ?? 0);
                    $precio   = (float)($item['precio']    ?? 0);

                    if (!$prodId)    jsonErr('producto_id requerido en cada item');
                    if ($cantidad <= 0) jsonErr("Cantidad inválida para producto $prodId");

                    $prodRow = $conn->query("SELECT stock, precio FROM productos WHERE id=$prodId")->fetch_assoc();
                    if (!$prodRow) jsonErr("Producto $prodId no encontrado", 404);

                    // Si no se envía precio, usar el precio del producto
                    if ($precio <= 0) $precio = (float)$prodRow['precio'];

                    if ((float)$prodRow['stock'] < $cantidad)
                        jsonErr("Stock insuficiente en producto #$prodId (disponible: {$prodRow['stock']})");

                    $sub       = round($cantidad * $precio, 2);
                    $totalMov += $sub;
                    $lineas[]  = ['producto_id' => $prodId, 'cantidad' => $cantidad, 'precio' => $precio, 'subtotal' => $sub];
                }

                $totalMov = round($totalMov, 2);
                $conn->query("INSERT INTO movimientos
                                  (tipo, referencia, tipo_detalle, cliente, notas, total, usuario_id, estado)
                              VALUES ('salida','$refS','$tipS','$cliS','$notS',$totalMov,".($uId??'NULL').",'confirmado')");
                $movId = $conn->insert_id;

                foreach ($lineas as $l) {
                    $conn->query("INSERT INTO movimientos_detalle
                                      (movimiento_id, producto_id, cantidad, precio_unit, subtotal)
                                  VALUES ($movId,{$l['producto_id']},{$l['cantidad']},{$l['precio']},{$l['subtotal']})");
                    // Descontar stock
                    $conn->query("UPDATE productos SET stock = stock - {$l['cantidad']} WHERE id = {$l['producto_id']}");
                }

                $conn->commit();
                jsonOk(['id' => $movId, 'mensaje' => 'Salida registrada correctamente']);
            }

        } catch (Exception $e) {
            $conn->rollback();
            jsonErr('Error: ' . $e->getMessage(), 500);
        }

    // ══════════════════════════════════════════════════════════════
    case 'DELETE':
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) jsonErr('ID requerido');

        $mov = $conn->query("SELECT * FROM movimientos WHERE id=$id")->fetch_assoc();
        if (!$mov)                        jsonErr('Movimiento no encontrado', 404);
        if ($mov['estado'] === 'anulado') jsonErr('El movimiento ya está anulado');

        $conn->begin_transaction();
        try {
            // Revertir stock según el tipo del movimiento
            $detalle = $conn->query(
                "SELECT producto_id, cantidad FROM movimientos_detalle WHERE movimiento_id=$id"
            )->fetch_all(MYSQLI_ASSOC);

            foreach ($detalle as $l) {
                if ($mov['tipo'] === 'entrada') {
                    // Quitar lo que entró
                    $conn->query("UPDATE productos SET stock = stock - {$l['cantidad']} WHERE id = {$l['producto_id']}");
                } elseif ($mov['tipo'] === 'salida') {
                    // Devolver lo que salió
                    $conn->query("UPDATE productos SET stock = stock + {$l['cantidad']} WHERE id = {$l['producto_id']}");
                }
            }

            $conn->query("UPDATE movimientos SET estado='anulado' WHERE id=$id");
            $conn->commit();
            jsonOk(['mensaje' => 'Movimiento anulado y stock revertido']);
        } catch (Exception $e) {
            $conn->rollback();
            jsonErr('Error: ' . $e->getMessage(), 500);
        }

    default:
        jsonErr('Método no permitido', 405);
}
?>