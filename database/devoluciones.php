<?php
// database/devoluciones.php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);

require_once '../auth/conexion.php';
session_start();

// ── Control de acceso por roles ──────────────────────────────
// Devoluciones: jefe_bodega puede ver (solo lectura), tendero no accede
require_once 'verificar_rol.php';
verificarAutenticacion();
bloquearTendero();   // Tendero no accede a devoluciones
bloquearEscritura(); // Jefe de bodega solo puede leer
// ─────────────────────────────────────────────────────────────

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

function jsonOk($data)  { echo json_encode(['success' => true,  'data' => $data]); exit; }
function jsonErr($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $msg]); exit;
}
function bodyJson() {
    $d = json_decode(file_get_contents('php://input'), true);
    return $d ?? [];
}
function esc($conn, $v) { return $conn->real_escape_string($v); }

switch ($method) {

    // ── GET ──────────────────────────────────────────────────────
    case 'GET':
        switch ($action) {

            case 'stats':
                $total     = $conn->query("SELECT COUNT(*) AS c FROM devoluciones")->fetch_assoc()['c'];
                $pendiente = $conn->query("SELECT COUNT(*) AS c FROM devoluciones WHERE estado='Pendiente'")->fetch_assoc()['c'];
                $clientes  = $conn->query("SELECT COUNT(*) AS c FROM devoluciones WHERE tipo='De Cliente'")->fetch_assoc()['c'];
                $provs     = $conn->query("SELECT COUNT(*) AS c FROM devoluciones WHERE tipo='A Proveedor'")->fetch_assoc()['c'];
                jsonOk(['total'=>(int)$total,'pendiente'=>(int)$pendiente,'clientes'=>(int)$clientes,'proveedores'=>(int)$provs]);

            case 'listar':
                $buscar = $_GET['buscar'] ?? null;
                $estado = $_GET['estado'] ?? null;
                $tipo   = $_GET['tipo']   ?? null;
                $pagina = max(1,(int)($_GET['pagina'] ?? 1));
                $limite = (int)($_GET['limite'] ?? 20);
                $offset = ($pagina-1)*$limite;

                $where  = ['1=1']; $params = []; $types = '';
                if ($buscar) {
                    $like = "%$buscar%";
                    $where[] = '(d.referencia LIKE ? OR d.motivo LIKE ? OR d.cliente_proveedor LIKE ? OR p.nombre LIKE ?)';
                    $params[] = $like; $params[] = $like; $params[] = $like; $params[] = $like;
                    $types   .= 'ssss';
                }
                if ($estado) { $where[] = 'd.estado = ?';  $params[] = $estado; $types .= 's'; }
                if ($tipo)   { $where[] = 'd.tipo = ?';    $params[] = $tipo;   $types .= 's'; }

                $cond = implode(' AND ', $where);

                $stmtC = $conn->prepare("SELECT COUNT(*) AS total FROM devoluciones d JOIN productos p ON p.id=d.producto_id WHERE $cond");
                if ($types) $stmtC->bind_param($types, ...$params);
                $stmtC->execute();
                $total = $stmtC->get_result()->fetch_assoc()['total'];

                $sql = "SELECT d.id, d.referencia, d.tipo, d.cantidad, d.estado,
                               d.cliente_proveedor, d.motivo, d.notas, d.fecha_creacion,
                               p.nombre AS producto_nombre, p.unidad_medida,
                               u.nombre AS usuario_nombre
                        FROM devoluciones d
                        JOIN productos  p ON p.id = d.producto_id
                        LEFT JOIN usuarios u ON u.id = d.usuario_id
                        WHERE $cond
                        ORDER BY d.fecha_creacion DESC
                        LIMIT ? OFFSET ?";
                $params[] = $limite; $params[] = $offset;
                $types   .= 'ii';

                $stmt = $conn->prepare($sql);
                $stmt->bind_param($types, ...$params);
                $stmt->execute();
                $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
                jsonOk(['devoluciones' => $rows, 'total' => (int)$total]);

            case 'detalle':
                $id = (int)($_GET['id'] ?? 0);
                if (!$id) jsonErr('ID requerido');
                $row = $conn->query("SELECT d.*, p.nombre AS producto_nombre, p.unidad_medida, u.nombre AS usuario_nombre
                                     FROM devoluciones d
                                     JOIN productos p ON p.id=d.producto_id
                                     LEFT JOIN usuarios u ON u.id=d.usuario_id
                                     WHERE d.id=$id")->fetch_assoc();
                if (!$row) jsonErr('No encontrado', 404);
                jsonOk($row);

            case 'productos':
                $res = $conn->query("SELECT id, nombre, stock, unidad_medida FROM productos ORDER BY nombre");
                jsonOk($res->fetch_all(MYSQLI_ASSOC));

            default: jsonErr('Acción no válida');
        }

    // ── POST — Crear ──────────────────────────────────────────────
    case 'POST':
        $d = bodyJson();
        $ref    = trim($d['referencia']        ?? '');
        $tipo   = trim($d['tipo']              ?? 'De Cliente');
        $prodId = (int)($d['producto_id']      ?? 0);
        $cant   = (float)($d['cantidad']       ?? 0);
        $estado = trim($d['estado']            ?? 'Pendiente');
        $cp     = trim($d['cliente_proveedor'] ?? '');
        $motivo = trim($d['motivo']            ?? '');
        $notas  = trim($d['notas']             ?? '');
        $uid    = $_SESSION['usuario_id']      ?? null;

        if (!$ref)    jsonErr('Referencia requerida');
        if (!$prodId) jsonErr('Producto requerido');
        if ($cant<=0) jsonErr('Cantidad inválida');
        if (!$motivo) jsonErr('Motivo requerido');

        $uId = $uid ? $uid : 'NULL';
        $conn->query("INSERT INTO devoluciones
            (referencia,tipo,producto_id,cantidad,estado,cliente_proveedor,motivo,notas,usuario_id)
            VALUES('".esc($conn,$ref)."','".esc($conn,$tipo)."',$prodId,$cant,
                   '".esc($conn,$estado)."','".esc($conn,$cp)."','".esc($conn,$motivo)."',
                   '".esc($conn,$notas)."',$uId)");
        jsonOk(['id' => $conn->insert_id, 'mensaje' => 'Devolución registrada correctamente']);

    // ── PUT — Cambiar estado ──────────────────────────────────────
    case 'PUT':
        $id     = (int)($_GET['id'] ?? 0);
        $d      = bodyJson();
        $estado = trim($d['estado'] ?? '');
        if (!$id || !$estado) jsonErr('ID y estado requeridos');

        $valid = ['Pendiente','Aprobada','Rechazada','Procesada'];
        if (!in_array($estado, $valid)) jsonErr('Estado no válido');

        $conn->query("UPDATE devoluciones SET estado='".esc($conn,$estado)."' WHERE id=$id");
        jsonOk(['mensaje' => "Estado actualizado a $estado"]);

    // ── DELETE — Eliminar ─────────────────────────────────────────
    case 'DELETE':
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) jsonErr('ID requerido');
        $row = $conn->query("SELECT estado FROM devoluciones WHERE id=$id")->fetch_assoc();
        if (!$row) jsonErr('No encontrado', 404);
        $conn->query("DELETE FROM devoluciones WHERE id=$id");
        jsonOk(['mensaje' => 'Devolución eliminada']);

    default: jsonErr('Método no permitido', 405);
}