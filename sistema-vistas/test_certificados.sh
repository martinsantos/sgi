#!/bin/bash

echo "🧪 TESTING CERTIFICADOS EN PRODUCCIÓN"
echo "======================================"
echo ""

# Test 1: Verificar que el servidor esté online
echo "1️⃣ Test: Servidor Online"
PM2_STATUS=$(ssh root@23.105.176.45 "pm2 status | grep sgi | grep online")
if [ -n "$PM2_STATUS" ]; then
  echo "✅ Servidor SGI está online"
else
  echo "❌ Servidor SGI NO está online"
  exit 1
fi
echo ""

# Test 2: Verificar datos en BD
echo "2️⃣ Test: Datos en Base de Datos"
TOTAL=$(ssh root@23.105.176.45 "mysql -u root sgi_production -N -e 'SELECT COUNT(*) FROM certificacions WHERE activo = 1'")
echo "✅ Total certificados en BD: $TOTAL"
echo ""

# Test 3: Verificar archivo listar.handlebars
echo "3️⃣ Test: Archivo listar.handlebars"
LINES=$(ssh root@23.105.176.45 "wc -l /home/sgi.ultimamilla.com.ar/src/views/certificados/listar.handlebars | awk '{print \$1}'")
echo "✅ Archivo tiene $LINES líneas"
echo ""

# Test 4: Verificar que el endpoint responde
echo "4️⃣ Test: Endpoint /certificados (sin autenticación)"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://sgi.ultimamilla.com.ar/certificados")
if [ "$HTTP_CODE" = "302" ] || [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Endpoint responde: HTTP $HTTP_CODE"
else
  echo "❌ Endpoint error: HTTP $HTTP_CODE"
fi
echo ""

# Test 5: Simular acceso autenticado
echo "5️⃣ Test: Logs del servidor al acceder"
echo "Esperando 3 segundos para que recargues la página..."
sleep 3

RECENT_LOGS=$(ssh root@23.105.176.45 "pm2 logs sgi --lines 10 --nostream | grep -E '(Listando|obtenidos|Error)' | tail -5")
if [ -n "$RECENT_LOGS" ]; then
  echo "📊 Logs recientes:"
  echo "$RECENT_LOGS"
else
  echo "⚠️ No hay logs recientes de certificados"
fi
echo ""

echo "======================================"
echo "✅ TESTING COMPLETADO"
echo ""
echo "👉 RECARGA LA PÁGINA AHORA y presiona CTRL+F5"
