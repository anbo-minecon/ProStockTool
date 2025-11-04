<?php

$host = "localhost";
$user = "root";
$pass = "";
$db = "prostocktool";

$conn = new mysqli($host, $user, $pass, $db);
if ($conn->connect_errno) {
    http_response_code(500);
    echo json_encode(["error" => "Error de conexión a la base de datos"]);
    exit;
}
?>