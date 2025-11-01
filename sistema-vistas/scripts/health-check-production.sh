#!/bin/bash

# ============================================================================
# HEALTH CHECK COMPLETO - WEBAPP SGI EN PRODUCCIÓN
# ============================================================================
# Ejecuta verificaciones exhaustivas de salud contra el servidor en producción
# Servidor: 23.105.176.45:3456
# ============================================================================

set -e

SERVER="https://sgi.ultimamilla.com.ar"
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
REPORT_FILE="/tmp/health-check-report-$(date +%Y%m%d-%H%M%S).txt"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Contadores
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# Función para hacer requests y verificar
check_endpoint() {
    local name="$1"
    local url="$2"
    local expected_codes="$3"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    echo -n "  Testing: $name ... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" -L --max-time 10 "$url" 2>/dev/null || echo "000")
    
    if echo "$expected_codes" | grep -q "$response"; then
        echo -e "${GREEN}✓ OK${NC} (HTTP $response)"
        echo "✓ $name - HTTP $response" >> "$REPORT_FILE"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $response, expected: $expected_codes)"
        echo "✗ $name - HTTP $response (expected: $expected_codes)" >> "$REPORT_FILE"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

# Iniciar reporte
echo "============================================================================" > "$REPORT_FILE"
echo "HEALTH CHECK REPORT - SGI WEBAPP" >> "$REPORT_FILE"
echo "Timestamp: $TIMESTAMP" >> "$REPORT_FILE"
echo "Server: $SERVER" >> "$REPORT_FILE"
echo "============================================================================" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "============================================================================"
echo "🏥 HEALTH CHECK COMPLETO - WEBAPP SGI"
echo "============================================================================"
echo "Servidor: $SERVER"
echo "Timestamp: $TIMESTAMP"
echo "============================================================================"
echo ""

# ============================================================================
# 1. MÓDULO DASHBOARD
# ============================================================================
echo -e "${BLUE}1️⃣  MÓDULO DASHBOARD${NC}"
echo "1. MÓDULO DASHBOARD" >> "$REPORT_FILE"

check_endpoint "Dashboard principal" "$SERVER/dashboard" "200 302"
check_endpoint "Estadísticas del sistema" "$SERVER/api/dashboard/estadisticas" "200 302 404"
check_endpoint "Métricas de ventas" "$SERVER/api/dashboard/metricas/ventas" "200 302 404"
check_endpoint "Métricas de proyectos" "$SERVER/api/dashboard/metricas/proyectos" "200 302 404"
check_endpoint "Métricas financieras" "$SERVER/api/dashboard/metricas/financiero" "200 302 404"
echo ""

# ============================================================================
# 2. MÓDULO CLIENTES
# ============================================================================
echo -e "${BLUE}2️⃣  MÓDULO CLIENTES${NC}"
echo "2. MÓDULO CLIENTES" >> "$REPORT_FILE"

check_endpoint "Listado de clientes" "$SERVER/clientes" "200 302"
check_endpoint "Paginación de clientes" "$SERVER/clientes?page=1&limit=20" "200 302"
check_endpoint "Búsqueda de clientes" "$SERVER/clientes?search=test" "200 302"
check_endpoint "API clientes" "$SERVER/api/clientes" "200 302 404"
check_endpoint "Formulario nuevo cliente" "$SERVER/clientes/nuevo" "200 302"
echo ""

# ============================================================================
# 3. MÓDULO FACTURAS
# ============================================================================
echo -e "${BLUE}3️⃣  MÓDULO FACTURAS${NC}"
echo "3. MÓDULO FACTURAS" >> "$REPORT_FILE"

check_endpoint "Dashboard de facturación" "$SERVER/facturas/dashboard" "200 302 404"
check_endpoint "Facturas emitidas" "$SERVER/facturas/emitidas" "200 302"
check_endpoint "Facturas recibidas" "$SERVER/facturas/recibidas" "200 302 404"
check_endpoint "Nueva factura emitida" "$SERVER/facturas/nueva" "200 302"
check_endpoint "Nueva factura recibida" "$SERVER/facturas/nueva-recibida" "200 302"
check_endpoint "API facturas emitidas" "$SERVER/api/facturas/emitidas" "200 302 404"
check_endpoint "API facturas recibidas" "$SERVER/api/facturas/recibidas" "200 302 404"
echo ""

# ============================================================================
# 4. MÓDULO PRESUPUESTOS
# ============================================================================
echo -e "${BLUE}4️⃣  MÓDULO PRESUPUESTOS${NC}"
echo "4. MÓDULO PRESUPUESTOS" >> "$REPORT_FILE"

check_endpoint "Listado de presupuestos" "$SERVER/presupuestos" "200 302"
check_endpoint "Nuevo presupuesto" "$SERVER/presupuestos/nuevo" "200 302"
check_endpoint "API presupuestos" "$SERVER/api/presupuestos" "200 302 404"
check_endpoint "Búsqueda de presupuestos" "$SERVER/presupuestos?search=test" "200 302"
check_endpoint "Filtro por estado" "$SERVER/presupuestos?estado=pendiente" "200 302"
echo ""

# ============================================================================
# 5. MÓDULO PROYECTOS
# ============================================================================
echo -e "${BLUE}5️⃣  MÓDULO PROYECTOS${NC}"
echo "5. MÓDULO PROYECTOS" >> "$REPORT_FILE"

check_endpoint "Listado de proyectos" "$SERVER/proyectos" "200 302"
check_endpoint "Dashboard de proyectos" "$SERVER/proyectos/dashboard" "200 302 404"
check_endpoint "Nuevo proyecto" "$SERVER/proyectos/nuevo" "200 302"
check_endpoint "API proyectos" "$SERVER/api/proyectos" "200 302 404"
check_endpoint "Búsqueda de proyectos" "$SERVER/proyectos/buscar" "200 302"
echo ""

