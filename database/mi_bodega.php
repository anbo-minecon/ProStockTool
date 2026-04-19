<?php
// =================================================================
//  mi_bodega.php  —  API Backend · Módulo Mi Bodega
//  Ubicación: database/mi_bodega.php
//  Base de datos: prostocktool (MariaDB 10.4)
//
//  Tablas usadas:
//    usuarios            → id, nombre, email, bodega_asignada_id, rol
//    bodegas             → id, nombre, descripcion
//    bodegas_compartidas → id, bodega_id, propietario_id, invitado_id,
//                          nivel_permiso, estado, fecha_invitacion, fecha_respuesta
//    productos           → id, nombre, nit (como SKU), bodega_id,
//                          stock, stock_min, precio, categoria_id
//    categorias          → id, nombre
//    movimientos         → id, tipo, tipo_detalle, usuario_id, fecha_creacion
//    movimientos_detalle → movimiento_id, producto_id, cantidad
//    transferencias      → id, producto_id, bodega_origen_id, bodega_destino_id,
//                          cantidad, estado, usuario_id, fecha_creacion
// =================================================================

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

require_once __DIR__ . '/conexion.php';   // → $conn (mysqli)

// ── Sesión ───────────────────────────────────────────────────────
if (session_status() === PHP_SESSION_NONE) session_start();

if (empty($_SESSION['usuario_id'])) {
    http_response_code(401);
    exit(json_encode(['success' => false, 'error' => 'Sesión no iniciada']));
}

$uid    = (int) $_SESSION['usuario_id'];
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';

// ── Router ───────────────────────────────────────────────────────
try {
    switch ($method) {
        case 'GET':
            switch ($action) {
                case 'mi_bodega':             responder(getMiBodega($conn, $uid));            break;
                case 'detalle_bodega':        responder(getDetalleBodega($conn, $uid));        break;
                case 'bodegas_compartidas':   responder(getBodegasCompartidas($conn, $uid));   break;
                case 'invitaciones_enviadas': responder(getInvitacionesEnviadas($conn, $uid)); break;
                case 'invitaciones_recibidas': responder(getInvitacionesRecibidas($conn, $uid)); break;
                case 'jefes_disponibles':     responder(getJefesDisponibles($conn, $uid));     break;
                default:                      errorRespuesta('Acción GET no reconocida', 400);
            }
            break;

        case 'POST':
            $body = json_decode(file_get_contents('php://input'), true) ?? [];
            switch ($action) {
                case 'invitar': responder(postInvitar($conn, $uid, $body)); break;
                default:        errorRespuesta('Acción POST no reconocida', 400);
            }
            break;

        case 'PUT':
            $body = json_decode(file_get_contents('php://input'), true) ?? [];
            switch ($action) {
                case 'actualizar_permiso': responder(putActualizarPermiso($conn, $uid, $body)); break;
                case 'aceptar_invitacion': responder(putAceptarInvitacion($conn, $uid, $body)); break;
                case 'rechazar_invitacion': responder(putRechazarInvitacion($conn, $uid, $body)); break;
                default:                   errorRespuesta('Acción PUT no reconocida', 400);
            }
            break;

        case 'DELETE':
            responder(deleteRevocar($conn, $uid));
            break;

        default:
            errorRespuesta('Método HTTP no permitido', 405);
    }
} catch (Throwable $e) {
    errorRespuesta('Error interno: ' . $e->getMessage(), 500);
}


// =================================================================
//  GET  mi_bodega
//  La bodega asignada viene de usuarios.bodega_asignada_id
// =================================================================
function getMiBodega(mysqli $conn, int $uid): array
{
    $stmt = $conn->prepare(
        "SELECT b.id, b.nombre, b.descripcion
         FROM usuarios u
         JOIN bodegas b ON b.id = u.bodega_asignada_id
         WHERE u.id = ?
         LIMIT 1"
    );
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$row) {
        return ['success' => false, 'error' => 'No tienes una bodega asignada'];
    }
    return ['success' => true, 'data' => $row];
}


