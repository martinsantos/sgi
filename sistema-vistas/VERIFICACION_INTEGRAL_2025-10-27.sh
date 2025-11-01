#!/bin/bash

# 🧪 SCRIPT DE VERIFICACIÓN INTEGRAL DEL SISTEMA SGI
# Fecha: 27 de Octubre 2025
# Objetivo: Verificar que TODOS los módulos funcionen correctamente

echo "🧪 INICIANDO VERIFICACIÓN INTEGRAL DEL SISTEMA SGI"
echo "=================================================="
echo ""

# Variables
SERVER="http://localhost:3456"
PROD_SERVER="https://sgi.ultimamilla.com.ar"
PASSED=0
FAILED=0

# Función para hacer test
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    local expected_status=$4
    
    echo -n "🔍 $description ... "
    
    response=$(curl -s -w "\n%{http_code}" "$SERVER$endpoint" 2>/dev/null)
    status=$(echo "$response" | tail -n1)
    
    if [[ "$status" == "$expected_status" ]]; then
        echo "✅ OK (HTTP $status)"
        ((PASSED++))
    else
        echo "❌ FAILED (HTTP $status, expected $expected_status)"
        ((FAILED++))
    fi
}

echo "📋 1. CERTIFICADOS"
echo "==================="
test_endpoint "GET" "/certificados" "Listado de certificados" "200"
test_endpoint "GET" "/certificados?page=1" "Certificados página 1" "200"
test_endpoint "GET" "/certificados?page=2" "Certificados página 2" "200"
echo ""

echo "💰 2. FACTURAS EMITIDAS"
echo "======================="
test_endpoint "GET" "/facturas/emitidas" "Listado de facturas emitidas" "200"
test_endpoint "GET" "/facturas/api/emitidas?page=1&limit=10" "API facturas emitidas" "200"
echo ""

echo "📥 3. FACTURAS RECIBIDAS"
echo "========================"
test_endpoint "GET" "/facturas/recibidas" "Listado de facturas recibidas" "200"
test_endpoint "GET" "/facturas/api/recibidas?page=1&limit=10" "API facturas recibidas" "200"
echo ""

echo "📊 4. LOGS DE AUDITORÍA"
echo "======================="
test_endpoint "GET" "/logs" "Listado de logs" "200"
test_endpoint "GET" "/logs/statistics" "Dashboard de estadísticas" "200"
test_endpoint "GET" "/logs/alerts" "Alertas críticas" "200"
test_endpoint "GET" "/logs/api/list?page=1&limit=20" "API de logs" "200"
echo ""

echo "👥 5. CLIENTES"
echo "==============="
test_endpoint "GET" "/clientes" "Listado de clientes" "200"
test_endpoint "GET" "/clientes/api/search-json?q=a&page=1&limit=10" "Búsqueda de clientes" "200"
echo ""

echo "📁 6. PROYECTOS"
echo "==============="
test_endpoint "GET" "/proyectos" "Listado de proyectos" "200"
echo ""

echo "💵 7. PRESUPUESTOS"
echo "=================="
test_endpoint "GET" "/presupuestos" "Listado de presupuestos" "200"
echo ""

echo "🎯 8. LEADS"
echo "==========="
test_endpoint "GET" "/leads" "Listado de leads" "200"
echo ""

echo "🛣️ 9. RUTAS CRÍTICAS"
echo "===================="
test_endpoint "GET" "/health" "Health check" "200"
echo ""

echo "=================================================="
echo "📊 RESULTADOS FINALES"
echo "=================================================="
echo "✅ Pasados: $PASSED"
echo "❌ Fallidos: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "🎉 ¡TODOS LOS TESTS PASARON!"
    exit 0
else
    echo "⚠️  Hay $FAILED tests que fallaron"
    exit 1
fi
