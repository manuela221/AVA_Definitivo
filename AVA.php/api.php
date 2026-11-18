<?php
declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('session.use_strict_mode', '1');
ini_set('session.use_only_cookies', '1');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');

$isHttps = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
session_set_cookie_params([
    'httponly' => true,
    'secure' => $isHttps,
    'samesite' => 'Strict',
    'path' => '/',
]);
session_start();
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

function respond(int $status, array $data): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function database(): mysqli
{
    require_once __DIR__ . '/conexion.php';
    $conexion->set_charset('utf8mb4');
    return $conexion;
}

function request_data(): array
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw === false ? '' : $raw, true);
    if (!is_array($data)) {
        respond(400, ['message' => 'La solicitud no tiene un formato válido.']);
    }
    return $data;
}

function text_value(array $data, string $key, int $maxLength = 255): string
{
    $value = $data[$key] ?? null;
    if (!is_string($value)) {
        respond(400, ['message' => 'Completa todos los campos obligatorios.']);
    }
    $value = trim($value);
    $length = function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value);
    if ($value === '' || $length > $maxLength) {
        respond(400, ['message' => 'Revisa los campos obligatorios y sus longitudes.']);
    }
    return $value;
}

function valid_email(array $data, string $key = 'email'): string
{
    $email = text_value($data, $key, 254);
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        respond(400, ['message' => 'Ingresa un correo electrónico válido.']);
    }
    return $email;
}

function validated_passwords(array $data): string
{
    $password = $data['password'] ?? null;
    $confirmation = $data['password_confirmation'] ?? null;
    $characterCount = is_string($password) ? preg_match_all('/./us', $password) : false;
    if (!is_string($password) || $characterCount === false || $characterCount < 12 || strlen($password) > 72) {
        respond(400, ['message' => 'La contraseña debe tener al menos 12 caracteres y no superar 72 bytes.']);
    }
    if (!is_string($confirmation) || !hash_equals($password, $confirmation)) {
        respond(400, ['message' => 'Las contraseñas no coinciden.']);
    }
    return $password;
}

function validated_reason(array $data, array $allowedReasons): string
{
    $choice = $data['reason_choice'] ?? null;
    if (!is_string($choice)) {
        respond(400, ['message' => 'Selecciona un motivo para unirte a AVA.']);
    }
    if ($choice !== 'otro') {
        if (!in_array($choice, $allowedReasons, true)) {
            respond(400, ['message' => 'Selecciona un motivo válido para unirte a AVA.']);
        }
        return $choice;
    }
    $detail = text_value($data, 'reason_detail', 990);
    return 'Otro: ' . $detail;
}

function data_encryption_key(): string
{
    $encodedKey = getenv('AVA_DATA_ENCRYPTION_KEY');
    $key = is_string($encodedKey) ? base64_decode($encodedKey, true) : false;
    if ($key === false || strlen($key) !== 32) {
        throw new RuntimeException('AVA_DATA_ENCRYPTION_KEY debe ser una clave Base64 de 32 bytes.');
    }
    return $key;
}

function encrypt_sensitive(string $value): string
{
    $nonce = random_bytes(12);
    $tag = '';
    $encrypted = openssl_encrypt($value, 'aes-256-gcm', data_encryption_key(), OPENSSL_RAW_DATA, $nonce, $tag);
    if ($encrypted === false || strlen($tag) !== 16) {
        throw new RuntimeException('No se pudieron cifrar los datos médicos.');
    }
    return base64_encode('AVA1' . $nonce . $tag . $encrypted);
}

function decrypt_sensitive(?string $value): ?string
{
    if ($value === null) {
        return null;
    }
    $payload = base64_decode($value, true);
    if ($payload === false || substr($payload, 0, 4) !== 'AVA1' || strlen($payload) < 32) {
        throw new RuntimeException('Los datos médicos almacenados no tienen un formato cifrado válido.');
    }
    $nonce = substr($payload, 4, 12);
    $tag = substr($payload, 16, 16);
    $ciphertext = substr($payload, 32);
    $plaintext = openssl_decrypt($ciphertext, 'aes-256-gcm', data_encryption_key(), OPENSSL_RAW_DATA, $nonce, $tag);
    if ($plaintext === false) {
        throw new RuntimeException('No se pudieron descifrar los datos médicos.');
    }
    return $plaintext;
}

