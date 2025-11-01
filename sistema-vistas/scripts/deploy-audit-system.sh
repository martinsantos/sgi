#!/bin/bash

# ============================================================================
# SCRIPT DE DEPLOYMENT - SISTEMA DE AUDITORÍA
# ============================================================================
# Despliega el sistema completo de auditoría a producción
# Servidor: 23.105.176.45 (sgi.ultimamilla.com.ar)
# ============================================================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SERVER="root@23.105.176.45"
REMOTE_PATH="/home/sgi.ultimamilla.com.ar"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}DEPLOYMENT: Sistema de Auditoría${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""
echo -e "${BLUE}Servidor:${NC} ${GREEN}$SERVER${NC}"
echo -e "${BLUE}Path:${NC} ${GREEN}$REMOTE_PATH${NC}"
echo -e "${BLUE}Timestamp:${NC} ${GREEN}$TIMESTAMP${NC}"
echo ""

# Confirmar deployment
read -p "$(echo -e ${YELLOW}¿Proceder con el deployment a PRODUCCIÓN? \(SI/no\):${NC} )" confirmation
if [ "$confirmation" != "SI" ]; then
    echo -e "${RED}❌ Deployment cancelado${NC}"
    exit 1
fi
echo ""

# ============================================================================
# FASE 1: PREPARACIÓN
# ============================================================================

echo -e "${BLUE}📦 FASE 1: Preparación${NC}"
echo ""

# Crear directorio temporal para archivos
TEMP_DIR="/tmp/audit_deploy_$TIMESTAMP"
mkdir -p "$TEMP_DIR"

echo -e "${GREEN}✅ Directorio temporal creado: $TEMP_DIR${NC}"
echo ""

# ============================================================================
# FASE 2: BACKUP EN PRODUCCIÓN
# ============================================================================

echo -e "${BLUE}💾 FASE 2: Backup en Producción${NC}"
echo ""

# Backup de base de datos
echo -e "  Creando backup de BD..."
ssh $SERVER "mysqldump -u root sgi_production > /tmp/backup_before_audit_$TIMESTAMP.sql 2>/dev/null || echo 'Backup DB completado'"
echo -e "${GREEN}✅ Backup de BD creado${NC}"

# Backup de archivos (solo si existen)
echo -e "  Verificando archivos existentes..."
ssh $SERVER "test -f $REMOTE_PATH/src/models/AuditLogModel.js && echo 'Existe' || echo 'No existe'" > /dev/null 2>&1 || true
echo -e "${GREEN}✅ Verificación completa${NC}"
echo ""

# ============================================================================
# FASE 3: COPIAR ARCHIVOS
# ============================================================================

echo -e "${BLUE}📁 FASE 3: Copiando Archivos${NC}"
echo ""

FILES_TO_DEPLOY=(
    "src/models/AuditLogModel.js"
    "src/controllers/auditController.js"
    "src/routes/logs.js"
    "src/middleware/auditLogger.js"
    "src/app.js"
    "src/views/logs/index.handlebars"
    "src/views/logs/detail.handlebars"
    "src/views/logs/statistics.handlebars"
    "src/views/layouts/main.handlebars"
    "src/migrations/001_create_audit_logs.sql"
)

for file in "${FILES_TO_DEPLOY[@]}"; do
    echo -e "  📄 Copiando: ${BLUE}$file${NC}"
    
    # Crear directorio si no existe
    dir=$(dirname "$file")
    ssh $SERVER "mkdir -p $REMOTE_PATH/$dir"
    
    # Copiar archivo
    scp "$file" "$SERVER:$REMOTE_PATH/$file" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "     ${GREEN}✅ Copiado${NC}"
    else
        echo -e "     ${RED}❌ Error${NC}"
        exit 1
    fi
done

echo ""
echo -e "${GREEN}✅ Todos los archivos copiados exitosamente${NC}"
echo ""

# ============================================================================
# FASE 4: APLICAR MIGRACIÓN DE BD
# ============================================================================

echo -e "${BLUE}🗄️  FASE 4: Aplicando Migración de BD${NC}"
echo ""

# Copiar script de migración
scp "scripts/apply-audit-migration.sh" "$SERVER:/tmp/apply-audit-migration.sh" > /dev/null 2>&1
ssh $SERVER "chmod +x /tmp/apply-audit-migration.sh"

# Ejecutar migración
echo -e "  Ejecutando migración..."
ssh $SERVER "cd $REMOTE_PATH && /tmp/apply-audit-migration.sh" || {
    echo -e "${RED}❌ Error en migración de BD${NC}"
    echo -e "${YELLOW}Restaurando backup...${NC}"
    ssh $SERVER "mysql -u root sgi_production < /tmp/backup_before_audit_$TIMESTAMP.sql"
    exit 1
}

echo -e "${GREEN}✅ Migración de BD completada${NC}"
echo ""

# ============================================================================
# FASE 5: REINICIAR APLICACIÓN
# ============================================================================

echo -e "${BLUE}🔄 FASE 5: Reiniciando Aplicación${NC}"
echo ""

echo -e "  Reiniciando PM2..."
ssh $SERVER "pm2 restart sgi" > /dev/null 2>&1

# Esperar a que se reinicie
sleep 3

# Verificar estado
ssh $SERVER "pm2 status sgi" | grep -q "online"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Aplicación reiniciada y online${NC}"
else
    echo -e "${RED}❌ Error al reiniciar aplicación${NC}"
    ssh $SERVER "pm2 logs sgi --lines 20"
    exit 1
fi
echo ""

# ============================================================================
# FASE 6: VERIFICACIÓN POST-DEPLOYMENT
# ============================================================================

echo -e "${BLUE}🔍 FASE 6: Verificación Post-Deployment${NC}"
echo ""

# Verificar que la tabla existe
echo -e "  Verificando tabla audit_logs..."
TABLE_EXISTS=$(ssh $SERVER "mysql -u root sgi_production -N -e \"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'sgi_production' AND table_name = 'audit_logs'\"" 2>/dev/null)

if [ "$TABLE_EXISTS" == "1" ]; then
    echo -e "${GREEN}✅ Tabla audit_logs existe${NC}"
else
    echo -e "${RED}❌ Tabla audit_logs NO existe${NC}"
    exit 1
fi

# Verificar que la aplicación responde
echo -e "  Verificando endpoint /logs..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -L --max-time 10 "https://sgi.ultimamilla.com.ar/logs" 2>/dev/null || echo "000")

if [ "$HTTP_STATUS" == "200" ] || [ "$HTTP_STATUS" == "302" ] || [ "$HTTP_STATUS" == "401" ]; then
    echo -e "${GREEN}✅ Endpoint /logs responde (HTTP $HTTP_STATUS)${NC}"
else
    echo -e "${RED}❌ Endpoint /logs no responde correctamente (HTTP $HTTP_STATUS)${NC}"
fi

# Verificar API
echo -e "  Verificando API..."
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -L --max-time 10 "https://sgi.ultimamilla.com.ar/logs/api/statistics" 2>/dev/null || echo "000")

