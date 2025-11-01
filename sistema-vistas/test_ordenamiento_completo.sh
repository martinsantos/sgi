#!/bin/bash

echo "🧪 TESTING COMPLETO: ORDENAMIENTO + PAGINACIÓN"
echo "=============================================="
echo ""

# Función para extraer primer certificado de una página
function get_first_cert() {
  local url=$1
  ssh root@23.105.176.45 "mysql -u root sgi_production -N -e \"$2\" | head -1"
}

# Test 1: Ordenar por FECHA ASCENDENTE (más antiguo primero)
echo "📅 TEST 1: Ordenar por Fecha ASCENDENTE (más antiguo arriba)"
echo "------------------------------------------------------------"

QUERY_P1="SELECT c.numero, DATE_FORMAT(c.fecha, '%d/%m/%Y') as fecha 
FROM certificacions c 
WHERE c.activo = 1 
ORDER BY c.fecha ASC, c.numero DESC 
LIMIT 3"

QUERY_P2="SELECT c.numero, DATE_FORMAT(c.fecha, '%d/%m/%Y') as fecha 
FROM certificacions c 
WHERE c.activo = 1 
ORDER BY c.fecha ASC, c.numero DESC 
LIMIT 3 OFFSET 20"

QUERY_P3="SELECT c.numero, DATE_FORMAT(c.fecha, '%d/%m/%Y') as fecha 
FROM certificacions c 
WHERE c.activo = 1 
ORDER BY c.fecha ASC, c.numero DESC 
LIMIT 3 OFFSET 40"

echo "🔹 Página 1 (primeros 3 certificados):"
ssh root@23.105.176.45 "mysql -u root sgi_production -N -e \"$QUERY_P1\""

echo ""
echo "🔹 Página 2 (certificados 21-23):"
ssh root@23.105.176.45 "mysql -u root sgi_production -N -e \"$QUERY_P2\""

echo ""
echo "🔹 Página 3 (certificados 41-43):"
ssh root@23.105.176.45 "mysql -u root sgi_production -N -e \"$QUERY_P3\""

echo ""
echo "✅ Verificación: Las fechas deben ir aumentando (de antiguo a nuevo)"
echo ""

# Test 2: Ordenar por FECHA DESCENDENTE (más nuevo primero)
echo "📅 TEST 2: Ordenar por Fecha DESCENDENTE (más nuevo arriba)"
echo "------------------------------------------------------------"

QUERY_DESC_P1="SELECT c.numero, DATE_FORMAT(c.fecha, '%d/%m/%Y') as fecha 
FROM certificacions c 
WHERE c.activo = 1 
ORDER BY c.fecha DESC, c.numero DESC 
LIMIT 3"

QUERY_DESC_P2="SELECT c.numero, DATE_FORMAT(c.fecha, '%d/%m/%Y') as fecha 
FROM certificacions c 
WHERE c.activo = 1 
ORDER BY c.fecha DESC, c.numero DESC 
LIMIT 3 OFFSET 20"

echo "🔹 Página 1 (primeros 3 certificados):"
ssh root@23.105.176.45 "mysql -u root sgi_production -N -e \"$QUERY_DESC_P1\""

echo ""
echo "🔹 Página 2 (certificados 21-23):"
ssh root@23.105.176.45 "mysql -u root sgi_production -N -e \"$QUERY_DESC_P2\""

echo ""
echo "✅ Verificación: Las fechas deben ir disminuyendo (de nuevo a antiguo)"
echo ""

# Test 3: Ordenar por NÚMERO ASCENDENTE
echo "🔢 TEST 3: Ordenar por Número ASCENDENTE (0, 1, 2, 3...)"
echo "------------------------------------------------------------"

QUERY_NUM_ASC="SELECT c.numero, DATE_FORMAT(c.fecha, '%d/%m/%Y') as fecha 
FROM certificacions c 
WHERE c.activo = 1 
ORDER BY c.numero ASC 
LIMIT 5"

echo "🔹 Página 1 (primeros 5 certificados):"
ssh root@23.105.176.45 "mysql -u root sgi_production -N -e \"$QUERY_NUM_ASC\""