function current_user(mysqli $db): array
{
    if (!isset($_SESSION['account']) || !is_array($_SESSION['account'])) {
        respond(401, ['message' => 'Inicia sesión para continuar.']);
    }
    $account = $_SESSION['account'];
    $isAdmin = ($account['role'] ?? '') === 'admin';
    $table = $isAdmin ? 'administradores_ava' : 'usuarios_ava';
    $stmt = $db->prepare("SELECT version_autenticacion AS auth_version FROM {$table} WHERE id = ? LIMIT 1");
    $stmt->bind_param('i', $account['id']);
    $stmt->execute();
    $record = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$record || !isset($account['auth_version']) || (int)$account['auth_version'] !== (int)$record['auth_version']) {
        $_SESSION = [];
        session_regenerate_id(true);
        respond(401, ['message' => 'Tu sesión ya no es válida. Inicia sesión nuevamente.']);
    }
    return $account;
}

function require_admin(mysqli $db): array
{
    $account = current_user($db);
    if (($account['role'] ?? '') !== 'admin') {
        respond(403, ['message' => 'No tienes permiso para realizar esta acción.']);
    }
    return $account;
}

function require_csrf(): void
{
    $provided = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $expected = $_SESSION['csrf'] ?? '';
    if (!is_string($provided) || !is_string($expected) || $expected === '' || !hash_equals($expected, $provided)) {
        respond(403, ['message' => 'La sesión expiró. Recarga la página e inténtalo nuevamente.']);
    }
}

function user_by_id(mysqli $db, int $id): ?array
{
    $stmt = $db->prepare('SELECT id, nombre_completo AS full_name, cedula, correo_electronico AS email, telefono AS phone, edad AS age, tipo_usuario AS role, nivel_educativo AS education, carrera AS career, interes_voluntariado AS volunteer_interest, condiciones_medicas AS medical_conditions, motivo AS reason, fecha_creacion AS created_at FROM usuarios_ava WHERE id = ?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if ($row) {
        $row['medical_conditions'] = decrypt_sensitive($row['medical_conditions']);
    }
    return $row ?: null;
}

function basic_user_by_id(mysqli $db, int $id): ?array
{
    $stmt = $db->prepare('SELECT id, nombre_completo AS full_name, telefono AS phone, edad AS age, tipo_usuario AS role, interes_voluntariado AS volunteer_interest FROM usuarios_ava WHERE id = ?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    return $row ?: null;
}

function has_active_assignment(mysqli $db, int $userId): bool
{
    $stmt = $db->prepare("SELECT id FROM asignaciones_ava WHERE (voluntario_id = ? OR participante_id = ?) AND estado IN ('pending', 'accepted_one', 'accepted_both') LIMIT 1");
    $stmt->bind_param('ii', $userId, $userId);
    $stmt->execute();
    $found = $stmt->get_result()->num_rows > 0;
    $stmt->close();
    return $found;
}

function add_notification(mysqli $db, int $userId, int $assignmentId, string $message): void
{
    $stmt = $db->prepare('INSERT INTO notificaciones_ava (usuario_id, asignacion_id, mensaje) VALUES (?, ?, ?)');
    $stmt->bind_param('iis', $userId, $assignmentId, $message);
    $stmt->execute();
    $stmt->close();
}

function assignment_for_user(mysqli $db, int $userId): ?array
{
    $stmt = $db->prepare("SELECT id, voluntario_id AS volunteer_id, participante_id AS participant_id, estado AS state, voluntario_acepto AS volunteer_accepted, participante_acepto AS participant_accepted, fecha_creacion AS created_at FROM asignaciones_ava WHERE (voluntario_id = ? OR participante_id = ?) AND estado IN ('pending', 'accepted_one', 'accepted_both') ORDER BY id DESC LIMIT 1");
    $stmt->bind_param('ii', $userId, $userId);
    $stmt->execute();
    $assignment = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$assignment) {
        return null;
    }

    $otherId = (int)((int)$assignment['volunteer_id'] === $userId
        ? $assignment['participant_id']
        : $assignment['volunteer_id']);
    $partner = basic_user_by_id($db, $otherId);
    if ($partner) {
        $assignment['partner'] = [
            'name' => $partner['full_name'],
            'role' => $partner['role'],
            'age' => (int)$partner['age'],
        ];
        if ($assignment['state'] === 'accepted_both') {
            $assignment['partner']['phone'] = $partner['phone'];
        }
    }
    return $assignment;
}

