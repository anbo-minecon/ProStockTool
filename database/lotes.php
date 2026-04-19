<?php
// ============================================================
// lotes.php — API de gestión de lotes
// ============================================================
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once 'conexion.php';
require_once 'verificar_rol.php';
verificarAutenticacion();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// ── HELPERS ──────────────────────────────────────────────────
function jOk($data)       { echo json_encode(['success' => true,  'data'  => $data],  JSON_UNESCAPED_UNICODE); exit; }
function jErr($msg, $c=400){ http_response_code($c); echo json_encode(['success'=>false,'error'=>$msg], JSON_UNESCAPED_UNICODE); exit; }
function body()            { return json_decode(file_get_contents('php://input'), true) ?? []; }
function esc($conn, $v)    { return $conn->real_escape_string($v); }

// Recalcula y sincroniza el stock del producto desde la suma de lotes activos
function sincronizarStock($conn, $producto_id) {
    $r = $conn->query("SELECT COALESCE(SUM(cantidad),0) AS s FROM lotes WHERE producto_id=$producto_id AND estado='activo'");
    $stock = $r->fetch_assoc()['s'];
    $conn->query("UPDATE productos SET stock=$stock WHERE id=$producto_id");
    return (float)$stock;
}

switch ($method) {

    // ── GET ──────────────────────────────────────────────────────
    case 'GET':
        switch ($action) {

            // Listar lotes de un producto
            case 'por_producto':
                $pid = (int)($_GET['producto_id'] ?? 0);
                if (!$pid) jErr('producto_id requerido');
                $soloActivos = ($_GET['solo_activos'] ?? '1') === '1';
                $cond = $soloActivos ? "AND l.estado='activo'" : '';

                $sql = "SELECT l.*,
                               m.referencia AS movimiento_ref,
                               p.nombre     AS producto_nombre,
                               p.unidad_medida
                        FROM lotes l
                        LEFT JOIN movimientos m ON m.id = l.movimiento_id
                        LEFT JOIN productos   p ON p.id = l.producto_id
                        WHERE l.producto_id = $pid $cond
                        ORDER BY l.fecha_ingreso ASC, l.id ASC";
                $res = $conn->query($sql);
                if (!$res) jErr('Error al consultar lotes: '.$conn->error, 500);
                jOk($res->fetch_all(MYSQLI_ASSOC));

            // Detalle de un lote
            case 'detalle':
                $id = (int)($_GET['id'] ?? 0);
                if (!$id) jErr('id requerido');
                $res = $conn->query("SELECT l.*, p.nombre AS producto_nombre, p.unidad_medida,
                                     m.referencia AS movimiento_ref
                                     FROM lotes l
                                     LEFT JOIN productos  p ON p.id = l.producto_id
                                     LEFT JOIN movimientos m ON m.id = l.movimiento_id
                                     WHERE l.id = $id");
                $row = $res ? $res->fetch_assoc() : null;
                if (!$row) jErr('Lote no encontrado', 404);
                jOk($row);

            // Resumen de lotes por producto (para listado rápido en transferencias/salidas)
            case 'resumen_producto':
                $pid = (int)($_GET['producto_id'] ?? 0);
                if (!$pid) jErr('producto_id requerido');
                $res = $conn->query(
                    "SELECT id, cantidad, fecha_ingreso, fecha_vencimiento, notas
                     FROM lotes
                     WHERE producto_id=$pid AND estado='activo' AND cantidad > 0
                     ORDER BY fecha_ingreso ASC, id ASC"
                );
                if (!$res) jErr('Error: '.$conn->error, 500);
                jOk($res->fetch_all(MYSQLI_ASSOC));

            default:
                jErr('Acción no válida');
        }

    // ── POST — Crear lote manualmente ────────────────────────────
    case 'POST':
        bloquearEscritura();
        $d = body();
        $pid   = (int)($d['producto_id'] ?? 0);
        $cant  = (float)($d['cantidad']   ?? 0);
        $fi    = trim($d['fecha_ingreso'] ?? date('Y-m-d'));
        $fv    = !empty($d['fecha_vencimiento']) ? "'".$conn->real_escape_string($d['fecha_vencimiento'])."'" : 'NULL';
        $notas = esc($conn, trim($d['notas'] ?? ''));

        if (!$pid)   jErr('producto_id requerido');
        if ($cant<=0) jErr('cantidad debe ser mayor a 0');

        $check = $conn->query("SELECT id FROM productos WHERE id=$pid");
        if (!$check || $check->num_rows===0) jErr('Producto no encontrado', 404);

        $conn->begin_transaction();
        try {
            $conn->query("INSERT INTO lotes (producto_id, cantidad, fecha_ingreso, fecha_vencimiento, notas)
                          VALUES ($pid, $cant, '$fi', $fv, '$notas')");
            $loteId = $conn->insert_id;
            $stock  = sincronizarStock($conn, $pid);
            $conn->commit();
            jOk(['id' => $loteId, 'stock_actualizado' => $stock, 'mensaje' => 'Lote creado correctamente']);
        } catch (Exception $e) {
            $conn->rollback();
            jErr('Error al crear lote: '.$e->getMessage(), 500);
        }

    // ── PUT — Actualizar lote ─────────────────────────────────────
    case 'PUT':
        bloquearEscritura();
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) jErr('id requerido');
        $d  = body();

        $lote = $conn->query("SELECT * FROM lotes WHERE id=$id")->fetch_assoc();
        if (!$lote) jErr('Lote no encontrado', 404);

        $cant  = isset($d['cantidad'])         ? (float)$d['cantidad']                 : (float)$lote['cantidad'];
        $fi    = !empty($d['fecha_ingreso'])    ? $conn->real_escape_string($d['fecha_ingreso']) : $lote['fecha_ingreso'];
        $fv    = !empty($d['fecha_vencimiento'])
                    ? "'".$conn->real_escape_string($d['fecha_vencimiento'])."'"
                    : ($lote['fecha_vencimiento'] ? "'".$lote['fecha_vencimiento']."'" : 'NULL');
        $notas = isset($d['notas']) ? esc($conn, trim($d['notas'])) : esc($conn, $lote['notas'] ?? '');
        $estado= !empty($d['estado'])           ? esc($conn, $d['estado'])              : $lote['estado'];

        if ($cant < 0) jErr('cantidad no puede ser negativa');

        $conn->begin_transaction();
        try {
            $conn->query("UPDATE lotes SET
                            cantidad='$cant', fecha_ingreso='$fi', fecha_vencimiento=$fv,
                            notas='$notas', estado='$estado'
                          WHERE id=$id");
            $stock = sincronizarStock($conn, $lote['producto_id']);
            $conn->commit();
            jOk(['mensaje' => 'Lote actualizado', 'stock_actualizado' => $stock]);
        } catch (Exception $e) {
            $conn->rollback();
            jErr('Error: '.$e->getMessage(), 500);
        }

    // ── DELETE — Eliminar lote (solo si no tiene movimientos) ─────
    case 'DELETE':
        bloquearEscritura();
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) jErr('id requerido');

        $lote = $conn->query("SELECT * FROM lotes WHERE id=$id")->fetch_assoc();
        if (!$lote) jErr('Lote no encontrado', 404);

        // Verificar que no esté vinculado a transferencias o salidas
        $enUso = $conn->query("SELECT COUNT(*) AS c FROM movimientos_detalle WHERE lote_id=$id")->fetch_assoc()['c'];
        if ($enUso > 0) jErr('El lote está asociado a movimientos. No se puede eliminar, solo anular.');

        $enTrf = $conn->query("SELECT COUNT(*) AS c FROM transferencias_lotes WHERE lote_id=$id")->fetch_assoc()['c'];
        if ($enTrf > 0) jErr('El lote está asociado a transferencias. No se puede eliminar.');

        $conn->begin_transaction();
        try {
            $conn->query("DELETE FROM lotes WHERE id=$id");
            $stock = sincronizarStock($conn, $lote['producto_id']);
            $conn->commit();
            jOk(['mensaje' => 'Lote eliminado', 'stock_actualizado' => $stock]);
        } catch (Exception $e) {
            $conn->rollback();
            jErr('Error: '.$e->getMessage(), 500);
        }

    default:
        jErr('Método no permitido', 405);
}
?>
