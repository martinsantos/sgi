# ACTUALIZACIONES REQUERIDAS EN ARQUITECTURA
**Basado en:** Test Integral realizado el 2025-10-07  
**Archivo a actualizar:** `.windsurf/rules/arquitectturaservidor.md`

---

## 🔧 CAMBIOS DETECTADOS EN TEST INTEGRAL

### ❌ Información INCORRECTA en Documentación Actual

| Item | Documentado | Real (Verificado) | Línea |
|------|-------------|-------------------|-------|
| Puerto Astro | 3000 | **4321** | 18, 24, 100, 119, 120 |
| Astro en PM2 | Sí | **No (Standalone)** | 24, 119-120 |
| Admin URL config | Configurado | **No configurado en Nginx** | 9, 21, 103 |
| Directus containers | `directus-app` | **`um25_directus`** | 77 |
| PostgreSQL container | N/A | **`um25_database`** | N/A |
| PM2 name | `sgi-system` | **`sgi`** | 90 |
| PM2 ID | 0 o 3 | **20** | 90, 117 |
| Astro path | N/A | **/root/fumbling-field** | N/A |

---

## 📝 CORRECCIONES ESPECÍFICAS

### Sección: URLs Principales (líneas 5-9)
**ANTES:**
```markdown
- `admin.ultimamilla.com.ar` → Panel de Administración Directus ✅
```

**DESPUÉS:**
```markdown
- `admin.ultimamilla.com.ar` → Panel de Administración Directus ⚠️ NO CONFIGURADO EN NGINX
```

---

### Sección: Nginx Proxy (línea 18)
**ANTES:**
```markdown
│   ├── www.ultimamilla.com.ar → Astro App (puerto 3000) ✅
```

**DESPUÉS:**
```markdown
│   ├── www.ultimamilla.com.ar → Astro App (puerto 4321) ✅
```

---

### Sección: Aplicaciones Principales (línea 24)
**ANTES:**
```markdown
│   ├── 📦 Astro App (Puerto 3000) - Modo Producción via PM2
```

**DESPUÉS:**
```markdown
│   ├── 📦 Astro App (Puerto 4321) - Modo Producción Standalone
```

---

### Sección: Servicios en Docker (líneas 73-81)
**ANTES:**
```bash
$ docker ps
CONTAINER ID   NAMES                  PORTS                    
xxxxxxxxxxxx   directus-app          0.0.0.0:8055->8055/tcp   
yyyyyyyyyyyy   umbot-postgres-prod    5432/tcp                
zzzzzzzzzzzz   umbot-redis-prod      6379/tcp                
aaaaaaaaaaaa   umbot-emergency       0.0.0.0:8092->8092/tcp
```

**DESPUÉS:**
```bash
$ docker ps
CONTAINER ID   NAMES                  STATUS              PORTS                    
ded19000ac4a   um25_directus         Up 5 days          0.0.0.0:8055->8055/tcp   
7e8781edf86a   um25_database         Up 8 days          5432/tcp (PostgreSQL)
c81a384c43e5   umbot-postgres-prod   Up 2 weeks         5432/tcp                
48b080a3dffe   umbot-redis-prod      Up 2 weeks         6379/tcp
```

---

### Sección: Procesos PM2 (líneas 83-92)
**ANTES:**
```bash
┌─────┬────────────────┬─────────────┬─────────┬──────┬────────────┐
│ id  │ name           │ namespace   │ version │ mode │ pid        │
├─────┼────────────────┼─────────────┼─────────┼──────┼────────────┤
│ 0   │ sgi-system     │ default     │ 1.0.0   │ fork │ 138689     │
└─────┴────────────────┴─────────────┴─────────┴──────┴────────────┘
```

**DESPUÉS:**
```bash
┌────┬────────┬─────────────┬─────────┬──────┬────────┬────────┬──────┐
│ id │ name   │ namespace   │ version │ mode │ pid    │ uptime │ ↺    │
├────┼────────┼─────────────┼─────────┼──────┼────────┼────────┼──────┤
│ 20 │ sgi    │ default     │ 1.0.0   │ fork │ 785731 │ 23h    │ 371* │
└────┴────────┴─────────────┴─────────┴──────┴────────┴────────┴──────┘

* NOTA: 371 reinicios indican problema crítico (ver TEST_INTEGRAL_RESULTS.md)
```

---

### Sección: Estado Actual - PRODUCCIÓN (líneas 96-103)
**ANTES:**
```markdown
| **Ultima Milla** | ultimamilla.com.ar | Astro (Producción) | 3000 | ✅ HTTP 200 |
| **Admin Panel** | admin.ultimamilla.com.ar | Directus CMS | 8055 | ✅ Activo |
```

**DESPUÉS:**
```markdown
| **Ultima Milla** | ultimamilla.com.ar | Astro (Producción) | 4321 | ✅ HTTP 200 |
| **Admin Panel** | admin.ultimamilla.com.ar | Directus CMS | 8055 | ⚠️ Puerto activo, URL no configurada |
```

---

### Sección: PM2 Configuration (líneas 113-121)
**ANTES:**
```bash
# Estado actual PM2
id │ name │ status │ cpu │ memory │ port
3  │ sgi  │ online │ 0%  │ 92.7mb │ 3456

# Astro ejecutándose directamente en puerto 3000
PID: 102055 | Status: LISTEN | Port: 3000
```

