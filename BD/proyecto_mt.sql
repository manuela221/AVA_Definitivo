-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 18-11-2026 a las 16:03:32
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `proyecto_mt`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `administradores_ava`
--

CREATE TABLE `administradores_ava` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `nombre_usuario` varchar(100) NOT NULL,
  `hash_contrasena` varchar(255) NOT NULL,
  `version_autenticacion` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `administradores_ava`
--

INSERT INTO `administradores_ava` (`id`, `nombre_usuario`, `hash_contrasena`, `version_autenticacion`, `fecha_creacion`) VALUES
(1, 'Manuela Roldan Correa', '$2y$10$lKWU7umOkhktKatcjf9uKeVozz1R1jNRiDkbwXDB7juE3ogUfyUCi', 1, '2026-11-08 00:02:36');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `asignaciones_ava`
--

CREATE TABLE `asignaciones_ava` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `voluntario_id` bigint(20) UNSIGNED NOT NULL,
  `participante_id` bigint(20) UNSIGNED NOT NULL,
  `estado` enum('pending','accepted_one','accepted_both','rejected','cancelled') NOT NULL DEFAULT 'pending',
  `voluntario_acepto` tinyint(1) NOT NULL DEFAULT 0,
  `participante_acepto` tinyint(1) NOT NULL DEFAULT 0,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `asignaciones_ava`
--

INSERT INTO `asignaciones_ava` (`id`, `voluntario_id`, `participante_id`, `estado`, `voluntario_acepto`, `participante_acepto`, `fecha_creacion`, `fecha_actualizacion`) VALUES
(1, 1, 2, 'accepted_one', 1, 0, '2026-11-08 00:43:41', '2026-11-08 00:44:38');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `comentarios`
--

