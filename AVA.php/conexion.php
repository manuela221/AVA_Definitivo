<?php
$servidor = getenv('AVA_DB_HOST') ?: 'localhost';
$usuario = getenv('AVA_DB_USER') ?: 'root';
$contraseha = getenv('AVA_DB_PASSWORD') ?: '';
$BD = getenv('AVA_DB_NAME') ?: 'proyecto_mt';

$conexion = mysqli_connect($servidor, $usuario, $contraseha, $BD);

if (!$conexion) {
    error_log('No se pudo conectar con la base de datos de AVA: ' . mysqli_connect_error());
    http_response_code(500);
    throw new RuntimeException('No se pudo conectar con la base de datos.');
}
$conexion->set_charset('utf8mb4');
?>