// =================================================================
//  GET  detalle_bodega
//  Productos de una bodega. El campo SKU en la tabla es "nit".
//  Acceso: propietario (bodega_asignada_id) o invitado aceptado.
// =================================================================
function getDetalleBodega(mysqli $conn, int $uid): array
{
    $bodegaId = isset($_GET['bodega_id']) ? (int) $_GET['bodega_id'] : 0;
    if (!$bodegaId) return ['success' => false, 'error' => 'bodega_id requerido'];

    if (!tieneAccesoBodega($conn, $uid, $bodegaId)) {
        return ['success' => false, 'error' => 'Sin permiso para ver esta bodega'];
    }

    $stmt = $conn->prepare(
        "SELECT
            p.id,
            p.nombre,
            p.nit        AS sku,
            p.precio,
            p.stock_min,
            p.stock,
            c.nombre     AS categoria
         FROM productos p
         LEFT JOIN categorias c ON c.id = p.categoria_id
         WHERE p.bodega_id = ?
         ORDER BY p.nombre ASC"
    );
    $stmt->bind_param('i', $bodegaId);
    $stmt->execute();
    $productos = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    return ['success' => true, 'data' => ['productos' => $productos]];
}


// =================================================================
//  GET  bodegas_compartidas
//  Bodegas que otros compartieron con el usuario (invitado_id = $uid)
//  El propietario se identifica por usuarios.bodega_asignada_id
// =================================================================
function getBodegasCompartidas(mysqli $conn, int $uid): array
{
    $stmt = $conn->prepare(
        "SELECT
            bc.id,
            bc.bodega_id,
            bc.nivel_permiso,
            bc.fecha_respuesta,
            b.nombre                     AS bodega_nombre,
            u.nombre                     AS propietario_nombre,
            u.email                      AS propietario_email,
            COUNT(DISTINCT p.id)         AS total_productos,
            COALESCE(SUM(p.stock), 0)    AS total_stock
         FROM bodegas_compartidas bc
         JOIN bodegas  b ON b.id = bc.bodega_id
         JOIN usuarios u ON u.bodega_asignada_id = bc.bodega_id
         LEFT JOIN productos p ON p.bodega_id = bc.bodega_id
         WHERE bc.invitado_id = ?
           AND bc.estado = 'aceptada'
         GROUP BY bc.id, bc.bodega_id, bc.nivel_permiso, bc.fecha_respuesta,
                  b.nombre, u.nombre, u.email
         ORDER BY bc.fecha_respuesta DESC"
    );
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    return ['success' => true, 'data' => $rows];
}


// =================================================================
//  GET  invitaciones_enviadas
//  Invitaciones enviadas por el usuario (propietario_id = $uid)
// =================================================================
function getInvitacionesEnviadas(mysqli $conn, int $uid): array
{
    $stmt = $conn->prepare(
        "SELECT
            bc.id,
            bc.nivel_permiso,
            bc.estado,
            bc.fecha_invitacion,
            bc.fecha_respuesta,
            b.nombre  AS bodega_nombre,
            u.nombre  AS invitado_nombre,
            u.email   AS invitado_email
         FROM bodegas_compartidas bc
         JOIN bodegas  b ON b.id = bc.bodega_id
         JOIN usuarios u ON u.id = bc.invitado_id
         WHERE bc.propietario_id = ?
         ORDER BY bc.fecha_invitacion DESC"
    );
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    return ['success' => true, 'data' => $rows];
}


// =================================================================
//  GET  jefes_disponibles
//  Usuarios activos con bodega asignada, excluyendo al propietario
//  y a quienes ya tienen invitación pendiente o aceptada
// =================================================================
function getJefesDisponibles(mysqli $conn, int $uid): array
{
    $stmt = $conn->prepare(
        "SELECT
            u.id,
            u.nombre,
            u.email,
            b.nombre AS bodega_nombre
         FROM usuarios u
         LEFT JOIN bodegas b ON b.id = u.bodega_asignada_id
         WHERE u.id != ?
           AND u.rol = 'jefe_bodega'
           AND u.estado = 'activo'
           AND u.bodega_asignada_id IS NOT NULL
           AND u.id NOT IN (
               SELECT bc.invitado_id
               FROM bodegas_compartidas bc
               WHERE bc.propietario_id = ?
                 AND bc.estado IN ('pendiente','aceptada')
           )
         ORDER BY u.nombre ASC"
    );
    $stmt->bind_param('ii', $uid, $uid);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    return ['success' => true, 'data' => $rows];
}


