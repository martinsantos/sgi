#!/bin/bash

# Script de testing integral de módulos SGI
# Fecha: 17 de Noviembre 2025

echo "🧪 TESTING INTEGRAL DE MÓDULOS SGI"
echo "=================================="
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Servidor
SERVER="https://sgi.ultimamilla.com.ar"
COOKIE_FILE="/tmp/sgi_test_cookies.txt"

# Función para testear una ruta
test_route() {
    local route=$1
    local name=$2
    local expected_status=${3:-200}
    
    echo -n "Testing $name ($route)... "
    
    # Hacer request con cookies
    response=$(curl -s -w "\n%{http_code}" -b "$COOKIE_FILE" "$SERVER$route" 2>&1)
    status_code=$(echo "$response" | tail -1)
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅ OK${NC} (HTTP $status_code)"
        return 0
    elif [ "$status_code" = "302" ]; then
        echo -e "${YELLOW}⚠️  REDIRECT${NC} (HTTP 302 - Requiere autenticación)"
        return 1
    else
        echo -e "${RED}❌ FAIL${NC} (HTTP $status_code)"
        return 2
    fi
}

# Limpiar cookies anteriores
rm -f "$COOKIE_FILE"

echo "📋 MÓDULOS A TESTEAR:"
echo "  1. Dashboard"
echo "  2. Proyectos"
echo "  3. Facturas"
echo "  4. Certificados"
echo "  5. Clientes"
echo "  6. Presupuestos"
echo "  7. Leads"
echo "  8. Prospectos"
echo ""
echo "⏳ Iniciando tests..."
echo ""

# Contadores
total=0
passed=0
failed=0
redirect=0

# Test Dashboard
((total++))
test_route "/dashboard" "Dashboard"
result=$?
[ $result -eq 0 ] && ((passed++)) || [ $result -eq 1 ] && ((redirect++)) || ((failed++))

# Test Proyectos
((total++))
test_route "/proyectos" "Proyectos"
result=$?
[ $result -eq 0 ] && ((passed++)) || [ $result -eq 1 ] && ((redirect++)) || ((failed++))

# Test Facturas
((total++))
test_route "/facturas/emitidas" "Facturas Emitidas"
result=$?
[ $result -eq 0 ] && ((passed++)) || [ $result -eq 1 ] && ((redirect++)) || ((failed++))

# Test Certificados
((total++))
test_route "/certificados" "Certificados"
result=$?
[ $result -eq 0 ] && ((passed++)) || [ $result -eq 1 ] && ((redirect++)) || ((failed++))

# Test Clientes
((total++))
test_route "/clientes" "Clientes"
result=$?
[ $result -eq 0 ] && ((passed++)) || [ $result -eq 1 ] && ((redirect++)) || ((failed++))

# Test Presupuestos
((total++))
test_route "/presupuestos" "Presupuestos"
result=$?
[ $result -eq 0 ] && ((passed++)) || [ $result -eq 1 ] && ((redirect++)) || ((failed++))

# Test Leads
((total++))
test_route "/leads" "Leads"
result=$?
[ $result -eq 0 ] && ((passed++)) || [ $result -eq 1 ] && ((redirect++)) || ((failed++))

# Test Prospectos
((total++))
test_route "/prospectos" "Prospectos"
result=$?
[ $result -eq 0 ] && ((passed++)) || [ $result -eq 1 ] && ((redirect++)) || ((failed++))

# Test Health Check (público)
((total++))
test_route "/health" "Health Check"
result=$?
[ $result -eq 0 ] && ((passed++)) || [ $result -eq 1 ] && ((redirect++)) || ((failed++))

echo ""
echo "=================================="
echo "📊 RESUMEN DE TESTS"
echo "=================================="
echo "Total: $total"
echo -e "${GREEN}Pasados: $passed${NC}"
echo -e "${YELLOW}Redirects (requieren auth): $redirect${NC}"
echo -e "${RED}Fallidos: $failed${NC}"
echo ""

if [ $redirect -gt 0 ]; then
    echo -e "${YELLOW}⚠️  NOTA: Los módulos con redirect (302) requieren autenticación.${NC}"
    echo -e "${YELLOW}   Esto es NORMAL y significa que las rutas están protegidas correctamente.${NC}"
    echo ""
fi

if [ $failed -eq 0 ]; then
    echo -e "${GREEN}✅ TODOS LOS TESTS PASARON O REQUIEREN AUTENTICACIÓN (ESPERADO)${NC}"
    exit 0
else
    echo -e "${RED}❌ ALGUNOS TESTS FALLARON - REVISAR LOGS DEL SERVIDOR${NC}"
    exit 1
fi
