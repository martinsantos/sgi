# 🔍 SISTEMA DE AUDITORÍA - SGI

## 📋 Descripción

Sistema completo de auditoría y logs de usuarios que registra **todas las actividades** del sistema SGI. Implementado con retención indefinida, almacenamiento optimizado, y alertas automáticas para acciones críticas.

---

## ✨ Características Principales

### 1. **Logging Automático**
- ✅ Captura automática de **TODAS** las operaciones (CRUD, logins, vistas, exportaciones)
- ✅ Tracking de cambios (before/after) en operaciones UPDATE
- ✅ Información de contexto completa (IP, user agent, duración, status codes)
- ✅ Registro asíncrono (no bloquea las operaciones)

### 2. **Interfaz de Consulta Completa**
- ✅ Vista principal con listado de logs
- ✅ Filtros avanzados (usuario, módulo, acción, fecha)
- ✅ Búsqueda full-text
- ✅ Paginación eficiente
- ✅ Vista de detalle con comparación de cambios

### 3. **Dashboard de Estadísticas**
- ✅ Métricas generales del sistema
- ✅ Usuarios más activos
- ✅ Actividad por módulo
- ✅ Gráficos y visualizaciones
- ✅ Filtros por período (hoy, 7 días, 30 días, 90 días)

### 4. **Alertas Críticas**
- ✅ Detección automática de eliminaciones
- ✅ Panel de alertas pendientes
- ✅ Notificaciones para acciones super críticas
- ✅ Sistema extensible para nuevos tipos de alertas

### 5. **Exportación de Datos**
- ✅ Exportar logs a CSV
- ✅ Filtros aplicables a exportación
- ✅ Formato UTF-8 compatible con Excel

### 6. **APIs REST**
- ✅ Endpoints JSON para integración
- ✅ Estadísticas programáticas
- ✅ Consulta de alertas
- ✅ Actividad por módulo/usuario

---

## 🏗️ Arquitectura

```
Sistema de Auditoría
│
├── 📦 Base de Datos
│   ├── audit_logs (tabla principal, comprimida)
│   ├── audit_critical_alerts (alertas automáticas)
│   ├── 3 vistas optimizadas
│   ├── 2 stored procedures
│   └── 1 trigger automático
│
├── 🎮 Backend
│   ├── AuditLogModel (modelo de datos)
│   ├── auditLogger (middleware automático)
│   ├── auditController (controlador)
│   └── logs routes (rutas)
│
├── 🎨 Frontend
│   ├── /logs (listado principal)
│   ├── /logs/statistics (dashboard)
│   ├── /logs/alerts (alertas críticas)
│   └── /logs/:id (detalle de log)
│
└── 🧪 Testing
    └── Integration tests completos
```

---

## 📊 Schema de Base de Datos

### Tabla Principal: `audit_logs`

```sql
CREATE TABLE audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NULL,
  user_name VARCHAR(100) NULL,
  user_email VARCHAR(100) NULL,
  action ENUM('CREATE', 'UPDATE', 'DELETE', 'VIEW', 'LOGIN', 'LOGOUT', 'EXPORT', 'DOWNLOAD', 'IMPORT'),
  module VARCHAR(30) NOT NULL,
  entity_type VARCHAR(30) NULL,
  entity_id VARCHAR(50) NULL,
  old_values JSON NULL,
  new_values JSON NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  method VARCHAR(10) NULL,
  url VARCHAR(255) NULL,
  status_code SMALLINT UNSIGNED NULL,
  duration_ms SMALLINT UNSIGNED NULL,
  metadata JSON NULL,
  created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
  -- Índices optimizados
  INDEX idx_user_id (user_id),
  INDEX idx_module (module),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at),
  INDEX idx_composite_user_module (user_id, module, created_at)
) ENGINE=InnoDB ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
```

**Optimizaciones:**
- ✅ `ROW_FORMAT=COMPRESSED` - Compresión automática
- ✅ `BIGINT` para ID (soporta trillones de registros)
- ✅ `SMALLINT` para códigos y duraciones (ahorro de espacio)
- ✅ `VARCHAR` ajustados al tamaño real necesario
- ✅ Índices compuestos para consultas frecuentes
- ✅ `TIMESTAMP(3)` incluye milisegundos

### Tabla de Alertas: `audit_critical_alerts`

```sql
CREATE TABLE audit_critical_alerts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  log_id BIGINT UNSIGNED NOT NULL,
  alert_type ENUM('DELETE', 'BULK_DELETE', 'CRITICAL_UPDATE', 'SECURITY'),
  severity ENUM('HIGH', 'CRITICAL'),
  message TEXT NOT NULL,
  notified BOOLEAN DEFAULT FALSE,
  notified_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (log_id) REFERENCES audit_logs(id) ON DELETE CASCADE
);
```