// =================================================================
//  POST  invitar
//  Inserta en bodegas_compartidas con propietario_id = $uid
// =================================================================
function postInvitar(mysqli $conn, int $uid, array $body): array
{
    $invitadoId   = isset($body['invitado_id'])   ? (int)    $body['invitado_id']   : 0;
    $nivelPermiso = isset($body['nivel_permiso']) ? trim((string) $body['nivel_permiso']) : '';

    if (!$invitadoId)         return ['success' => false, 'error' => 'invitado_id requerido'];
    if ($invitadoId === $uid) return ['success' => false, 'error' => 'No puedes invitarte a ti mismo'];
    if (!in_array($nivelPermiso, ['lectura','edicion','eliminacion'], true)) {
        return ['success' => false, 'error' => 'Nivel de permiso inválido'];
    }

    $bodegaId = getBodegaDelUsuario($conn, $uid);
    if (!$bodegaId) return ['success' => false, 'error' => 'No tienes bodega asignada'];

    // Evitar duplicados (existe unique key uq_bodega_invitado)
    $chk = $conn->prepare(
        "SELECT id FROM bodegas_compartidas
         WHERE bodega_id = ? AND invitado_id = ? AND estado IN ('pendiente','aceptada')
         LIMIT 1"
    );
    $chk->bind_param('ii', $bodegaId, $invitadoId);
    $chk->execute();
    if ($chk->get_result()->num_rows > 0) {
        $chk->close();
        return ['success' => false, 'error' => 'Ya existe una invitación activa para este usuario'];
    }
    $chk->close();

    $ins = $conn->prepare(
        "INSERT INTO bodegas_compartidas
            (bodega_id, propietario_id, invitado_id, nivel_permiso, estado, fecha_invitacion)
         VALUES (?, ?, ?, ?, 'pendiente', NOW())"
    );
    $ins->bind_param('iiis', $bodegaId, $uid, $invitadoId, $nivelPermiso);
    $ins->execute();

    if ($ins->affected_rows < 1) {
        $ins->close();
        return ['success' => false, 'error' => 'No se pudo crear la invitación'];
    }
    $ins->close();

    return ['success' => true, 'message' => 'Invitación enviada correctamente'];
}


// =================================================================
//  PUT  actualizar_permiso
//  Solo el propietario_id puede cambiar el nivel
// =================================================================
function putActualizarPermiso(mysqli $conn, int $uid, array $body): array
{
    $compartidaId = isset($body['compartida_id']) ? (int)    $body['compartida_id'] : 0;
    $nivel        = isset($body['nivel_permiso']) ? trim((string) $body['nivel_permiso']) : '';

    if (!$compartidaId) return ['success' => false, 'error' => 'compartida_id requerido'];
    if (!in_array($nivel, ['lectura','edicion','eliminacion'], true)) {
        return ['success' => false, 'error' => 'Nivel de permiso inválido'];
    }

    $upd = $conn->prepare(
        "UPDATE bodegas_compartidas
         SET nivel_permiso = ?
         WHERE id = ? AND propietario_id = ?"
    );
    $upd->bind_param('sii', $nivel, $compartidaId, $uid);
    $upd->execute();

    if ($upd->affected_rows < 1) {
        $upd->close();
        return ['success' => false, 'error' => 'Invitación no encontrada o sin permiso'];
    }
    $upd->close();

    return ['success' => true, 'message' => 'Permiso actualizado'];
}


// =================================================================
//  DELETE  ?id=X
//  Revocar acceso o cancelar invitación (solo el propietario)
// =================================================================
function deleteRevocar(mysqli $conn, int $uid): array
{
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
    if (!$id) return ['success' => false, 'error' => 'id requerido'];

    $del = $conn->prepare(
        "DELETE FROM bodegas_compartidas
         WHERE id = ? AND propietario_id = ?"
    );
    $del->bind_param('ii', $id, $uid);
    $del->execute();

    if ($del->affected_rows < 1) {
        $del->close();
        return ['success' => false, 'error' => 'Invitación no encontrada o sin permiso'];
    }
    $del->close();

    return ['success' => true, 'message' => 'Acceso revocado correctamente'];
}


// =================================================================
//  GET  invitaciones_recibidas
//  Invitaciones recibidas por el usuario (invitado_id = $uid)
//  Solo las que están en estado 'pendiente'
// =================================================================
function getInvitacionesRecibidas(mysqli $conn, int $uid): array
{
    $stmt = $conn->prepare(
        "SELECT
            bc.id,
            bc.bodega_id,
            bc.nivel_permiso,
            bc.fecha_invitacion,
            b.nombre                     AS bodega_nombre,
            u.nombre                     AS propietario_nombre,
            u.email                      AS propietario_email,
            COUNT(DISTINCT p.id)         AS total_productos,
            COALESCE(SUM(p.stock), 0)    AS total_stock
         FROM bodegas_compartidas bc
         JOIN bodegas  b ON b.id = bc.bodega_id
         JOIN usuarios u ON u.id = bc.propietario_id
         LEFT JOIN productos p ON p.bodega_id = bc.bodega_id
         WHERE bc.invitado_id = ?
           AND bc.estado = 'pendiente'
         GROUP BY bc.id, bc.bodega_id, bc.nivel_permiso, bc.fecha_invitacion,
                  b.nombre, u.nombre, u.email
         ORDER BY bc.fecha_invitacion DESC"
    );
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    return ['success' => true, 'data' => $rows];
}


