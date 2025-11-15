#!/bin/bash

# Script de testing para sistema de adjuntos
# Ejecutar: bash test-adjuntos.sh

echo "🧪 TESTING SISTEMA DE ADJUNTOS"
echo "=============================="
echo ""

REMOTE_HOST="23.105.176.45"
REMOTE_USER="root"
REMOTE_PASSWORD="gsiB%s@0yD"
REMOTE_PATH="/home/sgi.ultimamilla.com.ar"

echo "📋 TEST 1: Verificar que tablas existen en BD..."
sshpass -p "$REMOTE_PASSWORD" ssh -o StrictHostKeyChecking=no $REMOTE_USER@$REMOTE_HOST "mysql -h 127.0.0.1 -u sgi_user -p'SgiProd2025Secure_' sgi_production -e 'SELECT COUNT(*) as total_tables FROM information_schema.tables WHERE table_schema=\"sgi_production\" AND table_name LIKE \"factura_adjuntos%\";'" && echo "✅ Tablas existen" || echo "❌ Error al verificar tablas"

echo ""
echo "📋 TEST 2: Verificar que directorio de uploads existe..."
sshpass -p "$REMOTE_PASSWORD" ssh -o StrictHostKeyChecking=no $REMOTE_USER@$REMOTE_HOST "ls -la $REMOTE_PATH/uploads/facturas/ && echo '✅ Directorio existe'" || echo "❌ Directorio no existe"

echo ""
echo "📋 TEST 3: Verificar que archivos están en producción..."
sshpass -p "$REMOTE_PASSWORD" ssh -o StrictHostKeyChecking=no $REMOTE_USER@$REMOTE_HOST "ls -la $REMOTE_PATH/src/models/FacturaAdjuntoModel.js $REMOTE_PATH/src/controllers/facturaAdjuntoController.js $REMOTE_PATH/src/routes/facturaAdjuntos.js && echo '✅ Archivos presentes'" || echo "❌ Archivos faltantes"

echo ""
echo "📋 TEST 4: Verificar que vistas están actualizadas..."
sshpass -p "$REMOTE_PASSWORD" ssh -o StrictHostKeyChecking=no $REMOTE_USER@$REMOTE_HOST "grep -q 'adjuntosContainer' $REMOTE_PATH/src/views/facturas/detail.handlebars && echo '✅ Vista detail.handlebars actualizada'" || echo "❌ Vista detail.handlebars no actualizada"

sshpass -p "$REMOTE_PASSWORD" ssh -o StrictHostKeyChecking=no $REMOTE_USER@$REMOTE_HOST "grep -q 'adjuntosContainerRecibida' $REMOTE_PATH/src/views/facturas/recibidas-detalle.handlebars && echo '✅ Vista recibidas-detalle.handlebars actualizada'" || echo "❌ Vista recibidas-detalle.handlebars no actualizada"

echo ""
echo "📋 TEST 5: Verificar que PM2 está online..."
sshpass -p "$REMOTE_PASSWORD" ssh -o StrictHostKeyChecking=no $REMOTE_USER@$REMOTE_HOST "pm2 list | grep -q 'sgi.*online' && echo '✅ PM2 online'" || echo "❌ PM2 no está online"

echo ""
echo "📋 TEST 6: Verificar que servidor responde..."
RESPONSE=$(sshpass -p "$REMOTE_PASSWORD" ssh -o StrictHostKeyChecking=no $REMOTE_USER@$REMOTE_HOST "curl -s -I http://localhost:3456/facturas/emitidas 2>&1 | head -1")
if [[ $RESPONSE == *"302"* ]] || [[ $RESPONSE == *"200"* ]]; then
    echo "✅ Servidor responde correctamente"
else
    echo "❌ Servidor no responde: $RESPONSE"
fi

echo ""
echo "📋 TEST 7: Verificar logs de PM2..."
sshpass -p "$REMOTE_PASSWORD" ssh -o StrictHostKeyChecking=no $REMOTE_USER@$REMOTE_HOST "pm2 logs sgi --lines 5 --nostream | tail -10" && echo "✅ Logs accesibles" || echo "❌ Error al leer logs"

echo ""
echo "📋 TEST 8: Verificar que rutas están registradas..."
sshpass -p "$REMOTE_PASSWORD" ssh -o StrictHostKeyChecking=no $REMOTE_USER@$REMOTE_HOST "grep -q 'facturaAdjuntos' $REMOTE_PATH/src/app.js && echo '✅ Rutas registradas en app.js'" || echo "❌ Rutas no registradas"

echo ""
echo "=============================="
echo "✅ TESTING COMPLETADO"
echo "=============================="
echo ""
echo "📌 Próximos pasos de verificación manual:"
echo "1. Ir a https://sgi.ultimamilla.com.ar/facturas/emitidas"
echo "2. Hacer click en una factura para ver el detalle"
echo "3. Verificar que aparece la sección 'Adjuntos'"
echo "4. Hacer click en 'Agregar Adjunto'"
echo "5. Seleccionar un archivo PDF o imagen"
echo "6. Verificar que se sube correctamente"
echo "7. Verificar que aparece en la lista"
echo "8. Hacer click en descargar"
echo "9. Hacer click en eliminar"
echo "10. Repetir para facturas recibidas"