CREATE TABLE `comentarios` (
  `id_comentario` int(11) NOT NULL,
  `correo` varchar(255) DEFAULT NULL,
  `mensaje` varchar(300) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `comentarios`
--

INSERT INTO `comentarios` (`id_comentario`, `correo`, `mensaje`) VALUES
(13, 'ieca.emanuelalvarez@gmail.com', 'holaaaaaaaaaaaaaaaaaaaa');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `contactanos`
--

CREATE TABLE `contactanos` (
  `id_contactanos` int(11) NOT NULL,
  `nombre` varchar(30) DEFAULT NULL,
  `apellido` varchar(30) DEFAULT NULL,
  `correo` varchar(50) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `mensaje` varchar(200) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `contactanos`
--

INSERT INTO `contactanos` (`id_contactanos`, `nombre`, `apellido`, `correo`, `telefono`, `mensaje`) VALUES
(1, 'Manuela', 'Roldan', 'manuelaroldan12@gmail.com', '3103624017', 'hola'),
(2, 'saray', 'marin', 'saraymarin@gmail.com', '3213425661', 'hola'),
(3, 'valeria', 'cardona ', 'valeria@gmail.com', '31267718', 'hola'),
(4, 'rafael ', 'sierra', 'rafael@gmail.com', '3204921063', 'usvefnerjgnerjernnr'),
(5, 'rafael ', 'sierra', 'rafael@gmail.com', '3204921063', 'Muy bien 5.0'),
(6, 'ryan castro', 'mejia', 'bryant@gmail.com', '3123117066', 'muy bueno'),
(7, 'emanuel', 'alvarez', 'ee@gmail.com', '231312132', 'oeoeoeoe'),
(8, 'emanuel', 'alvarez', 'ieca.emanuelalvarez@gmail.com', '3123117066', 'oeoeoeoe');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `notificaciones_ava`
--

CREATE TABLE `notificaciones_ava` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `usuario_id` bigint(20) UNSIGNED NOT NULL,
  `asignacion_id` bigint(20) UNSIGNED NOT NULL,
  `mensaje` varchar(500) NOT NULL,
  `leida` tinyint(1) NOT NULL DEFAULT 0,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `notificaciones_ava`
--

INSERT INTO `notificaciones_ava` (`id`, `usuario_id`, `asignacion_id`, `mensaje`, `leida`, `fecha_creacion`) VALUES
(1, 2, 1, 'AVA encontró un compañero para ti. Revisa la propuesta en la página Compañero.', 0, '2026-11-08 00:43:41'),
(2, 1, 1, 'AVA te propone acompañar a una persona. Revisa la propuesta en la página Compañero.', 0, '2026-11-08 00:43:41'),
(3, 1, 1, 'Una persona aceptó la propuesta. Estamos esperando la respuesta de la otra persona.', 0, '2026-11-08 00:44:38'),
(4, 2, 1, 'Una persona aceptó la propuesta. Estamos esperando la respuesta de la otra persona.', 0, '2026-11-08 00:44:38');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios_ava`
--

CREATE TABLE `usuarios_ava` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `nombre_completo` varchar(180) NOT NULL,
  `cedula` varchar(32) NOT NULL,
  `correo_electronico` varchar(254) NOT NULL,
  `hash_contrasena` varchar(255) NOT NULL,
  `telefono` varchar(40) NOT NULL,
  `edad` tinyint(3) UNSIGNED NOT NULL,
  `tipo_usuario` enum('volunteer','senior','disability') NOT NULL,
  `nivel_educativo` varchar(80) DEFAULT NULL,
  `carrera` varchar(120) DEFAULT NULL,
  `interes_voluntariado` enum('senior','disability','any') DEFAULT NULL,
  `condiciones_medicas` text DEFAULT NULL,
  `motivo` varchar(1000) DEFAULT NULL,
  `version_autenticacion` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `usuarios_ava`
--

INSERT INTO `usuarios_ava` (`id`, `nombre_completo`, `cedula`, `correo_electronico`, `hash_contrasena`, `telefono`, `edad`, `tipo_usuario`, `nivel_educativo`, `carrera`, `interes_voluntariado`, `condiciones_medicas`, `motivo`, `version_autenticacion`, `fecha_creacion`) VALUES
(1, 'Manuela Roldan Correa', '1040877741', 'manuelaroldanc@gmail.com', '$2y$10$CnbUMxJ5G/gFgNbyA5EGW.LVK3PW.W8rxyA8xJN9Pp0qcAMWgzDkq', '3103624017', 18, 'volunteer', 'bachiller', NULL, 'senior', NULL, NULL, 1, '2026-11-07 22:53:28'),
(2, 'Luz Amparo Rojas Henao', '43421273', 'amparojas@gmail.com', '$2y$10$1l8p5jhYapjs4j0dh.ZCaO16qOPfC2pRxT2u5yrExPVxfNN45TavC', '3183816161', 65, 'senior', NULL, NULL, NULL, 'QVZBMXtLZuiGVJxwxrQ4NHZ0hpp9qLKyyNhHofPEX2fIKMk0GUWx', 'Necesita compañía para asistir a citas médicas', 1, '2026-11-08 00:39:13'),
(3, 'Oscar David Roldan Garcia', '12345678', 'david@gmail.com', '$2y$10$3yGunmwAKgKS90tUdp4rdubGZP5IhfpvwnvFMs0vOCuqOOGe12/sK', '3214567890', 22, 'disability', NULL, NULL, NULL, 'QVZBMekhBUTdJ8v3jsdu4dV1ShmIGaCcY7V14L+/ToPrrudRjdtzy198icfoCiOjmmcZTMYc', 'Desea tener compañía', 1, '2026-11-08 00:42:04');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `administradores_ava`
--
ALTER TABLE `administradores_ava`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_ava_admins_username` (`nombre_usuario`);

--
-- Indices de la tabla `asignaciones_ava`
--
ALTER TABLE `asignaciones_ava`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ava_assignments_volunteer_state` (`voluntario_id`,`estado`),
  ADD KEY `idx_ava_assignments_participant_state` (`participante_id`,`estado`);

--
-- Indices de la tabla `comentarios`
--
ALTER TABLE `comentarios`
  ADD PRIMARY KEY (`id_comentario`);

--
-- Indices de la tabla `contactanos`
--
ALTER TABLE `contactanos`
  ADD PRIMARY KEY (`id_contactanos`);

--
-- Indices de la tabla `notificaciones_ava`
--
ALTER TABLE `notificaciones_ava`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ava_notifications_user_created` (`usuario_id`,`fecha_creacion`),
  ADD KEY `fk_notificaciones_asignacion` (`asignacion_id`);

--
-- Indices de la tabla `usuarios_ava`
--
ALTER TABLE `usuarios_ava`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_ava_users_cedula` (`cedula`),
  ADD KEY `idx_ava_users_email` (`correo_electronico`),
  ADD KEY `idx_ava_users_role_name` (`tipo_usuario`,`nombre_completo`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `administradores_ava`
--
ALTER TABLE `administradores_ava`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `asignaciones_ava`
--
ALTER TABLE `asignaciones_ava`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `comentarios`
--
ALTER TABLE `comentarios`
  MODIFY `id_comentario` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT de la tabla `contactanos`
--
ALTER TABLE `contactanos`
  MODIFY `id_contactanos` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de la tabla `notificaciones_ava`
--
ALTER TABLE `notificaciones_ava`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `usuarios_ava`
--
ALTER TABLE `usuarios_ava`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `asignaciones_ava`
--
ALTER TABLE `asignaciones_ava`
  ADD CONSTRAINT `fk_asignaciones_participante` FOREIGN KEY (`participante_id`) REFERENCES `usuarios_ava` (`id`),
  ADD CONSTRAINT `fk_asignaciones_voluntario` FOREIGN KEY (`voluntario_id`) REFERENCES `usuarios_ava` (`id`);

--
-- Filtros para la tabla `notificaciones_ava`
--
ALTER TABLE `notificaciones_ava`
  ADD CONSTRAINT `fk_notificaciones_asignacion` FOREIGN KEY (`asignacion_id`) REFERENCES `asignaciones_ava` (`id`),
  ADD CONSTRAINT `fk_notificaciones_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios_ava` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
