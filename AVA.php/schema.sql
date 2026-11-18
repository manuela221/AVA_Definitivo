CREATE TABLE IF NOT EXISTS usuarios_ava (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre_completo VARCHAR(180) NOT NULL,
    cedula VARCHAR(32) NOT NULL,
    correo_electronico VARCHAR(254) NOT NULL,
    hash_contrasena VARCHAR(255) NOT NULL,
    telefono VARCHAR(40) NOT NULL,
    edad TINYINT UNSIGNED NOT NULL,
    tipo_usuario ENUM('volunteer', 'senior', 'disability') NOT NULL,
    nivel_educativo VARCHAR(80) NULL,
    carrera VARCHAR(120) NULL,
    interes_voluntariado ENUM('senior', 'disability', 'any') NULL,
    condiciones_medicas TEXT NULL,
    motivo VARCHAR(1000) NULL,
    version_autenticacion INT UNSIGNED NOT NULL DEFAULT 1,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_usuarios_ava_cedula (cedula),
    KEY idx_usuarios_ava_correo (correo_electronico),
    KEY idx_usuarios_ava_tipo_nombre (tipo_usuario, nombre_completo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS administradores_ava (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre_usuario VARCHAR(100) NOT NULL,
    hash_contrasena VARCHAR(255) NOT NULL,
    version_autenticacion INT UNSIGNED NOT NULL DEFAULT 1,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_administradores_nombre_usuario (nombre_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS asignaciones_ava (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    voluntario_id BIGINT UNSIGNED NOT NULL,
    participante_id BIGINT UNSIGNED NOT NULL,
    estado ENUM('pending', 'accepted_one', 'accepted_both', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
    voluntario_acepto TINYINT(1) NOT NULL DEFAULT 0,
    participante_acepto TINYINT(1) NOT NULL DEFAULT 0,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_asignaciones_voluntario_estado (voluntario_id, estado),
    KEY idx_asignaciones_participante_estado (participante_id, estado),
    CONSTRAINT fk_asignaciones_voluntario FOREIGN KEY (voluntario_id) REFERENCES usuarios_ava (id),
    CONSTRAINT fk_asignaciones_participante FOREIGN KEY (participante_id) REFERENCES usuarios_ava (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notificaciones_ava (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    usuario_id BIGINT UNSIGNED NOT NULL,
    asignacion_id BIGINT UNSIGNED NOT NULL,
    mensaje VARCHAR(500) NOT NULL,
    leida TINYINT(1) NOT NULL DEFAULT 0,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_notificaciones_usuario_fecha (usuario_id, fecha_creacion),
    CONSTRAINT fk_notificaciones_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios_ava (id),
    CONSTRAINT fk_notificaciones_asignacion FOREIGN KEY (asignacion_id) REFERENCES asignaciones_ava (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