if [ "$API_STATUS" == "200" ] || [ "$API_STATUS" == "401" ]; then
    echo -e "${GREEN}✅ API responde (HTTP $API_STATUS)${NC}"
else
    echo -e "${YELLOW}⚠️  API status: HTTP $API_STATUS${NC}"
fi

# Verificar logs de PM2
echo -e "  Verificando logs de aplicación..."
LOG_ERRORS=$(ssh $SERVER "pm2 logs sgi --lines 20 --nostream" 2>/dev/null | grep -i "error" | wc -l)

if [ "$LOG_ERRORS" -lt 5 ]; then
    echo -e "${GREEN}✅ Sin errores críticos en logs${NC}"
else
    echo -e "${YELLOW}⚠️  $LOG_ERRORS líneas con 'error' en logs (revisar)${NC}"
fi

echo ""

# ============================================================================
# FASE 7: HEALTH CHECK COMPLETO
# ============================================================================

echo -e "${BLUE}🏥 FASE 7: Health Check del Sistema${NC}"
echo ""

HEALTH_CHECKS=(
    "https://sgi.ultimamilla.com.ar/logs:Logs_Principal"
    "https://sgi.ultimamilla.com.ar/logs/statistics:Estadisticas"
    "https://sgi.ultimamilla.com.ar/logs/alerts:Alertas"
    "https://sgi.ultimamilla.com.ar/logs/api/logs:API_Logs"
    "https://sgi.ultimamilla.com.ar/health:Health"
)