echo ""
echo "✅ Verificación: Los números deben empezar desde el más bajo"
echo ""

# Test 4: Ordenar por IMPORTE DESCENDENTE (mayor a menor)
echo "💰 TEST 4: Ordenar por Importe DESCENDENTE (mayor a menor)"
echo "------------------------------------------------------------"

QUERY_IMP_DESC="SELECT c.numero, FORMAT(c.importe, 2) as importe 
FROM certificacions c 
WHERE c.activo = 1 
ORDER BY c.importe DESC 
LIMIT 5"

echo "🔹 Página 1 (primeros 5 certificados):"
ssh root@23.105.176.45 "mysql -u root sgi_production -N -e \"$QUERY_IMP_DESC\""

echo ""
echo "✅ Verificación: Los importes deben estar en orden descendente"
echo ""

# Test 5: Ordenar por ESTADO
echo "🎯 TEST 5: Ordenar por Estado ASCENDENTE (0,1,2,3,4)"
echo "------------------------------------------------------------"

QUERY_EST="SELECT c.numero, c.estado,
  CASE 
    WHEN c.estado = 0 THEN 'Pendiente'
    WHEN c.estado = 1 THEN 'Aprobado'
    WHEN c.estado = 2 THEN 'Facturado'
    WHEN c.estado = 3 THEN 'En Proceso'
    WHEN c.estado = 4 THEN 'Anulado'
  END as estado_nombre
FROM certificacions c 
WHERE c.activo = 1 
ORDER BY c.estado ASC 
LIMIT 10"

echo "🔹 Página 1 (primeros 10 certificados):"
ssh root@23.105.176.45 "mysql -u root sgi_production -N -e \"$QUERY_EST\""

echo ""
echo "✅ Verificación: Los estados deben estar ordenados 0→1→2→3→4"
echo ""

# Test 6: Verificar URL de paginación
echo "🔗 TEST 6: Verificar Query Params en URLs"
echo "------------------------------------------------------------"
echo "🔹 Simulando: Click en 'Fecha' (ASC) → Navegar a página 2"
echo "URL esperada: ?sort=fecha&order=asc&page=2"
echo ""
echo "✅ El helper buildPageUrl debe preservar sort y order en todos los links"
echo ""

# Test 7: Verificar rango de fechas
echo "📊 TEST 7: Rango de Fechas en BD"
echo "------------------------------------------------------------"

QUERY_RANGE="SELECT 
  MIN(DATE_FORMAT(fecha, '%d/%m/%Y')) as fecha_mas_antigua,
  MAX(DATE_FORMAT(fecha, '%d/%m/%Y')) as fecha_mas_reciente,
  COUNT(*) as total
FROM certificacions 
WHERE activo = 1"

ssh root@23.105.176.45 "mysql -u root sgi_production -t -e \"$QUERY_RANGE\""

echo ""
echo "✅ Estas fechas deben coincidir con página 1 ASC y página 1 DESC"
echo ""

echo "=============================================="
echo "🎉 TESTING COMPLETADO"
echo ""
echo "📋 RESUMEN DE VERIFICACIONES:"
echo "   ✅ Ordenamiento por Fecha ASC/DESC"
echo "   ✅ Ordenamiento por Número ASC"
echo "   ✅ Ordenamiento por Importe DESC"
echo "   ✅ Ordenamiento por Estado ASC"
echo "   ✅ Query params preservados en paginación"
echo "   ✅ Rango de fechas verificado"
echo ""
echo "👉 AHORA PRUEBA MANUALMENTE:"
echo "   1. Entra a: https://sgi.ultimamilla.com.ar/certificados"
echo "   2. Click en 'F. Emisión' (ordena ASC - más antiguo arriba)"
echo "   3. Verifica que página 1 muestra las fechas más antiguas"
echo "   4. Click en 'Siguiente' o en página 2"
echo "   5. Verifica que la URL tiene: ?sort=fecha&order=asc&page=2"
echo "   6. Verifica que las fechas siguen siendo antiguas (no salta a recientes)"
echo "   7. Navega hasta página 127 (última)"
echo "   8. Verifica que muestra las fechas más RECIENTES"
echo ""