# ============================================================================
# 6. MÓDULO LEADS
# ============================================================================
echo -e "${BLUE}6️⃣  MÓDULO LEADS${NC}"
echo "6. MÓDULO LEADS" >> "$REPORT_FILE"

check_endpoint "Listado de leads" "$SERVER/leads" "200 302"
check_endpoint "API leads" "$SERVER/api/leads" "200 302 404"
check_endpoint "Estadísticas de leads" "$SERVER/api/leads/estadisticas" "200 302 404"
echo ""

# ============================================================================
# 7. MÓDULO CERTIFICADOS
# ============================================================================
echo -e "${BLUE}7️⃣  MÓDULO CERTIFICADOS${NC}"
echo "7. MÓDULO CERTIFICADOS" >> "$REPORT_FILE"

check_endpoint "Listado de certificados" "$SERVER/certificados" "200 302"
check_endpoint "API certificados" "$SERVER/api/certificados" "200 302 404"
check_endpoint "Estadísticas de certificados" "$SERVER/api/certificados/estadisticas" "200 302 404"
echo ""

# ============================================================================
# 8. HEALTH CHECK ENDPOINTS
# ============================================================================
echo -e "${BLUE}8️⃣  HEALTH CHECK ENDPOINTS${NC}"
echo "8. HEALTH CHECK ENDPOINTS" >> "$REPORT_FILE"

check_endpoint "Health check básico" "$SERVER/health" "200 404"
check_endpoint "Health check API" "$SERVER/api/health" "200 404"
check_endpoint "Database health" "$SERVER/api/health/database" "200 404 500"
echo ""

# ============================================================================
# 9. AUTENTICACIÓN
# ============================================================================
echo -e "${BLUE}9️⃣  MÓDULO AUTENTICACIÓN${NC}"
echo "9. MÓDULO AUTENTICACIÓN" >> "$REPORT_FILE"

check_endpoint "Login page" "$SERVER/auth/login" "200"
check_endpoint "Protección de rutas" "$SERVER/dashboard" "200 302 401"
echo ""

# ============================================================================
# 10. ARCHIVOS ESTÁTICOS
# ============================================================================
echo -e "${BLUE}🔟 ARCHIVOS ESTÁTICOS${NC}"
echo "10. ARCHIVOS ESTÁTICOS" >> "$REPORT_FILE"

check_endpoint "CSS assets" "$SERVER/css/main.css" "200 404"
check_endpoint "JS assets" "$SERVER/js/main.js" "200 404"
check_endpoint "Favicon" "$SERVER/favicon.ico" "200 404"
echo ""

# ============================================================================
# 11. PERFORMANCE
# ============================================================================
echo -e "${BLUE}1️⃣1️⃣  PERFORMANCE CHECKS${NC}"
echo "11. PERFORMANCE CHECKS" >> "$REPORT_FILE"

echo -n "  Testing: Response time dashboard ... "
start_time=$(date +%s%3N)
curl -s -o /dev/null -L --max-time 10 "$SERVER/dashboard" 2>/dev/null
end_time=$(date +%s%3N)
response_time=$((end_time - start_time))

if [ $response_time -lt 3000 ]; then
    echo -e "${GREEN}✓ OK${NC} (${response_time}ms)"
    echo "✓ Response time: ${response_time}ms" >> "$REPORT_FILE"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${YELLOW}⚠ SLOW${NC} (${response_time}ms)"
    echo "⚠ Response time: ${response_time}ms (>3000ms)" >> "$REPORT_FILE"
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
echo ""

# ============================================================================
# RESUMEN FINAL
# ============================================================================
echo "============================================================================"
echo -e "${BLUE}📊 RESUMEN FINAL${NC}"
echo "============================================================================"
echo "Total checks: $TOTAL_CHECKS"
echo -e "Passed: ${GREEN}$PASSED_CHECKS${NC}"
echo -e "Failed: ${RED}$FAILED_CHECKS${NC}"

success_rate=$(awk "BEGIN {printf \"%.2f\", ($PASSED_CHECKS/$TOTAL_CHECKS)*100}")
echo "Success rate: $success_rate%"
echo ""

# Escribir resumen al reporte
echo "" >> "$REPORT_FILE"
echo "============================================================================" >> "$REPORT_FILE"
echo "RESUMEN FINAL" >> "$REPORT_FILE"
echo "============================================================================" >> "$REPORT_FILE"
echo "Total checks: $TOTAL_CHECKS" >> "$REPORT_FILE"
echo "Passed: $PASSED_CHECKS" >> "$REPORT_FILE"
echo "Failed: $FAILED_CHECKS" >> "$REPORT_FILE"
echo "Success rate: $success_rate%" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Determinar estado general
if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${GREEN}✅ ESTADO: SISTEMA SALUDABLE${NC}"
    echo "✅ ESTADO: SISTEMA SALUDABLE" >> "$REPORT_FILE"
    exit_code=0
elif [ $FAILED_CHECKS -lt 5 ]; then
    echo -e "${YELLOW}⚠️  ESTADO: ADVERTENCIAS MENORES${NC}"
    echo "⚠️  ESTADO: ADVERTENCIAS MENORES" >> "$REPORT_FILE"
    exit_code=0
else
    echo -e "${RED}❌ ESTADO: PROBLEMAS CRÍTICOS${NC}"
    echo "❌ ESTADO: PROBLEMAS CRÍTICOS" >> "$REPORT_FILE"
    exit_code=1
fi

echo ""
echo "📄 Reporte guardado en: $REPORT_FILE"
echo "============================================================================"

exit $exit_code