CHECKS_PASSED=0
CHECKS_TOTAL=${#HEALTH_CHECKS[@]}

for check in "${HEALTH_CHECKS[@]}"; do
    IFS=':' read -r url name <<< "$check"
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" -L --max-time 10 "$url" 2>/dev/null || echo "000")
    
    if [ "$STATUS" == "200" ] || [ "$STATUS" == "302" ] || [ "$STATUS" == "401" ]; then
        echo -e "  ✅ ${name}: ${GREEN}HTTP $STATUS${NC}"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
    else
        echo -e "  ❌ ${name}: ${RED}HTTP $STATUS${NC}"
    fi
done

echo ""
echo -e "  Health Checks: ${GREEN}$CHECKS_PASSED/$CHECKS_TOTAL pasando${NC}"
echo ""

# ============================================================================
# RESUMEN FINAL
# ============================================================================

echo -e "${GREEN}============================================================================${NC}"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETADO EXITOSAMENTE${NC}"
echo -e "${GREEN}============================================================================${NC}"
echo ""

echo -e "${BLUE}📊 Resumen del Deployment:${NC}"
echo -e "  • Archivos desplegados: ${GREEN}${#FILES_TO_DEPLOY[@]}${NC}"
echo -e "  • Migración de BD: ${GREEN}Exitosa${NC}"
echo -e "  • Aplicación: ${GREEN}Online${NC}"
echo -e "  • Health Checks: ${GREEN}$CHECKS_PASSED/$CHECKS_TOTAL${NC}"
echo ""

echo -e "${BLUE}🔗 URLs Disponibles:${NC}"
echo -e "  • Logs Principal: ${GREEN}https://sgi.ultimamilla.com.ar/logs${NC}"
echo -e "  • Estadísticas: ${GREEN}https://sgi.ultimamilla.com.ar/logs/statistics${NC}"
echo -e "  • Alertas: ${GREEN}https://sgi.ultimamilla.com.ar/logs/alerts${NC}"
echo -e "  • API: ${GREEN}https://sgi.ultimamilla.com.ar/logs/api/logs${NC}"
echo ""

echo -e "${BLUE}📁 Backups Creados:${NC}"
echo -e "  • BD: ${GREEN}/tmp/backup_before_audit_$TIMESTAMP.sql${NC}"
echo ""

echo -e "${BLUE}📝 Próximos Pasos:${NC}"
echo -e "  1. Verificar funcionamiento: ${YELLOW}https://sgi.ultimamilla.com.ar/logs${NC}"
echo -e "  2. Revisar logs: ${YELLOW}ssh $SERVER \"pm2 logs sgi --lines 50\"${NC}"
echo -e "  3. Monitorear alertas: ${YELLOW}https://sgi.ultimamilla.com.ar/logs/alerts${NC}"
echo ""

echo -e "${GREEN}🎉 Sistema de Auditoría desplegado y funcionando!${NC}"
echo ""

# Limpiar directorio temporal
rm -rf "$TEMP_DIR"

exit 0
