<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$username = getenv('AVA_ADMIN_USERNAME');
$password = getenv('AVA_ADMIN_PASSWORD');
$length = is_string($password) ? preg_match_all('/./us', $password) : false;
if (!is_string($username) || trim($username) === '' || !is_string($password)
    || $length === false || $length < 12 || strlen($password) > 72) {
    fwrite(STDERR, "Configura AVA_ADMIN_USERNAME y AVA_ADMIN_PASSWORD (mínimo 12 caracteres y máximo 72 bytes).\n");
    exit(1);
}

require_once __DIR__ . '/conexion.php';
$stmt = $conexion->prepare('UPDATE administradores_ava SET hash_contrasena = ?, version_autenticacion = version_autenticacion + 1 WHERE nombre_usuario = ?');
$passwordHash = password_hash($password, PASSWORD_DEFAULT);
$username = trim($username);
$stmt->bind_param('ss', $passwordHash, $username);
$stmt->execute();
if ($stmt->affected_rows !== 1) {
    fwrite(STDERR, "No se encontró esa cuenta administradora; no se cambió ninguna contraseña.\n");
    exit(1);
}
fwrite(STDOUT, "Contraseña de administrador actualizada; las sesiones anteriores quedaron invalidadas.\n");
$stmt->close();
$conexion->close();
