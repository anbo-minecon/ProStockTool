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
      // Siempre devolver color junto al conteo
      $sql = "SELECT par.id, par.codigo, par.nombre, par.descripcion, par.color,
                      COUNT(prod.id) AS productos_count
              FROM parametros par
              LEFT JOIN productos prod ON prod.parametro_id = par.id
              GROUP BY par.id, par.codigo, par.nombre, par.descripcion, par.color
              ORDER BY par.id";
      $res = $conn->query($sql);
      $rows = [];
      if ($res && $res->num_rows > 0) { while ($r = $res->fetch_assoc()) { $rows[] = $r; } }
      echo json_encode(['success' => true, 'data' => $rows], JSON_UNESCAPED_UNICODE);
      break;

    case 'POST':
      $input = file_get_contents('php://input');
      $data = json_decode($input, true);
      if (!$data) { echo json_encode(['success'=>false,'error'=>'Datos inválidos'], JSON_UNESCAPED_UNICODE); break; }
      $codigo = isset($data['codigo']) ? trim($data['codigo']) : '';
      $nombre = isset($data['nombre']) ? trim($data['nombre']) : '';
      $descripcion = isset($data['descripcion']) ? trim($data['descripcion']) : '';
      $color = isset($data['color']) ? trim($data['color']) : '#4a90e2';
      if ($nombre === '') { echo json_encode(['success'=>false,'error'=>'El nombre es obligatorio'], JSON_UNESCAPED_UNICODE); break; }
      if (strlen($nombre) > 50) { echo json_encode(['success'=>false,'error'=>'Longitud de nombre inválida'], JSON_UNESCAPED_UNICODE); break; }
      // Validar color HEX #RRGGBB
      if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $color)) { echo json_encode(['success'=>false,'error'=>'Color inválido. Use formato #RRGGBB'], JSON_UNESCAPED_UNICODE); break; }
      // Generar código si viene vacío
      if ($codigo === '') {
        $resNext = $conn->query("SELECT LPAD(COALESCE(MAX(CAST(codigo AS UNSIGNED)),0)+1,3,'0') AS next_codigo FROM parametros");
        $rowNext = $resNext ? $resNext->fetch_assoc() : null;
        $codigo = $rowNext && isset($rowNext['next_codigo']) ? $rowNext['next_codigo'] : '001';
      }
      $codigo = $conn->real_escape_string($codigo);
      $nombre = $conn->real_escape_string($nombre);
      $descripcion = $conn->real_escape_string($descripcion);
      $color = $conn->real_escape_string($color);
      // Unicidad
      $chk = $conn->query("SELECT 1 FROM parametros WHERE codigo='$codigo' OR nombre='$nombre' LIMIT 1");
      if ($chk && $chk->num_rows > 0) { echo json_encode(['success'=>false,'error'=>'Código o nombre ya existe'], JSON_UNESCAPED_UNICODE); break; }
      $sql = "INSERT INTO parametros (codigo, nombre, descripcion, color, fecha_creacion) VALUES ('$codigo', '$nombre', '$descripcion', '$color', NOW())";
      if ($conn->query($sql)) {
        echo json_encode(['success'=>true,'id'=>$conn->insert_id,'message'=>'Parámetro creado'], JSON_UNESCAPED_UNICODE);
      } else {
        echo json_encode(['success'=>false,'error'=>'Error al crear: '.$conn->error], JSON_UNESCAPED_UNICODE);
      }
      break;

    case 'PUT':
      $input = file_get_contents('php://input');
      $data = json_decode($input, true);
      if (!$data) { echo json_encode(['success'=>false,'error'=>'Datos inválidos'], JSON_UNESCAPED_UNICODE); break; }
      $id = isset($data['id']) ? intval($data['id']) : 0;
      $nombre = isset($data['nombre']) ? trim($data['nombre']) : '';
      $descripcion = isset($data['descripcion']) ? trim($data['descripcion']) : '';
      $color = isset($data['color']) ? trim($data['color']) : '#4a90e2';
      if ($id<=0 || $nombre === '') { echo json_encode(['success'=>false,'error'=>'ID y nombre son obligatorios'], JSON_UNESCAPED_UNICODE); break; }
      if (strlen($nombre) > 50) { echo json_encode(['success'=>false,'error'=>'Longitud de nombre inválida'], JSON_UNESCAPED_UNICODE); break; }
      if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $color)) { echo json_encode(['success'=>false,'error'=>'Color inválido. Use formato #RRGGBB'], JSON_UNESCAPED_UNICODE); break; }
      $nombre = $conn->real_escape_string($nombre);
      $descripcion = $conn->real_escape_string($descripcion);
      $color = $conn->real_escape_string($color);
      // Existe
      $ex = $conn->query("SELECT id FROM parametros WHERE id=$id");
      if (!$ex || $ex->num_rows===0) { echo json_encode(['success'=>false,'error'=>'No encontrado'], JSON_UNESCAPED_UNICODE); break; }
      // Unicidad
      $chk = $conn->query("SELECT 1 FROM parametros WHERE nombre='$nombre' AND id!=$id LIMIT 1");
      if ($chk && $chk->num_rows > 0) { echo json_encode(['success'=>false,'error'=>'Código o nombre ya existe'], JSON_UNESCAPED_UNICODE); break; }
      $sql = "UPDATE parametros SET nombre='$nombre', descripcion='$descripcion', color='$color', fecha_actualizacion=NOW() WHERE id=$id";
      if ($conn->query($sql)) {
        echo json_encode(['success'=>true,'message'=>'Parámetro actualizado'], JSON_UNESCAPED_UNICODE);
      } else {
        echo json_encode(['success'=>false,'error'=>'Error al actualizar: '.$conn->error], JSON_UNESCAPED_UNICODE);
      }
      break;

    case 'DELETE':
      $input = file_get_contents('php://input');
      $data = json_decode($input, true);
      if (!$data) { echo json_encode(['success'=>false,'error'=>'Datos inválidos'], JSON_UNESCAPED_UNICODE); break; }
      $id = isset($data['id']) ? intval($data['id']) : 0;
      if ($id<=0) { echo json_encode(['success'=>false,'error'=>'ID inválido'], JSON_UNESCAPED_UNICODE); break; }
      // Bloquear si tiene productos
      $cnt = 0;
      $rc = $conn->query("SELECT COUNT(*) AS c FROM productos WHERE parametro_id=$id");
      if ($rc) { $cnt = intval($rc->fetch_assoc()['c']); }
      if ($cnt>0) { echo json_encode(['success'=>false,'error'=>'No se puede eliminar: tiene productos asociados'], JSON_UNESCAPED_UNICODE); break; }
      $sql = "DELETE FROM parametros WHERE id=$id";
      if ($conn->query($sql)) {
        echo json_encode(['success'=>true,'message'=>'Parámetro eliminado'], JSON_UNESCAPED_UNICODE);
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
