<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    require_once __DIR__ . '/conexion.php';

    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Método no permitido.']);
        exit;
    }

    $values = [];
    foreach (['fullname', 'apellido', 'email', 'phone', 'message'] as $field) {
        $value = $_POST[$field] ?? null;
        if (!is_string($value)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Completa todos los campos con datos válidos.']);
            exit;
        }
        $values[$field] = trim($value);
    }

    $nombre = $values['fullname'];
    $apellido = $values['apellido'];
    $correo = $values['email'];
    $telefono = $values['phone'];
    $mensaje = $values['message'];

    if ($nombre === '' || $apellido === '' || $correo === '' || $telefono === '' || $mensaje === ''
        || !filter_var($correo, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Completa todos los campos con datos válidos.']);
        exit;
    }

    $stmt = $conexion->prepare('INSERT INTO contactanos (nombre, apellido, correo, telefono, mensaje) VALUES (?, ?, ?, ?, ?)');
    $stmt->bind_param('sssss', $nombre, $apellido, $correo, $telefono, $mensaje);
    $stmt->execute();
    $stmt->close();
    $conexion->close();

    echo json_encode([
        'status' => 'success',
        'message' => 'Mensaje enviado correctamente. Te responderemos por correo electrónico.'
    ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
} catch (Throwable $error) {
    error_log('No se pudo guardar un mensaje de contacto de AVA: ' . $error->getMessage());
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'No se pudo guardar el mensaje. Inténtalo nuevamente.']);
}
?>