// =================================================================
//  PUT  aceptar_invitacion
//  Solo el invitado puede aceptar su propia invitación
// =================================================================
function putAceptarInvitacion(mysqli $conn, int $uid, array $body): array
{
    $compartidaId = isset($body['compartida_id']) ? (int) $body['compartida_id'] : 0;

    if (!$compartidaId) return ['success' => false, 'error' => 'compartida_id requerido'];

    // Verificar que el usuario actual es el invitado
    $chk = $conn->prepare(
        "SELECT id FROM bodegas_compartidas
         WHERE id = ? AND invitado_id = ? AND estado = 'pendiente'
         LIMIT 1"
    );
    $chk->bind_param('ii', $compartidaId, $uid);
    $chk->execute();
    if ($chk->get_result()->num_rows === 0) {
        $chk->close();
        return ['success' => false, 'error' => 'Invitación no encontrada o ya respondida'];
    }
    $chk->close();

    $upd = $conn->prepare(
        "UPDATE bodegas_compartidas
         SET estado = 'aceptada', fecha_respuesta = NOW()
         WHERE id = ? AND invitado_id = ?"
    );
    $upd->bind_param('ii', $compartidaId, $uid);
    $upd->execute();

    if ($upd->affected_rows < 1) {
        $upd->close();
        return ['success' => false, 'error' => 'No se pudo actualizar la invitación'];
    }
    $upd->close();

    return ['success' => true, 'message' => 'Invitación aceptada'];
}


// =================================================================
//  PUT  rechazar_invitacion
//  Solo el invitado puede rechazar su propia invitación
// =================================================================
function putRechazarInvitacion(mysqli $conn, int $uid, array $body): array
{
    $compartidaId = isset($body['compartida_id']) ? (int) $body['compartida_id'] : 0;

    if (!$compartidaId) return ['success' => false, 'error' => 'compartida_id requerido'];

    // Verificar que el usuario actual es el invitado
    $chk = $conn->prepare(
        "SELECT id FROM bodegas_compartidas
         WHERE id = ? AND invitado_id = ? AND estado = 'pendiente'
         LIMIT 1"
    );
    $chk->bind_param('ii', $compartidaId, $uid);
    $chk->execute();
    if ($chk->get_result()->num_rows === 0) {
        $chk->close();
        return ['success' => false, 'error' => 'Invitación no encontrada o ya respondida'];
    }
    $chk->close();

    $upd = $conn->prepare(
        "UPDATE bodegas_compartidas
         SET estado = 'rechazada', fecha_respuesta = NOW()
         WHERE id = ? AND invitado_id = ?"
    );
    $upd->bind_param('ii', $compartidaId, $uid);
    $upd->execute();

    if ($upd->affected_rows < 1) {
        $upd->close();
        return ['success' => false, 'error' => 'No se pudo actualizar la invitación'];
    }
    $upd->close();

    return ['success' => true, 'message' => 'Invitación rechazada'];
}


// =================================================================
//  HELPERS
// =================================================================

function getBodegaDelUsuario(mysqli $conn, int $uid): int
{
    $s = $conn->prepare(
        "SELECT bodega_asignada_id FROM usuarios WHERE id = ? LIMIT 1"
    );
    $s->bind_param('i', $uid);
    $s->execute();
    $row = $s->get_result()->fetch_assoc();
    $s->close();
    return (int) ($row['bodega_asignada_id'] ?? 0);
}

function tieneAccesoBodega(mysqli $conn, int $uid, int $bodegaId): bool
{
    // Es propietario (su bodega_asignada_id coincide)
    $own = $conn->prepare(
        "SELECT id FROM usuarios
         WHERE id = ? AND bodega_asignada_id = ? LIMIT 1"
    );
    $own->bind_param('ii', $uid, $bodegaId);
    $own->execute();
    if ($own->get_result()->num_rows > 0) { $own->close(); return true; }
    $own->close();

    // Es invitado con invitación aceptada
    $inv = $conn->prepare(
        "SELECT id FROM bodegas_compartidas
         WHERE bodega_id = ? AND invitado_id = ? AND estado = 'aceptada' LIMIT 1"
    );
    $inv->bind_param('ii', $bodegaId, $uid);
    $inv->execute();
    $ok = $inv->get_result()->num_rows > 0;
    $inv->close();

    return $ok;
}

function responder(array $data): void
{
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function errorRespuesta(string $msg, int $code = 400): void
{
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}