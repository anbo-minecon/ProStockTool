<?php
// transferencias.php — sin lotes, sin transferencias_lotes, sin modo_lotes
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);

require_once 'conexion.php';
session_start();

require_once 'verificar_rol.php';
verificarAutenticacion();
bloquearTendero();
bloquearEscritura();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

function jsonOk($data)  { echo json_encode(['success' => true,  'data' => $data]); exit; }
function jsonErr($msg, $code = 400) { http_response_code($code); echo json_encode(['success' => false, 'error' => $msg]); exit; }
function bodyJson()     { return json_decode(file_get_contents('php://input'), true) ?? []; }
function esc($conn, $v) { return $conn->real_escape_string($v); }

switch ($method) {

    // ══════════════════════════════════════════════════════════════
    case 'GET':
        switch ($action) {

            // ── Estadísticas ────────────────────────────────────
            case 'stats':
                $total     = $conn->query("SELECT COUNT(*) AS c FROM transferencias")->fetch_assoc()['c'];
                $pendiente = $conn->query("SELECT COUNT(*) AS c FROM transferencias WHERE estado='Pendiente'")->fetch_assoc()['c'];
                $transito  = $conn->query("SELECT COUNT(*) AS c FROM transferencias WHERE estado='En Tránsito'")->fetch_assoc()['c'];
                $completa  = $conn->query("SELECT COUNT(*) AS c FROM transferencias WHERE estado='Completada'")->fetch_assoc()['c'];
                jsonOk(['total'=>(int)$total,'pendiente'=>(int)$pendiente,'transito'=>(int)$transito,'completada'=>(int)$completa]);

            // ── Listar transferencias ────────────────────────────
            case 'listar':
                $buscar = $_GET['buscar'] ?? null;
                $estado = $_GET['estado'] ?? null;
                $pagina = max(1, (int)($_GET['pagina'] ?? 1));
                $limite = (int)($_GET['limite'] ?? 20);
                $offset = ($pagina - 1) * $limite;

                $where = ['1=1']; $params = []; $types = '';
                if ($buscar) {
                    $like = "%$buscar%";
                    $where[] = '(t.referencia LIKE ? OR p.nombre LIKE ? OR t.descripcion LIKE ?)';
                    $params[] = $like; $params[] = $like; $params[] = $like; $types .= 'sss';
                }
                if ($estado) { $where[] = 't.estado = ?'; $params[] = $estado; $types .= 's'; }
                $cond = implode(' AND ', $where);

                $stmtC = $conn->prepare(
                    "SELECT COUNT(*) AS total FROM transferencias t JOIN productos p ON p.id=t.producto_id WHERE $cond"
                );
                if ($types) $stmtC->bind_param($types, ...$params);
                $stmtC->execute();
                $total = $stmtC->get_result()->fetch_assoc()['total'];

                // Nota: modo_lotes no existe en la tabla, se omite
                $sql = "SELECT t.id, t.referencia, t.cantidad, t.descripcion, t.estado, t.fecha_creacion,
                               p.nombre AS producto_nombre, p.unidad_medida,
                               bo.nombre AS origen_nombre, bd.nombre AS destino_nombre,
                               u.nombre  AS usuario_nombre
                        FROM transferencias t
                        JOIN productos p  ON p.id  = t.producto_id
                        JOIN bodegas   bo ON bo.id = t.bodega_origen_id
                        JOIN bodegas   bd ON bd.id = t.bodega_destino_id
                        LEFT JOIN usuarios u ON u.id = t.usuario_id
                        WHERE $cond
                        ORDER BY t.fecha_creacion DESC
                        LIMIT ? OFFSET ?";
                $params[] = $limite; $params[] = $offset; $types .= 'ii';
                $stmt = $conn->prepare($sql);
                $stmt->bind_param($types, ...$params);
                $stmt->execute();
                $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
                jsonOk(['transferencias' => $rows, 'total' => (int)$total]);

            // ── Detalle de una transferencia ─────────────────────
            case 'detalle':
                $id = (int)($_GET['id'] ?? 0);
                if (!$id) jsonErr('ID requerido');
                $row = $conn->query(
                    "SELECT t.*, p.nombre AS producto_nombre, p.unidad_medida,
                            bo.nombre AS origen_nombre, bd.nombre AS destino_nombre,
                            u.nombre  AS usuario_nombre
                     FROM transferencias t
                     JOIN productos p  ON p.id  = t.producto_id
                     JOIN bodegas   bo ON bo.id = t.bodega_origen_id
                     JOIN bodegas   bd ON bd.id = t.bodega_destino_id
                     LEFT JOIN usuarios u ON u.id = t.usuario_id
                     WHERE t.id=$id"
                )->fetch_assoc();
                if (!$row) jsonErr('No encontrado', 404);
                jsonOk($row);

            // ── Catálogo de productos para el selector ───────────
            case 'productos':
                jsonOk($conn->query(
                    "SELECT p.id, p.nombre, p.stock, p.unidad_medida, p.bodega_id
                     FROM productos p
                     ORDER BY p.nombre"
                )->fetch_all(MYSQLI_ASSOC));

            // ── Catálogo de bodegas ──────────────────────────────
            case 'bodegas':
                jsonOk($conn->query("SELECT id, nombre FROM bodegas ORDER BY nombre")->fetch_all(MYSQLI_ASSOC));

            default: jsonErr('Acción no válida');
        }

    // ══════════════════════════════════════════════════════════════
    case 'POST':
        /*
         * Payload esperado:
         * {
         *   referencia, producto_id, bodega_origen, bodega_destino,
         *   cantidad, descripcion, estado
         * }
         */
        $d       = bodyJson();
        $ref     = trim($d['referencia']      ?? '');
        $prodId  = (int)($d['producto_id']    ?? 0);
        $origen  = (int)($d['bodega_origen']  ?? 0);
        $destino = (int)($d['bodega_destino'] ?? 0);
        $cantidad= (float)($d['cantidad']     ?? 0);
        $desc    = trim($d['descripcion']     ?? '');
        $estado  = trim($d['estado']          ?? 'Pendiente');
        $uid     = $_SESSION['usuario_id']    ?? null;

        if (!$ref)      jsonErr('Referencia requerida');
        if (!$prodId)   jsonErr('Producto requerido');
        if (!$origen)   jsonErr('Bodega origen requerida');
        if (!$destino)  jsonErr('Bodega destino requerida');
        if ($cantidad <= 0) jsonErr('La cantidad debe ser mayor a 0');
        if ($origen === $destino) jsonErr('Origen y destino no pueden ser iguales');

        $validEstados = ['Pendiente', 'En Tránsito', 'Completada'];
        if (!in_array($estado, $validEstados)) jsonErr('Estado no válido');

        // Verificar stock si se va a completar inmediatamente
        $prod = $conn->query("SELECT stock, bodega_id FROM productos WHERE id=$prodId")->fetch_assoc();
        if (!$prod) jsonErr('Producto no encontrado', 404);

        if ($estado === 'Completada' && (float)$prod['stock'] < $cantidad)
            jsonErr("Stock insuficiente (disponible: {$prod['stock']})");

        $uId = $uid ? $uid : 'NULL';

        $conn->begin_transaction();
        try {
            $conn->query("INSERT INTO transferencias
                              (referencia, producto_id, bodega_origen_id, bodega_destino_id,
                               cantidad, descripcion, estado, usuario_id)
                          VALUES ('".esc($conn,$ref)."', $prodId, $origen, $destino,
                                  $cantidad, '".esc($conn,$desc)."', '".esc($conn,$estado)."', $uId)");
            $trfId = $conn->insert_id;

            // Si se crea como Completada, descontar stock y mover bodega
            if ($estado === 'Completada') {
                $conn->query("UPDATE productos SET stock = stock - $cantidad WHERE id = $prodId");
                $conn->query("UPDATE productos SET bodega_id = $destino WHERE id = $prodId");
            }

            $conn->commit();
            jsonOk(['id' => $trfId, 'mensaje' => 'Transferencia registrada correctamente', 'cantidad' => $cantidad]);
        } catch (Exception $e) {
            $conn->rollback();
            jsonErr('Error: ' . $e->getMessage(), 500);
        }

    // ══════════════════════════════════════════════════════════════
    case 'PUT':
        $id     = (int)($_GET['id'] ?? 0);
        $d      = bodyJson();
        $estado = trim($d['estado'] ?? '');
        if (!$id || !$estado) jsonErr('ID y estado requeridos');

        $valid = ['Pendiente', 'En Tránsito', 'Completada', 'Cancelada'];
        if (!in_array($estado, $valid)) jsonErr('Estado no válido');

        $trf = $conn->query("SELECT * FROM transferencias WHERE id=$id")->fetch_assoc();
        if (!$trf) jsonErr('No encontrado', 404);
        if ($trf['estado'] === 'Completada') jsonErr('Una transferencia completada no puede cambiar de estado');

        $conn->begin_transaction();
        try {
            if ($estado === 'Completada' && $trf['estado'] !== 'Completada') {
                // Verificar stock disponible
                $prod = $conn->query("SELECT stock FROM productos WHERE id={$trf['producto_id']}")->fetch_assoc();
                if (!$prod) jsonErr('Producto no encontrado', 404);
                if ((float)$prod['stock'] < (float)$trf['cantidad'])
                    jsonErr("Stock insuficiente (disponible: {$prod['stock']})");

                // Descontar stock y cambiar bodega
                $conn->query("UPDATE productos SET stock = stock - {$trf['cantidad']} WHERE id = {$trf['producto_id']}");
                $conn->query("UPDATE productos SET bodega_id = {$trf['bodega_destino_id']} WHERE id = {$trf['producto_id']}");
            }

            $conn->query("UPDATE transferencias SET estado='".esc($conn,$estado)."' WHERE id=$id");
            $conn->commit();
            jsonOk(['mensaje' => "Estado actualizado a $estado"]);
        } catch (Exception $e) {
            $conn->rollback();
            jsonErr('Error: ' . $e->getMessage(), 500);
        }

    // ══════════════════════════════════════════════════════════════
    case 'DELETE':
        $id  = (int)($_GET['id'] ?? 0);
        if (!$id) jsonErr('ID requerido');
        $row = $conn->query("SELECT estado FROM transferencias WHERE id=$id")->fetch_assoc();
        if (!$row) jsonErr('No encontrado', 404);
        if ($row['estado'] === 'Completada') jsonErr('No se puede eliminar una transferencia completada');
        $conn->query("DELETE FROM transferencias WHERE id=$id");
        jsonOk(['mensaje' => 'Transferencia eliminada']);

    default: jsonErr('Método no permitido', 405);
}
?>