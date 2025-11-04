<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require 'conexion.php';

try {
  if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    exit;
  }

  $input = file_get_contents('php://input');
  $data = json_decode($input, true);
  if (!$data) { echo json_encode(['success'=>false,'error'=>'Datos inválidos']); exit; }

  $email = isset($data['email']) ? trim($data['email']) : '';
  $nombre = isset($data['nombre']) ? trim($data['nombre']) : '';
  $identidad = isset($data['identidad']) ? trim($data['identidad']) : '';
  $contrasena = isset($data['contrasena']) ? (string)$data['contrasena'] : '';

  if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success'=>false,'error'=>'Email inválido']); exit;
  }
  if (strlen($nombre) < 2 || strlen($nombre) > 100) {
    echo json_encode(['success'=>false,'error'=>'Nombre inválido']); exit;
  }
  if (!preg_match('/^[0-9]{6,20}$/', $identidad)) {
    echo json_encode(['success'=>false,'error'=>'Identidad inválida']); exit;
  }
  if (strlen($contrasena) < 6) {
    echo json_encode(['success'=>false,'error'=>'Contraseña muy corta']); exit;
  }

  $emailEsc = $conn->real_escape_string($email);
  $identidadEsc = $conn->real_escape_string($identidad);

  $check = $conn->query("SELECT id FROM usuarios WHERE email = '$emailEsc' OR identidad = '$identidadEsc' LIMIT 1");
  if ($check && $check->num_rows > 0) {
    echo json_encode(['success'=>false,'error'=>'Email o Identidad ya registrados']); exit;
  }

  $nombreEsc = $conn->real_escape_string($nombre);
  $hash = password_hash($contrasena, PASSWORD_BCRYPT);
  $hashEsc = $conn->real_escape_string($hash);

  $sql = "INSERT INTO usuarios (email, nombre, identidad, password, creado_en) VALUES ('$emailEsc', '$nombreEsc', '$identidadEsc', '$hashEsc', NOW())";
  if ($conn->query($sql)) {
    echo json_encode(['success'=>true,'message'=>'Registro exitoso']);
  } else {
    echo json_encode(['success'=>false,'error'=>'Error al registrar: ' . $conn->error]);
  }
} catch (Exception $e) {
  echo json_encode(['success'=>false,'error'=>'Error del servidor: ' . $e->getMessage()]);
}

$conn->close();