---

## 🚀 Instalación y Configuración

### 1. Aplicar Migración de Base de Datos

```bash
# En desarrollo o producción
./scripts/apply-audit-migration.sh
```

**El script automáticamente:**
- ✅ Crea backup de la BD antes de aplicar cambios
- ✅ Ejecuta la migración completa
- ✅ Verifica que todo se instaló correctamente
- ✅ Muestra resumen de lo creado

### 2. Reiniciar Aplicación

```bash
# En producción con PM2
pm2 restart sgi

# En desarrollo
npm start
```

### 3. Verificar Funcionamiento

```bash
# Health check
curl https://sgi.ultimamilla.com.ar/logs

# API de estadísticas
curl https://sgi.ultimamilla.com.ar/logs/api/statistics
```

---

## 🎯 Uso del Sistema

### Acceso desde el Menú

El sistema está disponible en el menú principal de navegación:

```
Auditoría (dropdown)
├── Logs del Sistema
├── Estadísticas
└── Alertas Críticas
```

### URLs Principales

| Ruta | Descripción |
|------|-------------|
| `/logs` | Listado principal de logs |
| `/logs/statistics` | Dashboard de estadísticas |
| `/logs/alerts` | Alertas críticas pendientes |
| `/logs/:id` | Detalle de un log específico |
| `/logs/user/:userId` | Logs de un usuario |
| `/logs/module/:module` | Logs de un módulo |
| `/logs/timeline/:type/:id` | Timeline de una entidad |
| `/logs/export/csv` | Exportar logs a CSV |

### APIs REST

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/logs/api/logs` | GET | Obtener logs (JSON) |
| `/logs/api/statistics` | GET | Estadísticas (JSON) |
| `/logs/api/alerts` | GET | Alertas críticas (JSON) |
| `/logs/api/activity/module` | GET | Actividad por módulo |
| `/logs/api/users/active` | GET | Usuarios más activos |

---

## 🔧 Configuración del Middleware

El middleware de auditoría se activa automáticamente para **todas las rutas** excepto:

**Rutas excluidas** (para economizar espacio):
- `/health` y `/api/health`
- `/favicon.ico`
- Archivos estáticos (`/assets/`, `/css/`, `/js/`, `/images/`, `/fonts/`)

**Rutas con datos sanitizados**:
- `/auth/login` (no guarda passwords)
- `/auth/change-password`
- Cualquier campo llamado `password`, `token`, `secret` es redactado

---

## 📈 Ejemplos de Consulta

### Desde el Modelo

```javascript
const AuditLogModel = require('./models/AuditLogModel');

// Obtener logs con filtros
const result = await AuditLogModel.getLogs({
  module: 'clientes',
  action: 'DELETE',
  startDate: '2025-10-01'
}, {
  page: 1,
  limit: 50
});

// Obtener estadísticas
const stats = await AuditLogModel.getStatistics(7);

// Obtener alertas críticas
const alerts = await AuditLogModel.getCriticalAlerts();

// Exportar a CSV
const csv = await AuditLogModel.exportToCSV({ module: 'facturas' });
```

### Registrar Log Manualmente

```javascript
const { logChange } = require('./middleware/auditLogger');

// En un controlador
await logChange(
  req,
  'UPDATE',
  'clientes',
  'cliente',
  clienteId,
  oldData,  // Valores anteriores
  newData   // Valores nuevos
);
```

---

## ⚠️ Alertas Automáticas

### Acciones que Generan Alertas

1. **DELETE** - Cualquier eliminación
2. **BULK_DELETE** - Eliminaciones masivas (extensible)
3. **CRITICAL_UPDATE** - Actualizaciones críticas (extensible)
4. **SECURITY** - Eventos de seguridad (extensible)

### Trigger Automático

Se ejecuta automáticamente al insertar un log con `action = 'DELETE'`:

```sql
CREATE TRIGGER trg_audit_delete_alert
AFTER INSERT ON audit_logs
FOR EACH ROW
BEGIN
  IF NEW.action = 'DELETE' THEN
    INSERT INTO audit_critical_alerts (log_id, alert_type, severity, message)
    VALUES (NEW.id, 'DELETE', 'HIGH', ...);
  END IF;
END;
```

### Visualizar Alertas

```bash
# Web UI
https://sgi.ultimamilla.com.ar/logs/alerts

# API
curl https://sgi.ultimamilla.com.ar/logs/api/alerts
```

---

## 🧪 Testing

### Ejecutar Tests

```bash
# Tests completos de auditoría
npm test -- tests/integration/audit.test.js

