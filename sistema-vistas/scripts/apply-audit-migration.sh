#!/bin/bash

# ============================================================================
# SCRIPT DE MIGRACIÓN - SISTEMA DE AUDITORÍA
# ============================================================================
# Aplica la migración de base de datos para el sistema de logs
# Se ejecutará tanto en desarrollo como en producción
# ============================================================================

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}MIGRACIÓN: Sistema de Auditoría${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

# Detectar entorno
if [ -z "$DB_HOST" ]; then
    echo -e "${YELLOW}⚠️  Variables de entorno no encontradas, cargando desde .env...${NC}"
    source .env 2>/dev/null || echo -e "${RED}❌ No se pudo cargar .env${NC}"
fi

# Configuración de BD
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-3306}
DB_NAME=${DB_NAME:-sgi_production}
DB_USER=${DB_USER:-root}
DB_PASS=${DB_PASS}

echo -e "${BLUE}Configuración:${NC}"
echo -e "  Host: ${BLUE}$DB_HOST:$DB_PORT${NC}"
echo -e "  Database: ${BLUE}$DB_NAME${NC}"
echo -e "  User: ${BLUE}$DB_USER${NC}"
echo ""

# Confirmar antes de ejecutar en producción
if [ "$DB_NAME" != "sgi_test" ] && [ "$DB_NAME" != "test_sgi" ]; then
    echo -e "${YELLOW}⚠️  ATENCIÓN: Vas a ejecutar la migración en la base de datos de PRODUCCIÓN${NC}"
    echo -e "${YELLOW}   Database: $DB_NAME${NC}"
    echo ""
    read -p "¿Estás seguro? (escribe 'SI' para continuar): " confirmation
    
    if [ "$confirmation" != "SI" ]; then
        echo -e "${RED}❌ Migración cancelada${NC}"
        exit 1
    fi
fi

# Verificar conexión a la BD
echo -e "${BLUE}🔌 Verificando conexión a la base de datos...${NC}"
if [ -n "$DB_PASS" ]; then
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" -e "SELECT 1" "$DB_NAME" >/dev/null 2>&1
else
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -e "SELECT 1" "$DB_NAME" >/dev/null 2>&1
fi

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ No se pudo conectar a la base de datos${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Conexión exitosa${NC}"
echo ""

# Crear backup antes de la migración
BACKUP_FILE="/tmp/backup_before_audit_migration_$(date +%Y%m%d_%H%M%S).sql"
echo -e "${BLUE}💾 Creando backup de seguridad...${NC}"
echo -e "   Archivo: ${BACKUP_FILE}"

if [ -n "$DB_PASS" ]; then
    mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" > "$BACKUP_FILE"
else
    mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME" > "$BACKUP_FILE"
fi

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backup creado exitosamente${NC}"
else
    echo -e "${RED}❌ Error al crear backup${NC}"
    exit 1
fi
echo ""

# Ejecutar migración
MIGRATION_FILE="src/migrations/001_create_audit_logs.sql"
echo -e "${BLUE}🚀 Ejecutando migración...${NC}"
echo -e "   Archivo: ${MIGRATION_FILE}"
echo ""

if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}❌ Archivo de migración no encontrado: $MIGRATION_FILE${NC}"
    exit 1
fi

if [ -n "$DB_PASS" ]; then
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$MIGRATION_FILE"
else
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME" < "$MIGRATION_FILE"
fi

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Migración ejecutada exitosamente${NC}"
else
    echo -e "${RED}❌ Error al ejecutar migración${NC}"
    echo -e "${YELLOW}💡 Puedes restaurar el backup con:${NC}"
    echo -e "   mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p $DB_NAME < $BACKUP_FILE"
    exit 1
fi
echo ""

# Verificar tablas creadas
echo -e "${BLUE}🔍 Verificando instalación...${NC}"

if [ -n "$DB_PASS" ]; then
    RESULT=$(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -N -e "
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = '$DB_NAME' 
        AND table_name IN ('audit_logs', 'audit_critical_alerts')
    ")
else
    RESULT=$(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME" -N -e "
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = '$DB_NAME' 
        AND table_name IN ('audit_logs', 'audit_critical_alerts')
    ")
fi

if [ "$RESULT" == "2" ]; then
    echo -e "${GREEN}✅ Tablas creadas: audit_logs, audit_critical_alerts${NC}"
else
    echo -e "${RED}❌ Las tablas no se crearon correctamente${NC}"
    exit 1
fi

# Verificar vistas
if [ -n "$DB_PASS" ]; then
    VIEW_COUNT=$(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -N -e "
        SELECT COUNT(*) FROM information_schema.views 
        WHERE table_schema = '$DB_NAME' 
        AND table_name LIKE 'v_audit_%'
    ")
else
    VIEW_COUNT=$(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME" -N -e "
        SELECT COUNT(*) FROM information_schema.views 
        WHERE table_schema = '$DB_NAME' 
        AND table_name LIKE 'v_audit_%'
    ")
fi

echo -e "${GREEN}✅ Vistas creadas: $VIEW_COUNT${NC}"

# Verificar stored procedures
if [ -n "$DB_PASS" ]; then
    PROC_COUNT=$(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -N -e "
        SELECT COUNT(*) FROM information_schema.routines 
        WHERE routine_schema = '$DB_NAME' 
        AND routine_name LIKE 'sp_audit_%'
    ")
else
    PROC_COUNT=$(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME" -N -e "
        SELECT COUNT(*) FROM information_schema.routines 
        WHERE routine_schema = '$DB_NAME' 
        AND routine_name LIKE 'sp_audit_%'
    ")
fi

echo -e "${GREEN}✅ Stored procedures creados: $PROC_COUNT${NC}"
echo ""

# Resumen final
echo -e "${GREEN}============================================================================${NC}"
echo -e "${GREEN}✅ MIGRACIÓN COMPLETADA EXITOSAMENTE${NC}"
echo -e "${GREEN}============================================================================${NC}"
echo ""
echo -e "${BLUE}📊 Resumen:${NC}"
echo -e "  • Tablas creadas: ${GREEN}2${NC} (audit_logs, audit_critical_alerts)"
echo -e "  • Vistas creadas: ${GREEN}$VIEW_COUNT${NC}"
echo -e "  • Procedures creados: ${GREEN}$PROC_COUNT${NC}"
echo -e "  • Triggers activos: ${GREEN}1${NC} (alertas automáticas)"
echo ""
echo -e "${BLUE}📁 Backup guardado en:${NC}"
echo -e "  ${BACKUP_FILE}"
echo ""
echo -e "${BLUE}🎯 Próximos pasos:${NC}"
echo -e "  1. Reiniciar la aplicación: ${YELLOW}pm2 restart sgi${NC}"
echo -e "  2. Verificar logs: ${YELLOW}pm2 logs sgi${NC}"
echo -e "  3. Acceder a auditoría: ${YELLOW}https://sgi.ultimamilla.com.ar/logs${NC}"
echo ""
echo -e "${GREEN}¡Sistema de auditoría listo para usar!${NC}"
echo ""
