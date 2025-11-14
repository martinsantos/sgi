#!/bin/bash

# Script de Testing Manual - Creación de Facturas
# Este script prueba la creación de facturas de forma manual

set -e

BASE_URL="https://sgi.ultimamilla.com.ar"
COOKIES="/tmp/sgi_cookies.txt"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=========================================="
echo "TESTING MANUAL - CREACIÓN DE FACTURAS"
echo "==========================================${NC}"
echo ""

# Paso 1: Login
echo -e "${YELLOW}Paso 1: Realizando login...${NC}"
LOGIN_RESPONSE=$(curl -s -k -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "email=ultimamilla&password=SGI@2025!UM" \
    -c "$COOKIES" \
    -L 2>&1)

if echo "$LOGIN_RESPONSE" | grep -q "dashboard\|Nueva Factura\|Facturas"; then
    echo -e "${GREEN}✓ Login exitoso${NC}"
else
    echo -e "${RED}✗ Login fallido${NC}"
    echo "Respuesta: $LOGIN_RESPONSE" | head -20
fi

# Paso 2: Acceder a nueva factura
echo -e "${YELLOW}Paso 2: Accediendo a /facturas/nueva...${NC}"
NUEVA_FACTURA=$(curl -s -k "$BASE_URL/facturas/nueva" -b "$COOKIES" 2>&1)

if echo "$NUEVA_FACTURA" | grep -q "numero_factura"; then
    echo -e "${GREEN}✓ Formulario carga correctamente${NC}"
    echo -e "${GREEN}  - Campo 'numero_factura' encontrado${NC}"
else
    echo -e "${RED}✗ Formulario no carga correctamente${NC}"
fi

if echo "$NUEVA_FACTURA" | grep -q "punto_venta.*required"; then
    echo -e "${GREEN}✓ Campo 'punto_venta' es obligatorio${NC}"
else
    echo -e "${RED}✗ Campo 'punto_venta' no es obligatorio${NC}"
fi

if echo "$NUEVA_FACTURA" | grep -q "numero_factura.*required"; then
    echo -e "${GREEN}✓ Campo 'numero_factura' es obligatorio${NC}"
else
    echo -e "${RED}✗ Campo 'numero_factura' no es obligatorio${NC}"
fi

if echo "$NUEVA_FACTURA" | grep -q "fetch.*facturas/crear"; then
    echo -e "${GREEN}✓ Script de envío presente${NC}"
else
    echo -e "${RED}✗ Script de envío no encontrado${NC}"
fi

# Paso 3: Obtener cliente para prueba
echo ""
echo -e "${YELLOW}Paso 3: Obteniendo cliente para prueba...${NC}"
CLIENTES=$(curl -s -k "$BASE_URL/clientes/api" -b "$COOKIES" 2>&1)

if echo "$CLIENTES" | grep -q '"id"'; then
    CLIENTE_ID=$(echo "$CLIENTES" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo -e "${GREEN}✓ Cliente obtenido: $CLIENTE_ID${NC}"
else
    echo -e "${RED}✗ No se pudo obtener cliente${NC}"
    CLIENTE_ID="1"
fi

# Paso 4: Intentar crear factura
echo ""
echo -e "${YELLOW}Paso 4: Intentando crear factura...${NC}"

FACTURA_DATA='{
    "cliente_id": "'$CLIENTE_ID'",
    "tipo_factura": "B",
    "punto_venta": 1,
    "numero_factura": 1,
    "fecha_emision": "2025-11-14",
    "items": [
        {
            "descripcion": "Servicio de prueba",
            "cantidad": 1,
            "precio_unitario": 1000,
            "iva_porcentaje": 21
        }
    ]
}'

CREATE_RESPONSE=$(curl -s -k -X POST "$BASE_URL/facturas/crear" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -d "$FACTURA_DATA" \
    -b "$COOKIES" \
    -L 2>&1)

if echo "$CREATE_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Factura creada exitosamente${NC}"
    FACTURA_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo -e "${GREEN}  - ID: $FACTURA_ID${NC}"
    
    # Paso 5: Verificar que aparece en listado
    echo ""
    echo -e "${YELLOW}Paso 5: Verificando en listado de facturas...${NC}"
    LISTADO=$(curl -s -k "$BASE_URL/facturas/emitidas" -b "$COOKIES" 2>&1)
    
    if echo "$LISTADO" | grep -q "numero_factura_completo\|00001-00000001"; then
        echo -e "${GREEN}✓ Número de factura completo se muestra${NC}"
    else
        echo -e "${YELLOW}⚠ Número de factura completo no visible (puede ser por paginación)${NC}"
    fi
    
    # Paso 6: Verificar vista de detalle
    echo ""
    echo -e "${YELLOW}Paso 6: Verificando vista de detalle...${NC}"
    DETALLE=$(curl -s -k "$BASE_URL/facturas/ver/$FACTURA_ID" -b "$COOKIES" 2>&1)
    
    if echo "$DETALLE" | grep -q "Factura\|detalle"; then
        echo -e "${GREEN}✓ Vista de detalle carga${NC}"
    else
        echo -e "${RED}✗ Vista de detalle no carga${NC}"
    fi
    
elif echo "$CREATE_RESPONSE" | grep -q "cliente_id\|Debe seleccionar"; then
    echo -e "${YELLOW}⚠ Validación de cliente_id funciona${NC}"
    echo "  Respuesta: $(echo $CREATE_RESPONSE | cut -c1-100)..."
else
    echo -e "${RED}✗ Error al crear factura${NC}"
    echo "Respuesta: $(echo $CREATE_RESPONSE | cut -c1-200)..."
fi

echo ""
echo -e "${BLUE}=========================================="
echo "FIN DEL TESTING"
echo "==========================================${NC}"