**DESPUÉS:**
```bash
# Estado actual PM2
id │ name │ status │ cpu │ memory │ port │ restarts
20 │ sgi  │ online │ 0%  │ 44.7mb │ 3456 │ 371 ⚠️

# Astro ejecutándose directamente (NO en PM2)
PID: 745766 | Status: LISTEN | Port: 4321
Path: /root/fumbling-field/node_modules/.bin/astro
Command: astro dev --host 0.0.0.0 --port 4321
```

---

### Sección: Archivos de Configuración (líneas 123-127)
**ANTES:**
```markdown
- **Astro**: Proceso directo con `astro dev --port 3000`
```

**DESPUÉS:**
```markdown
- **Astro**: Proceso directo con `astro dev --port 4321` en `/root/fumbling-field`
```

---

### Sección: Comandos de Gestión (líneas 138-139)
**ANTES:**
```bash
netstat -tulpn | grep -E ':3000|:3456|:9000'
```

**DESPUÉS:**
```bash
netstat -tulpn | grep -E ':4321|:3456|:9000|:8055'
```

---

## ➕ SECCIONES A AGREGAR

### Nueva Sección: Recursos del Servidor
**Agregar después de línea 128 (antes de "Mantenimiento")**

```markdown
## 📊 Recursos del Servidor

### Hardware Actual (2025-10-07)
- **CPU:** x86_64 (suficiente)
- **RAM:** 1.7GB (⚠️ 82% usado - crítico)
- **Disco:** 50GB (⚠️ 79% usado - crítico)
- **SWAP:** 1.9GB (⚠️ 50% usado - alto)

### Recomendaciones de Upgrade
- **RAM:** Mínimo 4GB
- **Disco:** Mínimo 100GB
- **Implementar:** Rotación automática de logs

### Sistema Operativo
- **OS:** Rocky Linux
- **Kernel:** 5.14.0-570.19.1.el9_6.x86_64
- **Uptime:** 18+ días (estable)
```

---

### Nueva Sección: Problemas Conocidos
**Agregar al final del documento**

```markdown
## ⚠️ PROBLEMAS CONOCIDOS

### 1. Tabla `clientes` Faltante (CRÍTICO)
**Detectado:** 2025-10-07  
**Síntoma:** Error `ER_NO_SUCH_TABLE` al intentar crear clientes  
**Impacto:** 371 reinicios de PM2 en 23 horas  
**Estado:** 🔴 PENDIENTE DE SOLUCIÓN  
**Ver:** `PLAN_ACCION_CORRECTIVA.md` para solución

### 2. Middleware `req.flash` No Configurado
**Detectado:** 2025-10-07  
**Síntoma:** `TypeError: req.flash is not a function`  
**Impacto:** Errores en creación de clientes  
**Estado:** 🔴 PENDIENTE DE SOLUCIÓN  
**Ver:** `PLAN_ACCION_CORRECTIVA.md` para solución

### 3. Recursos del Servidor Limitados
**Detectado:** 2025-10-07  
**Síntoma:** Alto uso de RAM (82%) y disco (79%)  
**Impacto:** Performance degradada, uso de SWAP  
**Estado:** 🟠 REQUIERE ATENCIÓN  
**Ver:** `PLAN_ACCION_CORRECTIVA.md` para solución

### 4. Admin URL No Configurada
**Detectado:** 2025-10-07  
**Síntoma:** `admin.ultimamilla.com.ar` no tiene configuración Nginx  
**Impacto:** Directus solo accesible por IP:puerto  
**Estado:** 🟡 BAJA PRIORIDAD  
**Ver:** `PLAN_ACCION_CORRECTIVA.md` para configuración
```

---

### Nueva Sección: Base de Datos
**Agregar después de "Servicios en Docker"**

```markdown
## 🗄️ Base de Datos

### MariaDB/MySQL
- **Versión:** 10.11.13-MariaDB
- **Host:** localhost (127.0.0.1)
- **Puerto:** 3306

### Bases de Datos Activas
- **sgi_production** (SGI System)
  - Usuario: `sgi_user`
  - Tablas: 115 tablas
  - ⚠️ Falta tabla: `clientes`

### Estructura de Datos
Sistema usa las siguientes tablas para clientes:
- `personas` (tabla principal)
- `persona_contactos` (contactos)
- `persona_terceros` (relaciones)

**IMPORTANTE:** El código actual intenta usar tabla `clientes` que NO EXISTE.
```

---

## 🔄 APLICAR CAMBIOS

Para aplicar estos cambios, editar manualmente el archivo:
```bash
# Ruta del archivo
/Volumes/SDTERA/ultima milla/2025/SGI/.windsurf/rules/arquitectturaservidor.md

# O si estás en el servidor
# /home/sgi.ultimamilla.com.ar/.windsurf/rules/arquitectturaservidor.md
```

**Pasos:**
1. Hacer backup del archivo actual
2. Aplicar las correcciones listadas arriba
3. Agregar las nuevas secciones
4. Guardar y verificar

---

## 📚 REFERENCIAS

**Documentos Relacionados:**
- `TEST_INTEGRAL_RESULTS.md` - Resultados completos del test
- `PLAN_ACCION_CORRECTIVA.md` - Plan para resolver problemas
- `arquitectturaservidor.md` - Archivo a actualizar

**Verificación realizada:** 2025-10-07 21:40 UTC  
**Método:** SSH directo + pruebas de conectividad HTTP/HTTPS  
**Herramientas:** netstat, docker ps, pm2 list, mysql, curl, nginx -t

---

**NOTA IMPORTANTE:**  
Estos cambios reflejan el **ESTADO REAL** del servidor verificado mediante test integral.  
La documentación anterior contenía información desactualizada o incorrecta.
