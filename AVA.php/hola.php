<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    require_once __DIR__ . '/conexion.php';

    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
        $correoValue = $_POST['comment-email'] ?? null;
        $messageValue = $_POST['comment-message'] ?? null;
        if (!is_string($correoValue) || !is_string($messageValue)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Completa los campos con datos válidos.']);
            exit;
        }
        $correo = trim($correoValue);
        $mensaje = trim($messageValue);
        if ($correo === '' || $mensaje === '' || !filter_var($correo, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Completa los campos con datos válidos.']);
            exit;
        }

        $stmt = $conexion->prepare('INSERT INTO comentarios (correo, mensaje) VALUES (?, ?)');
        $stmt->bind_param('ss', $correo, $mensaje);
        $stmt->execute();
        $stmt->close();
        echo json_encode([
            'status' => 'success',
            'message' => 'Comentario enviado. Te responderemos por correo electrónico.'
        ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    } elseif (($_SERVER['REQUEST_METHOD'] ?? '') === 'GET') {
        $resultado = $conexion->query('SELECT mensaje FROM comentarios ORDER BY id_comentario DESC');
        $comentarios = $resultado->fetch_all(MYSQLI_ASSOC);
        echo json_encode(['status' => 'success', 'comentarios' => $comentarios], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    } else {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Método no permitido.']);
    }

    $conexion->close();
} catch (Throwable $error) {
    error_log('No se pudo procesar un comentario de AVA: ' . $error->getMessage());
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'No se pudo procesar el comentario. Inténtalo nuevamente.']);
}
?>
