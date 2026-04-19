<?php
// filepath: c:\xampp\htdocs\Pro-Stock-Tool\database\proveedores.php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require 'conexion.php';

// ── Control de acceso por roles ──────────────────────────────
require_once 'verificar_rol.php';
verificarAutenticacion();
bloquearTendero();   // Tendero no accede a proveedores
bloquearEscritura(); // Jefe de bodega solo puede leer
// ─────────────────────────────────────────────────────────────
$method = $_SERVER['REQUEST_METHOD'];

try {
  switch ($method) {
    case 'GET':
      // Verificar si se solicitan productos de un proveedor específico
      if (isset($_GET['proveedor_id']) && !empty($_GET['proveedor_id'])) {
        $proveedor_id = intval($_GET['proveedor_id']);
        $sql = "SELECT p.id, p.nombre, p.proveedor_id, p.unidad_medida, p.nit, p.bodega_id,
                       p.categoria_id, p.subcategoria_id, p.stock, p.stock_min, p.stock_max,
                       p.precio, p.fecha_vencimiento, p.estado_id, p.fecha_creacion,
                       b.nombre AS bodega_nombre,
                       c.nombre AS categoria_nombre,
                       s.nombre AS subcategoria_nombre,
                       par.nombre AS estado_nombre
                FROM productos p
                LEFT JOIN bodegas b ON b.id = p.bodega_id
                LEFT JOIN categorias c ON c.id = p.categoria_id
                LEFT JOIN subcategorias s ON s.id = p.subcategoria_id
                LEFT JOIN parametros par ON par.id = p.estado_id
                WHERE p.proveedor_id = $proveedor_id
                ORDER BY p.nombre ASC";
        $res = $conn->query($sql);
        $rows = [];
        if ($res && $res->num_rows > 0) {
          while ($r = $res->fetch_assoc()) { $rows[] = $r; }
        }
        echo json_encode(['success'=>true, 'data'=>$rows], JSON_UNESCAPED_UNICODE);
      } else {
        // Obtener todos los proveedores
        $sql = "SELECT pr.id, pr.nif, pr.nombre, pr.contacto, pr.email, pr.telefono, 
                       pr.direccion, pr.ciudad, pr.web, pr.parametro_id,
                       par.nombre AS estado_nombre, par.color AS estado_color,
                       pr.fecha_creacion
                FROM proveedores pr
                LEFT JOIN parametros par ON par.id = pr.parametro_id
                ORDER BY pr.fecha_creacion DESC";
        $res = $conn->query($sql);
        $rows = [];
        if ($res && $res->num_rows > 0) { 
          while ($r = $res->fetch_assoc()) { $rows[] = $r; } 
        }
        echo json_encode(['success'=>true, 'data'=>$rows], JSON_UNESCAPED_UNICODE);
      }
      break;

    case 'POST':
      $data = json_decode(file_get_contents('php://input'), true);
      if (!$data) { 
        echo json_encode(['success'=>false,'error'=>'Datos inválidos'], JSON_UNESCAPED_UNICODE); 
        break; 
      }
      
      $nif = $conn->real_escape_string(trim($data['nif'] ?? ''));
      $nombre = $conn->real_escape_string(trim($data['nombre'] ?? ''));
      $contacto = $conn->real_escape_string(trim($data['contacto'] ?? ''));
      $email = $conn->real_escape_string(trim($data['email'] ?? ''));
      $telefono = $conn->real_escape_string(trim($data['telefono'] ?? ''));
      $direccion = $conn->real_escape_string(trim($data['direccion'] ?? ''));
      $ciudad = $conn->real_escape_string(trim($data['ciudad'] ?? ''));
      $web = $conn->real_escape_string(trim($data['web'] ?? ''));
      $parametro_id = isset($data['parametro_id']) && $data['parametro_id'] ? intval($data['parametro_id']) : null;

      if ($nombre === '') { 
        echo json_encode(['success'=>false,'error'=>'El nombre es obligatorio'], JSON_UNESCAPED_UNICODE); 
        break; 
      }

      if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success'=>false,'error'=>'Email inválido'], JSON_UNESCAPED_UNICODE); 
        break; 
      }

      $parametroSql = is_null($parametro_id) ? 'NULL' : $parametro_id;
      $sql = "INSERT INTO proveedores (nif, nombre, contacto, email, telefono, direccion, ciudad, web, parametro_id, fecha_creacion) 
              VALUES ('$nif', '$nombre', '$contacto', '$email', '$telefono', '$direccion', '$ciudad', '$web', $parametroSql, NOW())";
      
      if ($conn->query($sql)) {
        echo json_encode(['success'=>true, 'id'=>$conn->insert_id, 'message'=>'Proveedor creado correctamente'], JSON_UNESCAPED_UNICODE);
      } else {
        echo json_encode(['success'=>false,'error'=>'Error al crear: '.$conn->error], JSON_UNESCAPED_UNICODE);
      }
      break;

    case 'PUT':
      $data = json_decode(file_get_contents('php://input'), true);
      if (!$data) { 
        echo json_encode(['success'=>false,'error'=>'Datos inválidos'], JSON_UNESCAPED_UNICODE); 
        break; 
      }
      
      $id = intval($data['id'] ?? 0);
      if ($id <= 0) { 
        echo json_encode(['success'=>false,'error'=>'ID inválido'], JSON_UNESCAPED_UNICODE); 
        break; 
      }

      $nif = $conn->real_escape_string(trim($data['nif'] ?? ''));
      $nombre = $conn->real_escape_string(trim($data['nombre'] ?? ''));
      $contacto = $conn->real_escape_string(trim($data['contacto'] ?? ''));
      $email = $conn->real_escape_string(trim($data['email'] ?? ''));
      $telefono = $conn->real_escape_string(trim($data['telefono'] ?? ''));
      $direccion = $conn->real_escape_string(trim($data['direccion'] ?? ''));
      $ciudad = $conn->real_escape_string(trim($data['ciudad'] ?? ''));
      $web = $conn->real_escape_string(trim($data['web'] ?? ''));
      $parametro_id = isset($data['parametro_id']) && $data['parametro_id'] ? intval($data['parametro_id']) : null;

      if ($nombre === '') { 
        echo json_encode(['success'=>false,'error'=>'El nombre es obligatorio'], JSON_UNESCAPED_UNICODE); 
        break; 
      }

      if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success'=>false,'error'=>'Email inválido'], JSON_UNESCAPED_UNICODE); 
        break; 
      }

      $parametroSql = is_null($parametro_id) ? 'NULL' : $parametro_id;
      $sql = "UPDATE proveedores 
              SET nif='$nif', nombre='$nombre', contacto='$contacto', email='$email', 
                  telefono='$telefono', direccion='$direccion', ciudad='$ciudad', web='$web', 
                  parametro_id=$parametroSql, fecha_actualizacion=NOW() 
              WHERE id=$id";
      
      if ($conn->query($sql)) {
        echo json_encode(['success'=>true, 'message'=>'Proveedor actualizado correctamente'], JSON_UNESCAPED_UNICODE);
      } else {
        echo json_encode(['success'=>false,'error'=>'Error al actualizar: '.$conn->error], JSON_UNESCAPED_UNICODE);
      }
      break;

    case 'DELETE':
      $data = json_decode(file_get_contents('php://input'), true);
      if (!$data) { 
        echo json_encode(['success'=>false,'error'=>'Datos inválidos'], JSON_UNESCAPED_UNICODE); 
        break; 
      }
      
      $id = intval($data['id'] ?? 0);
      if ($id <= 0) { 
        echo json_encode(['success'=>false,'error'=>'ID inválido'], JSON_UNESCAPED_UNICODE); 
        break; 
      }
      
      $sql = "DELETE FROM proveedores WHERE id=$id";
      if ($conn->query($sql)) {
        echo json_encode(['success'=>true, 'message'=>'Proveedor eliminado correctamente'], JSON_UNESCAPED_UNICODE);
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
?>