try {
    $action = $_GET['action'] ?? '';
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($method === 'GET' && $action === 'csrf') {
        if (!isset($_SESSION['csrf'])) {
            $_SESSION['csrf'] = bin2hex(random_bytes(32));
        }
        respond(200, ['csrf' => $_SESSION['csrf']]);
    }

    $db = database();

    if ($method === 'POST') {
        require_csrf();
        $data = request_data();

        if ($action === 'register') {
            $role = $data['role'] ?? '';
            if (!in_array($role, ['volunteer', 'senior', 'disability'], true)) {
                respond(400, ['message' => 'Selecciona un tipo de cuenta válido.']);
            }
            $name = text_value($data, 'full_name', 180);
            $cedula = text_value($data, 'cedula', 32);
            if (!preg_match('/^[0-9]{5,20}$/', $cedula)) {
                respond(400, ['message' => 'Ingresa una cédula válida, usando solo números.']);
            }
            $email = valid_email($data);
            $password = validated_passwords($data);
            $passwordHash = password_hash($password, PASSWORD_DEFAULT);
            $phone = text_value($data, 'phone', 40);
            $ageValue = filter_var($data['age'] ?? null, FILTER_VALIDATE_INT);
            if ($ageValue === false || $ageValue < 18 || $ageValue > 120) {
                respond(400, ['message' => 'La edad debe estar entre 18 y 120 años.']);
            }

            $education = null;
            $career = null;
            $interest = null;
            $medical = null;
            $storedMedical = null;
            $reason = null;
            if ($role === 'volunteer') {
                $education = text_value($data, 'education', 80);
                $interest = text_value($data, 'volunteer_interest', 30);
                if (!in_array($education, ['bachiller', 'universitario_tecnico', 'profesional', 'otro'], true)
                    || !in_array($interest, ['senior', 'disability', 'any'], true)) {
                    respond(400, ['message' => 'Selecciona opciones válidas para tu perfil.']);
                }
                if (in_array($education, ['universitario_tecnico', 'profesional'], true)) {
                    $career = text_value($data, 'career', 120);
                }
            } elseif ($role === 'senior') {
                $medical = text_value($data, 'medical_conditions', 2000);
                $storedMedical = encrypt_sensitive($medical);
                $allowedReasons = [
                    'Deseo tener compañía',
                    'Necesito compañía para asistir a citas médicas',
                    'Quiero compartir tiempo con otras personas',
                    'Necesito acompañamiento en algunas actividades',
                ];
                $reason = validated_reason($data, $allowedReasons);
            } else {
                $medical = text_value($data, 'medical_conditions', 1000);
                $storedMedical = encrypt_sensitive($medical);
                $allowedReasons = [
                    'Deseo tener compañía',
                    'Necesito acompañamiento en algunas actividades',
                    'Quiero conocer a otras personas',
                    'Necesito apoyo para asistir a citas o realizar actividades',
                ];
                $reason = validated_reason($data, $allowedReasons);
            }

            $stmt = $db->prepare('INSERT INTO usuarios_ava (nombre_completo, cedula, correo_electronico, hash_contrasena, telefono, edad, tipo_usuario, nivel_educativo, carrera, interes_voluntariado, condiciones_medicas, motivo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            $stmt->bind_param('sssssissssss', $name, $cedula, $email, $passwordHash, $phone, $ageValue, $role, $education, $career, $interest, $storedMedical, $reason);
            try {
                $stmt->execute();
            } catch (mysqli_sql_exception $error) {
                if ((int)$error->getCode() === 1062) {
                    respond(409, ['message' => 'Ya existe una cuenta registrada con ese número de cédula.']);
                }
                throw $error;
            }
            $stmt->close();
            respond(201, ['message' => '¡Registro realizado con éxito! Ya puedes ingresar con tu cédula y contraseña.']);
        }

        if ($action === 'login') {
            $cedula = text_value($data, 'cedula', 32);
            $password = $data['password'] ?? null;
            if (!is_string($password) || $password === '' || strlen($password) > 1024) {
                respond(400, ['message' => 'Ingresa la cédula y la contraseña.']);
            }
            $stmt = $db->prepare('SELECT id, tipo_usuario AS role, hash_contrasena AS password_hash, version_autenticacion AS auth_version FROM usuarios_ava WHERE cedula = ? LIMIT 1');
            $stmt->bind_param('s', $cedula);
            $stmt->execute();
            $user = $stmt->get_result()->fetch_assoc();
            $stmt->close();
            if (!$user || !is_string($user['password_hash']) || !password_verify($password, $user['password_hash'])) {
                respond(401, ['message' => 'La cédula o la contraseña son incorrectas.']);
            }
            session_regenerate_id(true);
            $_SESSION['account'] = ['id' => (int)$user['id'], 'role' => $user['role'], 'auth_version' => (int)$user['auth_version']];
            $_SESSION['csrf'] = bin2hex(random_bytes(32));
            respond(200, ['message' => 'Sesión iniciada.', 'csrf' => $_SESSION['csrf']]);
        }

        if ($action === 'admin-login') {
            $username = text_value($data, 'username', 100);
            $password = $data['password'] ?? null;
            if (!is_string($password) || $password === '' || strlen($password) > 1024) {
                respond(400, ['message' => 'Ingresa la contraseña.']);
            }
            $stmt = $db->prepare('SELECT id, nombre_usuario AS username, hash_contrasena AS password_hash, version_autenticacion AS auth_version FROM administradores_ava WHERE nombre_usuario = ? LIMIT 1');
            $stmt->bind_param('s', $username);
            $stmt->execute();
            $admin = $stmt->get_result()->fetch_assoc();
            $stmt->close();
            if (!$admin || !password_verify($password, $admin['password_hash'])) {
                respond(401, ['message' => 'Usuario o contraseña incorrectos.']);
            }
            session_regenerate_id(true);
            $_SESSION['account'] = ['id' => (int)$admin['id'], 'role' => 'admin', 'username' => $admin['username'], 'auth_version' => (int)$admin['auth_version']];
            $_SESSION['csrf'] = bin2hex(random_bytes(32));
            respond(200, ['message' => 'Sesión de administrador iniciada.', 'csrf' => $_SESSION['csrf']]);
        }

        if ($action === 'logout') {
            $_SESSION = [];
            session_regenerate_id(true);
            $_SESSION['csrf'] = bin2hex(random_bytes(32));
            respond(200, ['message' => 'Sesión cerrada.', 'csrf' => $_SESSION['csrf']]);
        }

        if ($action === 'assign') {
            require_admin($db);
            $participantId = filter_var($data['participant_id'] ?? null, FILTER_VALIDATE_INT);
            $volunteerId = filter_var($data['volunteer_id'] ?? null, FILTER_VALIDATE_INT);
            if (!$participantId || !$volunteerId || $participantId === $volunteerId) {
                respond(400, ['message' => 'Selecciona una persona participante y una persona voluntaria válidas.']);
            }

            $db->begin_transaction();
            try {
                $ids = [(int)$participantId, (int)$volunteerId];
                sort($ids, SORT_NUMERIC);
                $firstId = $ids[0];
                $secondId = $ids[1];
                $stmt = $db->prepare('SELECT id, tipo_usuario AS role, interes_voluntariado AS volunteer_interest FROM usuarios_ava WHERE id IN (?, ?) ORDER BY id FOR UPDATE');
                $stmt->bind_param('ii', $firstId, $secondId);
                $stmt->execute();
                $lockedUsers = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
                $stmt->close();
                if (count($lockedUsers) !== 2) {
                    $db->rollback();
                    respond(404, ['message' => 'No se encontró a una de las personas seleccionadas.']);
                }
                $roles = [];
                foreach ($lockedUsers as $lockedUser) {
                    $roles[(int)$lockedUser['id']] = $lockedUser;
                }
                $participant = $roles[(int)$participantId];
                $volunteer = $roles[(int)$volunteerId];
                if (!in_array($participant['role'], ['senior', 'disability'], true) || $volunteer['role'] !== 'volunteer') {
                    $db->rollback();
                    respond(400, ['message' => 'La asignación requiere una persona participante y una persona voluntaria.']);
                }
                $interest = $volunteer['volunteer_interest'];
                if ($interest !== 'any' && $interest !== $participant['role']) {
                    $db->rollback();
                    respond(409, ['message' => 'La población seleccionada no coincide con las preferencias de esta persona voluntaria.']);
                }
                if (has_active_assignment($db, (int)$participantId) || has_active_assignment($db, (int)$volunteerId)) {
                    $db->rollback();
                    respond(409, ['message' => 'Una de las personas ya tiene una asignación activa.']);
                }
                $stmt = $db->prepare("INSERT INTO asignaciones_ava (voluntario_id, participante_id, estado) VALUES (?, ?, 'pending')");
                $stmt->bind_param('ii', $volunteerId, $participantId);
                $stmt->execute();
                $assignmentId = (int)$db->insert_id;
                $stmt->close();
                add_notification($db, (int)$participantId, $assignmentId, 'AVA encontró una posible conexión para ti. Revisa la propuesta en tu espacio AVA.');
                add_notification($db, (int)$volunteerId, $assignmentId, 'AVA te propone acompañar a una persona. Revisa la propuesta en tu espacio AVA.');
                $db->commit();
                respond(201, ['message' => 'Propuesta enviada. Ambas personas recibieron una notificación.']);
            } catch (Throwable $error) {
                $db->rollback();
                throw $error;
            }
        }

        if ($action === 'respond') {
            $account = current_user($db);
            if ($account['role'] === 'admin') {
                respond(403, ['message' => 'Las personas administradoras no responden a propuestas de acompañamiento.']);
            }
            $assignmentId = filter_var($data['assignment_id'] ?? null, FILTER_VALIDATE_INT);
            $response = $data['response'] ?? '';
            if (!$assignmentId || !in_array($response, ['accept', 'reject'], true)) {
                respond(400, ['message' => 'La respuesta no es válida.']);
            }
            $db->begin_transaction();
            try {
                $stmt = $db->prepare('SELECT id, voluntario_id AS volunteer_id, participante_id AS participant_id, estado AS state, voluntario_acepto AS volunteer_accepted, participante_acepto AS participant_accepted FROM asignaciones_ava WHERE id = ? FOR UPDATE');
                $stmt->bind_param('i', $assignmentId);
                $stmt->execute();
                $assignment = $stmt->get_result()->fetch_assoc();
                $stmt->close();
                $userId = (int)$account['id'];
                if (!$assignment || ($userId !== (int)$assignment['volunteer_id'] && $userId !== (int)$assignment['participant_id'])) {
                    $db->rollback();
                    respond(404, ['message' => 'No se encontró esa propuesta de acompañamiento.']);
                }
                if (!in_array($assignment['state'], ['pending', 'accepted_one'], true)) {
                    $db->rollback();
                    respond(409, ['message' => 'Esta propuesta ya no está pendiente de respuesta.']);
                }
                $volunteerAccepted = (int)$assignment['volunteer_accepted'];
                $participantAccepted = (int)$assignment['participant_accepted'];
                if ($response === 'reject') {
                    $state = 'rejected';
                } else {
                    if ($userId === (int)$assignment['volunteer_id']) {
                        $volunteerAccepted = 1;
                    } else {
                        $participantAccepted = 1;
                    }
                    $state = ($volunteerAccepted && $participantAccepted) ? 'accepted_both' : 'accepted_one';
                }
                $stmt = $db->prepare('UPDATE asignaciones_ava SET estado = ?, voluntario_acepto = ?, participante_acepto = ? WHERE id = ?');
                $stmt->bind_param('siii', $state, $volunteerAccepted, $participantAccepted, $assignmentId);
                $stmt->execute();
                $stmt->close();
                $otherId = $userId === (int)$assignment['volunteer_id']
                    ? (int)$assignment['participant_id']
                    : (int)$assignment['volunteer_id'];
                $message = $response === 'reject'
                    ? 'La propuesta de acompañamiento fue rechazada y quedó cancelada. AVA podrá buscar una nueva opción.'
                    : ($state === 'accepted_both'
                        ? '¡Ambas personas aceptaron! Ya pueden consultar la información de contacto en su espacio AVA.'
                        : 'Una persona aceptó la propuesta. Estamos esperando la respuesta de la otra persona.');
                add_notification($db, $userId, (int)$assignmentId, $message);
                add_notification($db, $otherId, (int)$assignmentId, $message);
                $db->commit();
                respond(200, ['message' => $message]);
            } catch (Throwable $error) {
                $db->rollback();
                throw $error;
            }
        }

        respond(404, ['message' => 'Acción no encontrada.']);
    }

    if ($method !== 'GET') {
        respond(405, ['message' => 'Método no permitido.']);
    }

    if ($action === 'me') {
        $account = current_user($db);
        if ($account['role'] === 'admin') {
            respond(200, ['account' => ['role' => 'admin', 'username' => $account['username']]]);
        }
        $user = user_by_id($db, (int)$account['id']);
        if (!$user) {
            respond(401, ['message' => 'La cuenta ya no está disponible.']);
        }
        $stmt = $db->prepare('SELECT id, mensaje AS message, fecha_creacion AS created_at, leida AS is_read FROM notificaciones_ava WHERE usuario_id = ? ORDER BY id DESC LIMIT 20');
        $stmt->bind_param('i', $account['id']);
        $stmt->execute();
        $notifications = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        respond(200, ['account' => $user, 'assignment' => assignment_for_user($db, (int)$account['id']), 'notifications' => $notifications]);
    }

    if ($action === 'inbox') {
        require_admin($db);
        $contacts = $db->query('SELECT nombre, apellido, correo, telefono, mensaje FROM contactanos')->fetch_all(MYSQLI_ASSOC);
        $comments = $db->query('SELECT correo, mensaje FROM comentarios')->fetch_all(MYSQLI_ASSOC);
        respond(200, ['contacts' => $contacts, 'comments' => $comments]);
    }

    if ($action === 'community') {
        require_admin($db);
        $role = $_GET['role'] ?? '';
        if (!in_array($role, ['volunteer', 'senior', 'disability'], true)) {
            respond(400, ['message' => 'Selecciona un apartado válido de la comunidad.']);
        }
        $stmt = $db->prepare("SELECT u.id, u.nombre_completo AS full_name, u.cedula, u.correo_electronico AS email, u.telefono AS phone, u.edad AS age, u.tipo_usuario AS role, u.nivel_educativo AS education, u.carrera AS career, u.interes_voluntariado AS volunteer_interest, u.condiciones_medicas AS medical_conditions, u.motivo AS reason, u.fecha_creacion AS created_at, (SELECT a.id FROM asignaciones_ava a WHERE (a.participante_id = u.id OR a.voluntario_id = u.id) AND a.estado IN ('pending', 'accepted_one', 'accepted_both') ORDER BY a.id DESC LIMIT 1) AS active_assignment_id, (SELECT a.estado FROM asignaciones_ava a WHERE (a.participante_id = u.id OR a.voluntario_id = u.id) AND a.estado IN ('pending', 'accepted_one', 'accepted_both') ORDER BY a.id DESC LIMIT 1) AS active_assignment_state FROM usuarios_ava u WHERE u.tipo_usuario = ? ORDER BY u.nombre_completo");
        $stmt->bind_param('s', $role);
        $stmt->execute();
        $users = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        foreach ($users as &$user) {
            $user['medical_conditions'] = decrypt_sensitive($user['medical_conditions']);
        }
        unset($user);
        respond(200, ['users' => $users]);
    }

    if ($action === 'eligible-volunteers') {
        require_admin($db);
        $participantId = filter_var($_GET['participant_id'] ?? null, FILTER_VALIDATE_INT);
        if (!$participantId) {
            respond(400, ['message' => 'Selecciona una persona de la comunidad.']);
        }
        $participant = basic_user_by_id($db, (int)$participantId);
        if (!$participant || !in_array($participant['role'], ['senior', 'disability'], true)) {
            respond(404, ['message' => 'No se encontró a esa persona participante.']);
        }
        if (has_active_assignment($db, (int)$participantId)) {
            respond(409, ['message' => 'Esta persona ya tiene una asignación activa.']);
        }
        $stmt = $db->prepare("SELECT u.id, u.nombre_completo AS full_name, u.edad AS age, u.telefono AS phone, u.nivel_educativo AS education, u.carrera AS career, u.interes_voluntariado AS volunteer_interest FROM usuarios_ava u WHERE u.tipo_usuario = 'volunteer' AND (u.interes_voluntariado = 'any' OR u.interes_voluntariado = ?) AND NOT EXISTS (SELECT 1 FROM asignaciones_ava a WHERE a.voluntario_id = u.id AND a.estado IN ('pending', 'accepted_one', 'accepted_both')) ORDER BY u.nombre_completo");
        $stmt->bind_param('s', $participant['role']);
        $stmt->execute();
        $volunteers = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        respond(200, ['volunteers' => $volunteers]);
    }

    respond(404, ['message' => 'Acción no encontrada.']);
} catch (Throwable $error) {
    error_log('Error en API AVA: ' . $error->getMessage());
    respond(500, ['message' => 'No se pudo completar la solicitud. Inténtalo nuevamente.']);
}
