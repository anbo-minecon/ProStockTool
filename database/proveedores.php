<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require 'conexion.php';
$method = $_SERVER['REQUEST_METHOD'];

try {
  switch ($method) {
    case 'GET':
      $sql = "SELECT pr.id, pr.nif, pr.nombre, pr.contacto, pr.email, pr.telefono, pr.direccion, pr.ciudad, pr.web, pr.terminos,
                     pr.parametro_id,
                     par.nombre AS estado_nombre, par.color AS estado_color,
                     0 AS productos_count
              FROM proveedores pr
              LEFT JOIN parametros par ON par.id = pr.parametro_id
              ORDER BY pr.id DESC";
      $res = $conn->query($sql);
      $rows = [];
      if ($res && $res->num_rows > 0) { while ($r = $res->fetch_assoc()) { $rows[] = $r; } }
      echo json_encode(['success'=>true, 'data'=>$rows], JSON_UNESCAPED_UNICODE);
      break;

    case 'POST':
      $data = json_decode(file_get_contents('php://input'), true);
      if (!$data) { echo json_encode(['success'=>false,'error'=>'Datos inválidos'], JSON_UNESCAPED_UNICODE); break; }
      $nif = $conn->real_escape_string(trim($data['nif'] ?? ''));
      $nombre = $conn->real_escape_string(trim($data['nombre'] ?? ''));
      $contacto = $conn->real_escape_string(trim($data['contacto'] ?? ''));
      $email = $conn->real_escape_string(trim($data['email'] ?? ''));
      $telefono = $conn->real_escape_string(trim($data['telefono'] ?? ''));
      $direccion = $conn->real_escape_string(trim($data['direccion'] ?? ''));
      $ciudad = $conn->real_escape_string(trim($data['ciudad'] ?? ''));
      $web = $conn->real_escape_string(trim($data['web'] ?? ''));
      $terminos = isset($data['terminos']) ? intval($data['terminos']) : null;
      $parametro_id = isset($data['parametro_id']) ? intval($data['parametro_id']) : null;

      if ($nombre === '') { echo json_encode(['success'=>false,'error'=>'El nombre es obligatorio'], JSON_UNESCAPED_UNICODE); break; }

      $terminosSql = is_null($terminos) ? 'NULL' : $terminos;
      $parametroSql = is_null($parametro_id) ? 'NULL' : $parametro_id;
      $sql = "INSERT INTO proveedores (nif, nombre, contacto, email, telefono, direccion, ciudad, web, terminos, parametro_id, fecha_creacion) VALUES
              ('$nif', '$nombre', '$contacto', '$email', '$telefono', '$direccion', '$ciudad', '$web', $terminosSql, $parametroSql, NOW())";
      if ($conn->query($sql)) {
        echo json_encode(['success'=>true, 'id'=>$conn->insert_id, 'message'=>'Proveedor creado'], JSON_UNESCAPED_UNICODE);
      } else {
        echo json_encode(['success'=>false,'error'=>'Error al crear: '.$conn->error], JSON_UNESCAPED_UNICODE);
      }
      break;

    case 'PUT':
      $data = json_decode(file_get_contents('php://input'), true);
      if (!$data) { echo json_encode(['success'=>false,'error'=>'Datos inválidos'], JSON_UNESCAPED_UNICODE); break; }
      $id = intval($data['id'] ?? 0);
      if ($id<=0) { echo json_encode(['success'=>false,'error'=>'ID inválido'], JSON_UNESCAPED_UNICODE); break; }

      $nif = $conn->real_escape_string(trim($data['nif'] ?? ''));
      $nombre = $conn->real_escape_string(trim($data['nombre'] ?? ''));
      $contacto = $conn->real_escape_string(trim($data['contacto'] ?? ''));
      $email = $conn->real_escape_string(trim($data['email'] ?? ''));
      $telefono = $conn->real_escape_string(trim($data['telefono'] ?? ''));
      $direccion = $conn->real_escape_string(trim($data['direccion'] ?? ''));
      $ciudad = $conn->real_escape_string(trim($data['ciudad'] ?? ''));
      $web = $conn->real_escape_string(trim($data['web'] ?? ''));
      $terminos = isset($data['terminos']) ? intval($data['terminos']) : null;
      $parametro_id = isset($data['parametro_id']) ? intval($data['parametro_id']) : null;

      if ($nombre === '') { echo json_encode(['success'=>false,'error'=>'El nombre es obligatorio'], JSON_UNESCAPED_UNICODE); break; }

      $terminosSql = is_null($terminos) ? 'NULL' : $terminos;
      $parametroSql = is_null($parametro_id) ? 'NULL' : $parametro_id;
      $sql = "UPDATE proveedores SET nif='$nif', nombre='$nombre', contacto='$contacto', email='$email', telefono='$telefono', direccion='$direccion', ciudad='$ciudad', web='$web', terminos=$terminosSql, parametro_id=$parametroSql, fecha_actualizacion=NOW() WHERE id=$id";
      if ($conn->query($sql)) {
        echo json_encode(['success'=>true, 'message'=>'Proveedor actualizado'], JSON_UNESCAPED_UNICODE);
      } else {
        echo json_encode(['success'=>false,'error'=>'Error al actualizar: '.$conn->error], JSON_UNESCAPED_UNICODE);
      }
      break;

    case 'DELETE':
      $data = json_decode(file_get_contents('php://input'), true);
      if (!$data) { echo json_encode(['success'=>false,'error'=>'Datos inválidos'], JSON_UNESCAPED_UNICODE); break; }
      $id = intval($data['id'] ?? 0);
      if ($id<=0) { echo json_encode(['success'=>false,'error'=>'ID inválido'], JSON_UNESCAPED_UNICODE); break; }
      $sql = "DELETE FROM proveedores WHERE id=$id";
      if ($conn->query($sql)) {
        echo json_encode(['success'=>true, 'message'=>'Proveedor eliminado'], JSON_UNESCAPED_UNICODE);
      } else {
        echo json_encode(['success'=>false,'error'=>'Error al eliminar: '.$conn->error], JSON_UNESCAPED_UNICODE);
      }
      break;

    default:
      echo json_encode(['success'=>false,'error'=>'Método no permitido'], JSON_UNESCAPED_UNICODE);
  }
} catch (Exception $e) {
  echo json_encode(['success'=>false,'error'=>'Error del servidor: '.$e->getMessage()], JSON_UNESCAPED_UNICODE);
}

$conn->close();
