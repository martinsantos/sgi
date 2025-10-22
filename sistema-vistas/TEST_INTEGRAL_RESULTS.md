# TEST INTEGRAL DEL SISTEMA SGI - RESULTADOS
**Fecha:** 2025-10-07 18:40:09 ART  
**Servidor:** 23.105.176.45  
**Ejecutado por:** Cascade AI  

---

## 📊 RESUMEN EJECUTIVO

### ✅ Servicios Operativos
| Servicio | Estado | Puerto | Uptime | Observaciones |
|----------|--------|--------|--------|---------------|
| **Nginx** | ✅ ACTIVO | 80/443 | 2w 4d | Proxy reverso funcionando |
| **SGI System** | ✅ ACTIVO | 3456 | 23h | 371 reinicios (ver problemas) |
| **Directus CMS** | ✅ ACTIVO | 8055 | 5d | Contenedor Docker healthy |
| **PostgreSQL (Directus)** | ✅ ACTIVO | 5432 | 8d | Contenedor Docker healthy |
| **PostgreSQL (UMBot)** | ✅ ACTIVO | 5432 | 2w | Contenedor Docker healthy |
| **Redis (UMBot)** | ✅ ACTIVO | 6379 | 2w | Contenedor Docker healthy |
| **PHP-FPM (WordPress)** | ✅ ACTIVO | 9000 | N/A | WordPress Vivero Los Cocos |
| **Astro App** | ✅ ACTIVO | 4321 | 7d | Proceso desde /root/fumbling-field |
| **MariaDB** | ✅ ACTIVO | 3306 | N/A | Versión 10.11.13 |

### 🌐 URLs Públicas Verificadas
| URL | Estado HTTP | Observaciones |
|-----|-------------|---------------|
| `www.ultimamilla.com.ar` | ✅ HTTP 200 | Cloudflare activo |
| `sgi.ultimamilla.com.ar` | ✅ HTTP 401 | Auth requerida (correcto) |
| `viveroloscocos.com.ar` | ✅ HTTP 200 | WordPress funcionando |
| `admin.ultimamilla.com.ar` | ⚠️ NO CONFIGURADO | Falta configuración Nginx |

---

## 🚨 PROBLEMAS CRÍTICOS DETECTADOS

### 1. **ERROR DE BASE DE DATOS - TABLA FALTANTE**
**Severidad:** 🔴 CRÍTICA  
**Descripción:** La tabla `clientes` no existe en la base de datos `sgi_production`

**Evidencia:**
```sql
Error: Table 'sgi_production.clientes' doesn't exist
Error Code: ER_NO_SUCH_TABLE (1146)
```

**Impacto:**
- El sistema SGI falla al intentar crear clientes
- Ha causado **371 reinicios** del proceso PM2 en 23 horas
- Operaciones CRUD de clientes no funcionan

**Causa Raíz:**
- El código en `clientesController.js` intenta hacer INSERT en tabla inexistente
- El sistema usa las tablas: `personas`, `persona_contactos`, `persona_terceros`
- Hay una desincronización entre el código y el esquema de BD

**Solución Recomendada:**
1. Crear tabla `clientes` con esquema adecuado, O
2. Refactorizar código para usar tabla `personas` existente

---

### 2. **ERROR DE FUNCIÓN - req.flash**
**Severidad:** 🟡 MEDIA  
**Descripción:** `TypeError: req.flash is not a function`

**Evidencia:**
```javascript
TypeError: req.flash is not a function
    at createCliente (/home/sgi.ultimamilla.com.ar/src/controllers/clientesController.js:589:11)
```

**Causa Raíz:**
- Middleware `express-session` o `connect-flash` no configurado
- El controlador intenta usar `req.flash()` sin la dependencia instalada

**Solución Recomendada:**
1. Instalar y configurar `connect-flash`
2. O remover referencias a `req.flash()` del código

---

### 3. **RECURSOS DEL SERVIDOR LIMITADOS**
**Severidad:** 🟠 ALTA  
**Descripción:** Recursos del servidor cerca de límites críticos

**Métricas Actuales:**
- **Disco:** 79% usado (39GB/50GB) - ⚠️ Crítico
- **RAM:** 82% usado (1.4GB/1.7GB) - ⚠️ Crítico
- **SWAP:** 50% usado (992MB/1.9GB) - ⚠️ Alto

**Impacto:**
- El servidor está usando SWAP, lo que degrada performance
- Poco espacio en disco para logs y datos
- Riesgo de fallos por falta de memoria

**Solución Recomendada:**
1. Limpiar logs antiguos
2. Considerar upgrade de recursos (RAM y disco)
3. Implementar rotación automática de logs
4. Optimizar contenedores Docker (límites de memoria)

---

### 4. **DOCUMENTACIÓN DESACTUALIZADA**
**Severidad:** 🟡 MEDIA  
**Descripción:** Discrepancias entre documentación y estado real

**Discrepancias Detectadas:**
1. **Puerto Astro:** Documentación dice 3000, real es **4321**
2. **admin.ultimamilla.com.ar:** Documentado pero no configurado en Nginx
3. **Proceso Astro:** No está en PM2, corre como proceso standalone

