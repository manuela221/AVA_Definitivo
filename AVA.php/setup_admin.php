<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$username = getenv('AVA_ADMIN_USERNAME');
$password = getenv('AVA_ADMIN_PASSWORD');
if (!is_string($username) || trim($username) === '' || !is_string($password) || strlen($password) < 12) {
    fwrite(STDERR, "Configura AVA_ADMIN_USERNAME y AVA_ADMIN_PASSWORD (mínimo 12 caracteres) en el entorno del servidor.\n");
    exit(1);
}

require_once __DIR__ . '/conexion.php';
$stmt = $conexion->prepare('INSERT INTO administradores_ava (nombre_usuario, hash_contrasena) VALUES (?, ?)');
$hash = password_hash($password, PASSWORD_DEFAULT);
$username = trim($username);
$stmt->bind_param('ss', $username, $hash);
try {
    $stmt->execute();
    fwrite(STDOUT, "Cuenta de administrador creada.\n");
} catch (mysqli_sql_exception $error) {
    if ((int)$error->getCode() === 1062) {
        fwrite(STDERR, "Ese usuario administrador ya existe. No se modificó su contraseña.\n");
        exit(1);
    }
    throw $error;
} finally {
    $stmt->close();
    $conexion->close();
}
