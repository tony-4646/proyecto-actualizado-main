-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 18-02-2026 a las 22:02:24
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
-- Base de datos: `micromercado_munoz`
--

DELIMITER $$
--
-- Procedimientos
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `p_crear_usuario` (IN `p_rolid` INT, IN `p_usuario` VARCHAR(50), IN `p_contrasena` VARCHAR(255))   BEGIN
    INSERT INTO usuarios (rolid, usuusuario, usucontrasena)
    VALUES (p_rolid, p_usuario, SHA2(p_contrasena, 256));
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `p_login` (IN `p_usuario` VARCHAR(50), IN `p_contrasena` VARCHAR(255))   BEGIN
    SELECT usuid, usuusuario, r.rolnombre
    FROM usuarios u
    JOIN roles r ON u.rolid = r.rolid
    WHERE u.usuusuario = p_usuario
      AND u.usucontrasena = SHA2(p_contrasena, 256)
      AND u.usuactivo = 1;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `categorias`
--

CREATE TABLE `categorias` (
  `catid` int(11) NOT NULL,
  `catnombre` varchar(100) NOT NULL,
  `catdescripcion` text DEFAULT NULL,
  `catactivo` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `categorias`
--

INSERT INTO `categorias` (`catid`, `catnombre`, `catdescripcion`, `catactivo`) VALUES
(1, 'Bebidas', NULL, 1),
(2, 'Snacks', NULL, 1),
(3, 'Lacteos', NULL, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `clientes`
--

CREATE TABLE `clientes` (
  `cliid` int(11) NOT NULL,
  `clinombre` varchar(100) NOT NULL,
  `clicidruc` varchar(20) NOT NULL,
  `clidireccion` varchar(200) DEFAULT NULL,
  `clitelefono` varchar(20) DEFAULT NULL,
  `cliemail` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `clientes`
--

INSERT INTO `clientes` (`cliid`, `clinombre`, `clicidruc`, `clidireccion`, `clitelefono`, `cliemail`) VALUES
(1, 'Consumidor Final', '9999999999999', NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `descuentos`
--

CREATE TABLE `descuentos` (
  `descid` int(11) NOT NULL,
  `descnombre` varchar(100) NOT NULL,
  `descalcance` enum('PRODUCTO','CATEGORIA') NOT NULL,
  `refid` int(11) NOT NULL,
  `descporcentaje` decimal(5,2) NOT NULL,
  `descfechainicio` date NOT NULL,
  `descfechafin` date NOT NULL,
  `descactivo` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `kardex`
--

CREATE TABLE `kardex` (
  `karid` int(11) NOT NULL,
  `prodid` int(11) NOT NULL,
  `kartipo` enum('COMPRA','VENTA','AJUSTE_ENTRADA','AJUSTE_SALIDA','DEVOLUCION','CADUCIDAD') NOT NULL,
  `karfecha` timestamp NOT NULL DEFAULT current_timestamp(),
  `karcantidad` int(11) NOT NULL,
  `karsaldo_anterior` int(11) NOT NULL,
  `karsaldo_actual` int(11) NOT NULL,
  `karref_documento` varchar(50) DEFAULT NULL,
  `karobservacion` text DEFAULT NULL,
  `usuid` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `kardex`
--

INSERT INTO `kardex` (`karid`, `prodid`, `kartipo`, `karfecha`, `karcantidad`, `karsaldo_anterior`, `karsaldo_actual`, `karref_documento`, `karobservacion`, `usuid`) VALUES
(1, 1, 'COMPRA', '2026-02-18 01:05:00', 10, 0, 10, 'COMP-000001', NULL, 1);

--
-- Disparadores `kardex`
--
DELIMITER $$
CREATE TRIGGER `trg_actualizar_stock_global` AFTER INSERT ON `kardex` FOR EACH ROW BEGIN
    IF NEW.kartipo IN ('COMPRA', 'AJUSTE_ENTRADA', 'DEVOLUCION') THEN
        UPDATE productos SET prodstock_global = prodstock_global + NEW.karcantidad
        WHERE prodid = NEW.prodid;
    ELSEIF NEW.kartipo IN ('VENTA', 'AJUSTE_SALIDA', 'CADUCIDAD') THEN
        UPDATE productos SET prodstock_global = prodstock_global - NEW.karcantidad
        WHERE prodid = NEW.prodid;
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `lotes`
--

CREATE TABLE `lotes` (
  `lotid` int(11) NOT NULL,
  `prodid` int(11) NOT NULL,
  `lotnro_lote` varchar(50) DEFAULT NULL,
  `lotfecha_vencimiento` date NOT NULL,
  `lotcantidad_inicial` int(11) NOT NULL,
  `lotcantidad_actual` int(11) NOT NULL,
  `lotcosto_compra` decimal(10,2) NOT NULL,
  `lotactivo` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `lotes`
--

INSERT INTO `lotes` (`lotid`, `prodid`, `lotnro_lote`, `lotfecha_vencimiento`, `lotcantidad_inicial`, `lotcantidad_actual`, `lotcosto_compra`, `lotactivo`) VALUES
(1, 1, '1', '2027-01-17', 10, 10, 1.00, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `productos`
--

CREATE TABLE `productos` (
  `prodid` int(11) NOT NULL,
  `catid` int(11) NOT NULL,
  `prodcodigo` varchar(50) NOT NULL,
  `prodnombre` varchar(150) NOT NULL,
  `proddescripcion` text DEFAULT NULL,
  `prodprecio_venta` decimal(10,2) NOT NULL,
  `prodtiene_iva` tinyint(1) DEFAULT 1,
  `prodstock_global` int(11) DEFAULT 0,
  `prodminimo` int(11) DEFAULT 5,
  `prodactivo` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `productos`
--

INSERT INTO `productos` (`prodid`, `catid`, `prodcodigo`, `prodnombre`, `proddescripcion`, `prodprecio_venta`, `prodtiene_iva`, `prodstock_global`, `prodminimo`, `prodactivo`) VALUES
(1, 1, '2132assdaw', 'Lejía', 'Ejemplo', 1.25, 1, 10, 5, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `producto_proveedores`
--

CREATE TABLE `producto_proveedores` (
  `ppid` int(11) NOT NULL,
  `prodid` int(11) NOT NULL,
  `provid` int(11) NOT NULL,
  `costo_referencia` decimal(10,2) DEFAULT 0.00,
  `dias_entrega` int(11) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `proveedores`
--

CREATE TABLE `proveedores` (
  `provid` int(11) NOT NULL,
  `provnombre` varchar(100) NOT NULL,
  `provruc` varchar(20) DEFAULT NULL,
  `provtelefono` varchar(20) DEFAULT NULL,
  `provdireccion` text DEFAULT NULL,
  `provactivo` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `proveedores`
--

INSERT INTO `proveedores` (`provid`, `provnombre`, `provruc`, `provtelefono`, `provdireccion`, `provactivo`) VALUES
(1, 'Ernesto Marco', '9201931', '09392983', 'Av Marco aurelio', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `roles`
--

CREATE TABLE `roles` (
  `rolid` int(11) NOT NULL,
  `rolnombre` varchar(50) NOT NULL,
  `rolactivo` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `roles`
--

INSERT INTO `roles` (`rolid`, `rolnombre`, `rolactivo`) VALUES
(1, 'Administrador', 1),
(2, 'Cajero', 1),
(3, 'Bodeguero', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `usuid` int(11) NOT NULL,
  `rolid` int(11) NOT NULL,
  `usuusuario` varchar(50) NOT NULL,
  `usucontrasena` char(64) NOT NULL,
  `usuactivo` tinyint(1) DEFAULT 1,
  `usucreacion` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`usuid`, `rolid`, `usuusuario`, `usucontrasena`, `usuactivo`, `usucreacion`) VALUES
(1, 1, 'admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 1, '2026-02-18 00:55:41');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ventas_detalle`
--

CREATE TABLE `ventas_detalle` (
  `vdetid` int(11) NOT NULL,
  `venid` int(11) NOT NULL,
  `prodid` int(11) NOT NULL,
  `lotid` int(11) DEFAULT NULL,
  `vdetcantidad` int(11) NOT NULL,
  `vdetprecio_unitario` decimal(10,2) NOT NULL,
  `vdetdescuento` decimal(10,2) DEFAULT 0.00,
  `vdetsubtotal` decimal(12,2) NOT NULL,
  `vdetimpuesto` decimal(12,2) NOT NULL,
  `vdettotal` decimal(12,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ventas_encabezado`
--

CREATE TABLE `ventas_encabezado` (
  `venid` int(11) NOT NULL,
  `usuid` int(11) NOT NULL,
  `cliid` int(11) NOT NULL,
  `vennumero_factura` varchar(20) DEFAULT NULL,
  `venfecha` timestamp NOT NULL DEFAULT current_timestamp(),
  `venestado` enum('PAGADA','ANULADA') DEFAULT 'PAGADA',
  `vensubtotal` decimal(12,2) NOT NULL,
  `venbase_imponible` decimal(12,2) NOT NULL,
  `venbase_cero` decimal(12,2) NOT NULL,
  `venporcentaje_iva` decimal(5,2) DEFAULT 15.00,
  `venmonto_iva` decimal(12,2) NOT NULL,
  `ventotal` decimal(12,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `categorias`
--
ALTER TABLE `categorias`
  ADD PRIMARY KEY (`catid`),
  ADD UNIQUE KEY `catnombre` (`catnombre`);

--
-- Indices de la tabla `clientes`
--
ALTER TABLE `clientes`
  ADD PRIMARY KEY (`cliid`),
  ADD UNIQUE KEY `clicidruc` (`clicidruc`);

--
-- Indices de la tabla `descuentos`
--
ALTER TABLE `descuentos`
  ADD PRIMARY KEY (`descid`);

--
-- Indices de la tabla `kardex`
--
ALTER TABLE `kardex`
  ADD PRIMARY KEY (`karid`),
  ADD KEY `prodid` (`prodid`),
  ADD KEY `usuid` (`usuid`);

--
-- Indices de la tabla `lotes`
--
ALTER TABLE `lotes`
  ADD PRIMARY KEY (`lotid`),
  ADD KEY `prodid` (`prodid`);

--
-- Indices de la tabla `productos`
--
ALTER TABLE `productos`
  ADD PRIMARY KEY (`prodid`),
  ADD UNIQUE KEY `prodcodigo` (`prodcodigo`),
  ADD KEY `catid` (`catid`);

--
-- Indices de la tabla `producto_proveedores`
--
ALTER TABLE `producto_proveedores`
  ADD PRIMARY KEY (`ppid`),
  ADD KEY `prodid` (`prodid`),
  ADD KEY `provid` (`provid`);

--
-- Indices de la tabla `proveedores`
--
ALTER TABLE `proveedores`
  ADD PRIMARY KEY (`provid`),
  ADD UNIQUE KEY `provruc` (`provruc`);

--
-- Indices de la tabla `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`rolid`),
  ADD UNIQUE KEY `rolnombre` (`rolnombre`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`usuid`),
  ADD UNIQUE KEY `usuusuario` (`usuusuario`),
  ADD KEY `rolid` (`rolid`);

--
-- Indices de la tabla `ventas_detalle`
--
ALTER TABLE `ventas_detalle`
  ADD PRIMARY KEY (`vdetid`),
  ADD KEY `venid` (`venid`),
  ADD KEY `prodid` (`prodid`);

--
-- Indices de la tabla `ventas_encabezado`
--
ALTER TABLE `ventas_encabezado`
  ADD PRIMARY KEY (`venid`),
  ADD UNIQUE KEY `vennumero_factura` (`vennumero_factura`),
  ADD KEY `usuid` (`usuid`),
  ADD KEY `cliid` (`cliid`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `categorias`
--
ALTER TABLE `categorias`
  MODIFY `catid` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `clientes`
--
ALTER TABLE `clientes`
  MODIFY `cliid` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `descuentos`
--
ALTER TABLE `descuentos`
  MODIFY `descid` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `kardex`
--
ALTER TABLE `kardex`
  MODIFY `karid` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `lotes`
--
ALTER TABLE `lotes`
  MODIFY `lotid` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `productos`
--
ALTER TABLE `productos`
  MODIFY `prodid` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `producto_proveedores`
--
ALTER TABLE `producto_proveedores`
  MODIFY `ppid` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `proveedores`
--
ALTER TABLE `proveedores`
  MODIFY `provid` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `roles`
--
ALTER TABLE `roles`
  MODIFY `rolid` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `usuid` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `ventas_detalle`
--
ALTER TABLE `ventas_detalle`
  MODIFY `vdetid` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `ventas_encabezado`
--
ALTER TABLE `ventas_encabezado`
  MODIFY `venid` int(11) NOT NULL AUTO_INCREMENT;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `kardex`
--
ALTER TABLE `kardex`
  ADD CONSTRAINT `kardex_ibfk_1` FOREIGN KEY (`prodid`) REFERENCES `productos` (`prodid`),
  ADD CONSTRAINT `kardex_ibfk_2` FOREIGN KEY (`usuid`) REFERENCES `usuarios` (`usuid`);

--
-- Filtros para la tabla `lotes`
--
ALTER TABLE `lotes`
  ADD CONSTRAINT `lotes_ibfk_1` FOREIGN KEY (`prodid`) REFERENCES `productos` (`prodid`);

--
-- Filtros para la tabla `productos`
--
ALTER TABLE `productos`
  ADD CONSTRAINT `productos_ibfk_1` FOREIGN KEY (`catid`) REFERENCES `categorias` (`catid`);

--
-- Filtros para la tabla `producto_proveedores`
--
ALTER TABLE `producto_proveedores`
  ADD CONSTRAINT `producto_proveedores_ibfk_1` FOREIGN KEY (`prodid`) REFERENCES `productos` (`prodid`),
  ADD CONSTRAINT `producto_proveedores_ibfk_2` FOREIGN KEY (`provid`) REFERENCES `proveedores` (`provid`);

--
-- Filtros para la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD CONSTRAINT `usuarios_ibfk_1` FOREIGN KEY (`rolid`) REFERENCES `roles` (`rolid`);

--
-- Filtros para la tabla `ventas_detalle`
--
ALTER TABLE `ventas_detalle`
  ADD CONSTRAINT `ventas_detalle_ibfk_1` FOREIGN KEY (`venid`) REFERENCES `ventas_encabezado` (`venid`),
  ADD CONSTRAINT `ventas_detalle_ibfk_2` FOREIGN KEY (`prodid`) REFERENCES `productos` (`prodid`);

--
-- Filtros para la tabla `ventas_encabezado`
--
ALTER TABLE `ventas_encabezado`
  ADD CONSTRAINT `ventas_encabezado_ibfk_1` FOREIGN KEY (`usuid`) REFERENCES `usuarios` (`usuid`),
  ADD CONSTRAINT `ventas_encabezado_ibfk_2` FOREIGN KEY (`cliid`) REFERENCES `clientes` (`cliid`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