# Con coverage
npm test -- --coverage tests/integration/audit.test.js
```

### Tests Incluidos

- ✅ Creación de logs
- ✅ Consulta con filtros
- ✅ Paginación
- ✅ Estadísticas
- ✅ Middleware automático
- ✅ Alertas críticas
- ✅ Exportación CSV
- ✅ Búsqueda full-text
- ✅ Performance (< 1 segundo)

---

## 📊 Performance y Almacenamiento

### Estimaciones de Espacio

Con compresión y tipos optimizados:

| Logs/Día | Tamaño/Registro | Espacio/Mes | Espacio/Año |
|----------|-----------------|-------------|-------------|
| 1,000 | ~500 bytes | ~15 MB | ~180 MB |
| 10,000 | ~500 bytes | ~150 MB | ~1.8 GB |
| 100,000 | ~500 bytes | ~1.5 GB | ~18 GB |

**Retención:** Indefinida (según requerimiento del usuario)

### Índices Optimizados

Los índices compuestos aceleran consultas frecuentes:
- `(user_id, module, created_at)` - Logs por usuario y módulo
- `(module, action, created_at)` - Actividad por módulo
- `(action, created_at)` - Logs críticos

---

## 🔐 Seguridad y Privacidad

### Control de Acceso

- ✅ Solo usuarios autenticados pueden ver logs
- ✅ Cualquier usuario puede consultar (según requerimiento)
- ✅ Logs son **inmutables** (no se pueden modificar)
- ✅ Datos sensibles son sanitizados automáticamente

### Datos Protegidos

Campos que NUNCA se guardan en logs:
- Passwords (redactado: `***REDACTED***`)
- Tokens de sesión
- API keys
- Secrets

---

## 🛠️ Mantenimiento

### Monitoreo

```bash
# Ver últimos logs críticos
mysql -e "SELECT * FROM audit_critical_alerts WHERE notified = FALSE ORDER BY created_at DESC LIMIT 10;" sgi_production

# Estadísticas rápidas
mysql -e "CALL sp_audit_get_statistics(7);" sgi_production

# Total de logs
mysql -e "SELECT COUNT(*) as total, MIN(created_at) as desde, MAX(created_at) as hasta FROM audit_logs;" sgi_production
```

### Limpieza (Opcional)

Aunque la retención es indefinida, si eventualmente necesitas limpiar:

```bash
# Logs mayores a 2 años (ejemplo)
mysql -e "DELETE FROM audit_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 2 YEAR);" sgi_production

# Ver cuántos logs hay antiguos sin eliminar
mysql -e "CALL sp_audit_archive_old_logs(730);" sgi_production
```

---

## 📝 Changelog

### Versión 1.0.0 (2025-10-22)

**Implementación inicial:**
- ✅ Sistema completo de auditoría
- ✅ Logging automático de todas las operaciones
- ✅ Dashboard de estadísticas
- ✅ Alertas críticas con triggers
- ✅ Exportación a CSV
- ✅ APIs REST
- ✅ Tests de integración completos
- ✅ Documentación completa
- ✅ Script de migración automatizado
- ✅ Integración con CI/CD

---

## 🆘 Troubleshooting

### Error: "audit_logs table doesn't exist"

```bash
# Aplicar migración
./scripts/apply-audit-migration.sh
```

### Error: "Cannot find module 'AuditLogModel'"

```bash
# Verificar que el archivo existe
ls -la src/models/AuditLogModel.js

# Reiniciar aplicación
pm2 restart sgi
```

### Logs no se están registrando

```bash
# Verificar que el middleware está activo
grep "auditLogger" src/app.js

# Ver logs de la aplicación
pm2 logs sgi --lines 50
```

### Performance lenta

```sql
-- Verificar índices
SHOW INDEX FROM audit_logs;

-- Analizar tabla
ANALYZE TABLE audit_logs;

-- Ver plan de ejecución
EXPLAIN SELECT * FROM audit_logs WHERE module = 'clientes' ORDER BY created_at DESC LIMIT 50;
```

---

## 📞 Soporte

Para problemas, mejoras o preguntas:
- Revisar esta documentación
- Consultar los tests en `tests/integration/audit.test.js`
- Verificar logs de la aplicación: `pm2 logs sgi`
- Revisar logs de BD en `/var/log/mysql/error.log`

---

## ✅ Checklist de Deployment

- [x] Migración de BD aplicada
- [x] Tablas creadas correctamente
- [x] Triggers funcionando
- [x] Middleware integrado
- [x] Rutas montadas
- [x] Menú actualizado
- [x] Tests pasando
- [x] Documentación completa
- [ ] Deployed a producción
- [ ] Verificación post-deployment

---

**Sistema de Auditoría v1.0.0**  
**Fecha:** 22 de Octubre 2025  
**Status:** ✅ Listo para producción