**Solución Recomendada:**
1. Actualizar archivo `arquitectturaservidor.md`
2. Agregar Astro a PM2 para mejor gestión
3. Configurar dominio admin.ultimamilla.com.ar si es necesario

---

## 📋 CONFIGURACIÓN DETECTADA

### PM2 Process Manager
```
ID: 20
Name: sgi
Status: online
PID: 785731
Uptime: 23 hours
Memory: 44.7MB
CPU: 0%
Restarts: 371 ⚠️
Node Version: 20.19.4
Working Dir: /home/sgi.ultimamilla.com.ar
Entry Point: index.js
```

### Contenedores Docker Activos
```
CONTAINER           STATUS              PORTS
um25_directus       Up 5 days          0.0.0.0:8055->8055/tcp
um25_database       Up 8 days          5432/tcp (healthy)
umbot-postgres-prod Up 2 weeks         5432/tcp (healthy)
umbot-redis-prod    Up 2 weeks         6379/tcp (healthy)
```

### Nginx Sites Enabled
```
- /etc/nginx/sites-enabled/sgi.ultimamilla.com.ar
- /etc/nginx/sites-enabled/ultimamilla.com.ar
- /etc/nginx/sites-enabled/viveroloscocos.com.ar
```

### Base de Datos
- **Motor:** MariaDB 10.11.13
- **Base de Datos:** sgi_production
- **Usuario:** sgi_user
- **Tablas:** 115 tablas verificadas
- **Tabla faltante:** `clientes` ❌

---

## 🔧 ACCIONES CORRECTIVAS RECOMENDADAS

### Prioridad 1 - Inmediata
1. ✅ **Crear tabla `clientes`** o refactorizar código para usar `personas`
2. ✅ **Configurar middleware flash** o remover dependencia
3. ✅ **Limpiar logs** para liberar espacio en disco

### Prioridad 2 - Corto Plazo (1-2 días)
4. ✅ **Actualizar documentación** con configuración real
5. ✅ **Configurar admin.ultimamilla.com.ar** en Nginx
6. ✅ **Agregar Astro a PM2** para mejor gestión
7. ✅ **Implementar rotación de logs** automática

### Prioridad 3 - Mediano Plazo (1 semana)
8. ✅ **Upgrade recursos del servidor** (RAM y disco)
9. ✅ **Optimizar configuración Docker** (límites de memoria)
10. ✅ **Implementar monitoreo** (alerts de recursos)

---

## 📊 MÉTRICAS DE SALUD DEL SISTEMA

### Disponibilidad
- **Nginx:** ✅ 100%
- **SGI Application:** ⚠️ 95% (reinicios frecuentes)
- **Docker Services:** ✅ 99%
- **URLs Públicas:** ✅ 100%

### Performance
- **Response Time SGI:** < 100ms (normal)
- **CPU Usage:** Bajo (< 1%)
- **Memory Usage:** ⚠️ Alto (82%)
- **Disk I/O:** Normal

### Estabilidad
- **Reinicios SGI:** ⚠️ 371 en 23h (16/hora promedio)
- **Docker Containers:** ✅ Estables
- **Nginx:** ✅ Estable

---

## 📝 VERIFICACIÓN DE ARQUITECTURA

### Arquitectura Documentada vs Real

| Componente | Documentado | Real | Estado |
|------------|-------------|------|--------|
| Astro Port | 3000 | **4321** | ❌ Discrepancia |
| SGI Port | 3456 | 3456 | ✅ Correcto |
| Directus Port | 8055 | 8055 | ✅ Correcto |
| PHP-FPM Port | 9000 | 9000 | ✅ Correcto |
| Admin URL | Configurado | **No existe** | ❌ Discrepancia |
| Astro en PM2 | Sí | **No (standalone)** | ❌ Discrepancia |

---

## 🎯 CONCLUSIÓN

El sistema está **OPERATIVO** pero con **problemas críticos** que afectan la estabilidad:

### ✅ Aspectos Positivos
- Todos los servicios web están activos y respondiendo
- URLs públicas accesibles
- Contenedores Docker estables
- Base de datos accesible

### ⚠️ Problemas Críticos Identificados
1. **Tabla `clientes` faltante** → Causando 371 reinicios/23h
2. **Recursos del servidor críticos** → 79% disco, 82% RAM
3. **Documentación desactualizada** → Errores en arquitectura
4. **Configuración faltante** → admin.ultimamilla.com.ar

### 🎯 Prioridad de Acción
**INMEDIATA:** Resolver problema de tabla `clientes` para estabilizar el sistema.

---

## 📞 INFORMACIÓN ADICIONAL

**Sistema Operativo:** Rocky Linux 5.14.0-570.19.1.el9_6  
**Uptime del Servidor:** 18 días, 8 horas  
**Node.js Version:** 20.19.4  
**PM2 Version:** 6.0.9  

**Última actualización de este reporte:** 2025-10-07 21:41 UTC
