#!/bin/bash

# Script de despliegue seguro para sistema de adjuntos - V2
# Usa credenciales correctas de producción

set -e

echo "🔒 DESPLIEGUE SEGURO - SISTEMA DE ADJUNTOS (V2)"
echo "=============================================="
echo ""

REMOTE_USER="root"
REMOTE_HOST="23.105.176.45"
REMOTE_PASSWORD="gsiB%s@0yD"
REMOTE_PATH="/home/sgi.ultimamilla.com.ar"
LOCAL_PATH="/Volumes/SDTERA/ultima milla/2025/SGI/sistema-vistas"

# Credenciales de BD (desde .env en producción)
DB_USER="sgi_user"
DB_PASS="SgiProd2025Secure_"
DB_NAME="sgi_production"
DB_HOST="127.0.0.1"

echo "📋 PASO 1: Verificar conexión a servidor..."
sshpass -p "$REMOTE_PASSWORD" ssh -o StrictHostKeyChecking=no $REMOTE_USER@$REMOTE_HOST "echo '✅ Conexión exitosa'" || exit 1

echo ""
echo "📋 PASO 2: Crear tabla de adjuntos en BD..."
sshpass -p "$REMOTE_PASSWORD" ssh -o StrictHostKeyChecking=no $REMOTE_USER@$REMOTE_HOST "mysql -h $DB_HOST -u $DB_USER -p'$DB_PASS' $DB_NAME << 'EOF'
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
  
  INDEX idx_factura_venta (factura_venta_id),
  INDEX idx_factura_compra (factura_compra_id),
  INDEX idx_fecha_subida (fecha_subida)
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
  INDEX idx_fecha (fecha_descarga)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Tablas creadas exitosamente' as status;
EOF
" || { echo "❌ Error al crear tablas"; exit 1; }

echo "✅ Tablas creadas en BD"

echo ""
echo "📋 PASO 3: Crear directorio de uploads..."
sshpass -p "$REMOTE_PASSWORD" ssh -o StrictHostKeyChecking=no $REMOTE_USER@$REMOTE_HOST "mkdir -p $REMOTE_PATH/uploads/facturas && chmod 755 $REMOTE_PATH/uploads/facturas && echo '✅ Directorio creado'" || exit 1

echo ""
echo "📋 PASO 4: Desplegar archivos de modelo y controlador..."
sshpass -p "$REMOTE_PASSWORD" scp -o StrictHostKeyChecking=no \
  "$LOCAL_PATH/src/models/FacturaAdjuntoModel.js" \
  "$LOCAL_PATH/src/controllers/facturaAdjuntoController.js" \
  "$LOCAL_PATH/src/routes/facturaAdjuntos.js" \
  $REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/src/ 2>/dev/null || { echo "❌ Error al copiar archivos"; exit 1; }

echo "✅ Archivos de modelo y controlador desplegados"

echo ""
echo "📋 PASO 5: Actualizar app.js..."
sshpass -p "$REMOTE_PASSWORD" scp -o StrictHostKeyChecking=no \
  "$LOCAL_PATH/src/app.js" \
  $REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/src/ 2>/dev/null || { echo "❌ Error al copiar app.js"; exit 1; }

echo "✅ app.js actualizado"

echo ""
echo "📋 PASO 6: Reiniciar PM2..."
sshpass -p "$REMOTE_PASSWORD" ssh -o StrictHostKeyChecking=no $REMOTE_USER@$REMOTE_HOST "cd $REMOTE_PATH && pm2 restart sgi && sleep 3" || { echo "❌ Error al reiniciar PM2"; exit 1; }

echo "✅ PM2 reiniciado"

echo ""
echo "📋 PASO 7: Verificar estado..."
sshpass -p "$REMOTE_PASSWORD" ssh -o StrictHostKeyChecking=no $REMOTE_USER@$REMOTE_HOST "pm2 list | grep sgi" || { echo "❌ Error al verificar estado"; exit 1; }

echo ""
echo "📋 PASO 8: Verificar tablas creadas..."
sshpass -p "$REMOTE_PASSWORD" ssh -o StrictHostKeyChecking=no $REMOTE_USER@$REMOTE_HOST "mysql -h $DB_HOST -u $DB_USER -p'$DB_PASS' $DB_NAME -e 'SHOW TABLES LIKE \"factura_adjuntos%\";'" || { echo "⚠️  Advertencia: No se pudo verificar tablas"; }

echo ""
echo "✅ DESPLIEGUE COMPLETADO EXITOSAMENTE"
echo "=============================================="
echo ""
echo "📌 Próximos pasos:"
echo "1. Verificar https://sgi.ultimamilla.com.ar/facturas/emitidas"
echo "2. Verificar logs: pm2 logs sgi"
echo "3. Las tablas están creadas y listas para usar"
