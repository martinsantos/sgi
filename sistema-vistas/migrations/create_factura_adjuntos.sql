-- Tabla para adjuntos de facturas (emitidas y recibidas)
CREATE TABLE IF NOT EXISTS factura_adjuntos (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  factura_venta_id VARCHAR(36),
  factura_compra_id VARCHAR(36),
  nombre_archivo VARCHAR(255) NOT NULL,
  ruta_archivo VARCHAR(500) NOT NULL,
  tipo_archivo VARCHAR(50),
  tamaño_bytes INT,
  descripcion TEXT,
  subido_por VARCHAR(36),
  fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  activo TINYINT(1) DEFAULT 1,
  
  -- Índices
  INDEX idx_factura_venta (factura_venta_id),
  INDEX idx_factura_compra (factura_compra_id),
  INDEX idx_fecha_subida (fecha_subida),
  
  -- Relaciones (opcional, si las tablas existen)
  CONSTRAINT fk_factura_venta FOREIGN KEY (factura_venta_id) 
    REFERENCES factura_ventas(id) ON DELETE CASCADE,
  CONSTRAINT fk_factura_compra FOREIGN KEY (factura_compra_id) 
    REFERENCES factura_compras(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla para auditoría de descargas de adjuntos
CREATE TABLE IF NOT EXISTS factura_adjuntos_descargas (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  adjunto_id VARCHAR(36) NOT NULL,
  usuario_id VARCHAR(36),
  fecha_descarga TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  
  INDEX idx_adjunto (adjunto_id),
  INDEX idx_usuario (usuario_id),
  INDEX idx_fecha (fecha_descarga),
  
  CONSTRAINT fk_adjunto FOREIGN KEY (adjunto_id) 
    REFERENCES factura_adjuntos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
