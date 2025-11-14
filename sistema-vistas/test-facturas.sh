#!/bin/bash

# Script de Testing Integral - Creación de Facturas
# Este script prueba todos los aspectos de la creación de facturas

set -e

BASE_URL="https://sgi.ultimamilla.com.ar"
COOKIES="/tmp/sgi_cookies.txt"
RESULTS="/tmp/test_results.txt"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir resultados
print_result() {
    local test_name=$1
    local status=$2
    local details=$3
    
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✓ PASS${NC}: $test_name"
    else
        echo -e "${RED}✗ FAIL${NC}: $test_name"
        if [ ! -z "$details" ]; then
            echo "  Detalles: $details"
        fi
    fi
    echo "$test_name: $status - $details" >> "$RESULTS"
}

# Limpiar resultados previos
> "$RESULTS"

echo "=========================================="
echo "TESTING INTEGRAL - CREACIÓN DE FACTURAS"
echo "=========================================="
echo ""

# Test 1: Verificar que el formulario de nueva factura carga
echo "Test 1: Verificar formulario de nueva factura..."
RESPONSE=$(curl -s -k "$BASE_URL/facturas/nueva" 2>&1)
if echo "$RESPONSE" | grep -q "numero_factura\|Número de Factura"; then
    print_result "Formulario carga correctamente" "PASS"
else
    print_result "Formulario carga correctamente" "FAIL" "Campo numero_factura no encontrado"
fi

# Test 2: Verificar que punto_venta es obligatorio
echo "Test 2: Verificar punto_venta obligatorio..."
if echo "$RESPONSE" | grep -q 'punto_venta.*required'; then
    print_result "Punto de venta marcado como required" "PASS"
else
    print_result "Punto de venta marcado como required" "FAIL" "Atributo required no encontrado"
fi

# Test 3: Verificar que numero_factura es obligatorio
echo "Test 3: Verificar numero_factura obligatorio..."
if echo "$RESPONSE" | grep -q 'numero_factura.*required'; then
    print_result "Número de factura marcado como required" "PASS"
else
    print_result "Número de factura marcado como required" "FAIL" "Atributo required no encontrado"
fi

# Test 4: Verificar que el script de envío está presente
echo "Test 4: Verificar script de envío..."
if echo "$RESPONSE" | grep -q "fetch.*facturas/crear"; then
    print_result "Script de envío presente" "PASS"
else
    print_result "Script de envío presente" "FAIL" "Script no encontrado"
fi

# Test 5: Verificar que el controlador responde a POST
echo "Test 5: Verificar endpoint POST /facturas/crear..."
RESPONSE=$(curl -s -k -X POST "$BASE_URL/facturas/crear" \
    -H "Content-Type: application/json" \
    -d '{}' 2>&1)
if echo "$RESPONSE" | grep -q "cliente_id\|Debe seleccionar"; then
    print_result "Endpoint POST responde" "PASS"
else
    print_result "Endpoint POST responde" "FAIL" "Respuesta inesperada: $RESPONSE"
fi

# Test 6: Verificar validación de cliente_id
echo "Test 6: Verificar validación de cliente_id..."
RESPONSE=$(curl -s -k -X POST "$BASE_URL/facturas/crear" \
    -H "Content-Type: application/json" \
    -d '{
        "tipo_factura": "B",
        "punto_venta": 1,
        "numero_factura": 1,
        "fecha_emision": "2025-01-01",
        "items": [{"descripcion": "test", "cantidad": 1, "precio_unitario": 100, "iva_porcentaje": 21}]
    }' 2>&1)
if echo "$RESPONSE" | grep -q "cliente_id\|Debe seleccionar"; then
    print_result "Validación cliente_id funciona" "PASS"
else
    print_result "Validación cliente_id funciona" "FAIL" "No valida cliente_id"
fi

# Test 7: Verificar validación de punto_venta
echo "Test 7: Verificar validación de punto_venta..."
RESPONSE=$(curl -s -k -X POST "$BASE_URL/facturas/crear" \
    -H "Content-Type: application/json" \
    -d '{
        "cliente_id": "1",
        "tipo_factura": "B",
        "numero_factura": 1,
        "fecha_emision": "2025-01-01",
        "items": [{"descripcion": "test", "cantidad": 1, "precio_unitario": 100, "iva_porcentaje": 21}]
    }' 2>&1)
if echo "$RESPONSE" | grep -q "punto_venta\|obligatorio"; then
    print_result "Validación punto_venta funciona" "PASS"
else
    print_result "Validación punto_venta funciona" "FAIL" "No valida punto_venta"
fi

# Test 8: Verificar validación de numero_factura
echo "Test 8: Verificar validación de numero_factura..."
RESPONSE=$(curl -s -k -X POST "$BASE_URL/facturas/crear" \
    -H "Content-Type: application/json" \
    -d '{
        "cliente_id": "1",
        "tipo_factura": "B",
        "punto_venta": 1,
        "fecha_emision": "2025-01-01",
        "items": [{"descripcion": "test", "cantidad": 1, "precio_unitario": 100, "iva_porcentaje": 21}]
    }' 2>&1)
if echo "$RESPONSE" | grep -q "numero_factura\|obligatorio"; then
    print_result "Validación numero_factura funciona" "PASS"
else
    print_result "Validación numero_factura funciona" "FAIL" "No valida numero_factura"
fi

# Test 9: Verificar validación de items
echo "Test 9: Verificar validación de items..."
RESPONSE=$(curl -s -k -X POST "$BASE_URL/facturas/crear" \
    -H "Content-Type: application/json" \
    -d '{
        "cliente_id": "1",
        "tipo_factura": "B",
        "punto_venta": 1,
        "numero_factura": 1,
        "fecha_emision": "2025-01-01",
        "items": []
    }' 2>&1)
if echo "$RESPONSE" | grep -q "items\|al menos"; then
    print_result "Validación items funciona" "PASS"
else
    print_result "Validación items funciona" "FAIL" "No valida items"
fi

# Test 10: Verificar que el modelo incluye numero_factura_completo
echo "Test 10: Verificar modelo FacturaModel..."
if grep -q "numero_factura_completo" /Volumes/SDTERA/ultima\ milla/2025/SGI/sistema-vistas/src/models/FacturaModel.js; then
    print_result "Modelo incluye numero_factura_completo" "PASS"
else
    print_result "Modelo incluye numero_factura_completo" "FAIL" "Campo no encontrado en modelo"
fi

# Test 11: Verificar que el script de facturas-emitidas muestra numero_factura_completo
echo "Test 11: Verificar script facturas-emitidas..."
if grep -q "numero_factura_completo" /Volumes/SDTERA/ultima\ milla/2025/SGI/sistema-vistas/src/public/js/facturas-emitidas.js; then
    print_result "Script muestra numero_factura_completo" "PASS"
else
    print_result "Script muestra numero_factura_completo" "FAIL" "Campo no encontrado en script"
fi

# Test 12: Verificar que el controlador tiene el método crear
echo "Test 12: Verificar método crear en controlador..."
if grep -q "static async crear" /Volumes/SDTERA/ultima\ milla/2025/SGI/sistema-vistas/src/controllers/facturasController.js; then
    print_result "Método crear implementado" "PASS"
else
    print_result "Método crear implementado" "FAIL" "Método no encontrado"
fi

echo ""
echo "=========================================="
echo "RESULTADOS DE TESTING"
echo "=========================================="
cat "$RESULTS"
echo "=========================================="
