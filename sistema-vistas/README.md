# 📊 Sistema de Gestión Interna (SGI) - Última Milla

**Servidor:** 23.105.176.45  
**URL:** https://sgi.ultimamilla.com.ar  
**PM2 Process:** sgi  
**Base de Datos:** sgi_production (MySQL/MariaDB)

---

## 🏗️ ARQUITECTURA

### Stack Tecnológico

- **Backend:** Node.js + Express
- **Template Engine:** Handlebars
- **Base de Datos:** MySQL/MariaDB
- **Process Manager:** PM2
- **Servidor Web:** Nginx (Proxy Inverso)

### Estructura de Directorios

```
/home/sgi.ultimamilla.com.ar/
├── src/
│   ├── models/          # Modelos de datos
│   ├── controllers/     # Controladores
│   ├── routes/          # Rutas de Express
│   ├── views/           # Templates Handlebars
│   └── config/          # Configuración
├── ecosystem.config.js  # Configuración PM2
└── package.json
```

---

## 📋 MÓDULO DE PROYECTOS

### Características Principales

#### 1. Listado de Proyectos
- ✅ Paginación (20 proyectos por página)
- ✅ Ordenamiento server-side por cualquier columna
- ✅ Filtros por descripción, cliente, estado
- ✅ Búsqueda por ID de proyecto
- ✅ Certificados asociados expandibles

#### 2. Vista de Proyecto Individual
- ✅ Información completa del proyecto
- ✅ Certificados activos e inactivos separados
- ✅ Estados con badges de alto contraste
- ✅ Asociar/desasociar certificados
- ✅ Navegación contextual

#### 3. Certificados
- ✅ 5 estados disponibles:
  - 0: Pendiente (🟡 Amarillo)
  - 1: Aprobado (🔵 Azul)
  - 2: Facturado (🟢 Verde)
  - 3: En Proceso (🟣 Púrpura)
  - 4: Anulado (🔴 Rojo)
- ✅ Separación activos/inactivos
- ✅ Vinculación 100% correcta

---

## 🔧 FUNCIONALIDADES IMPLEMENTADAS

### Ordenamiento Server-Side

**Archivos:**
- `src/models/ProyectoModel.js`
- `src/controllers/proyectoController.js`
- `src/views/proyectos/listar-tabla.handlebars`

**Uso:**
```
?sortBy=descripcion&sortOrder=ASC
?sortBy=fecha_inicio&sortOrder=DESC
?sortBy=total_certificados&sortOrder=DESC
```

**Campos ordenables:**
- id, descripcion, cliente_nombre
- estado, fecha_inicio, fecha_cierre
- total_certificados, monto_certificados
- monto_facturado, precio_venta

### Filtros

**Parámetros:**
```
?id=P-123
?descripcion=Soporte
?cliente=Municipalidad
?estado=2
```

### Navegación Contextual

**Parámetro return:**
```
/certificados/ver/{{id}}?return=/proyectos/ver/{{proyecto_id}}
```

Permite volver al proyecto después de revisar un certificado.

---

## 📊 BASE DE DATOS

### Tablas Principales

#### proyectos
```sql
- id (UUID)
- descripcion
- estado (1-4)
- fecha_inicio
- fecha_cierre
- precio_venta
- personal_id (FK → persona_terceros)
```

#### certificacions
```sql
- id (UUID)
- proyecto_id (FK → proyectos)
- numero
- fecha
- alcance
- importe
- estado (0-4)
- activo (0-1)
```

#### persona_terceros
```sql
- id (UUID)
- nombre
- apellido
- tipo_persona
```

### Estadísticas

| Métrica | Valor |
|---------|-------|
| Total Proyectos | 523 |
| Total Certificados | 2,564 |
| Certificados Vinculados | 100% |
| Proyectos con Certificados | 99.4% |

---

## 🔐 Autenticación basada en Sesiones

- Middleware `requireAuth` protege todas las rutas y persiste la URL solicitada para redirigir después del login.
- El formulario de acceso acepta **usuario o email** y utiliza bcrypt para validar contraseñas contra la tabla `users`.
- Las sesiones Express se almacenan en memoria con cookies `httpOnly` (24 h) y variables de usuario expuestas a las vistas.
- Documentación ampliada: ver `SOLUCION_AUTENTICACION_SESIONES_2025-10-27.md`.

### Flujo resumido
1. Usuario accede a cualquier ruta protegida.
2. `requireAuth` redirige a `/auth/login` y guarda `returnTo` en la sesión.
3. Tras autenticarse se actualiza `last_login`, se registra auditoría y se redirige a la URL original.
4. Logout marca al usuario como offline y limpia la sesión.

## 🚀 DESPLIEGUE

### Comandos PM2

```bash
# Ver status
pm2 status sgi

# Reiniciar
pm2 restart sgi

# Ver logs
pm2 logs sgi --lines 50

# Monitorear
pm2 monit
```

### Actualizar Archivos

```bash
# Copiar archivos
scp archivo.js root@23.105.176.45:/home/sgi.ultimamilla.com.ar/src/

# Reiniciar servicio
ssh root@23.105.176.45 "pm2 restart sgi"
```

### Verificar Despliegue

```bash
# Status PM2
pm2 status | grep sgi

# Logs en tiempo real
pm2 logs sgi --lines 20 --nostream
```

---

## 🧪 TESTING

### Tests Realizados

| Test | Resultado |
|------|-----------|
| Estados de certificados (5) | ✅ |
| Mapeo de estados | ✅ |
| Carga de certificados | ✅ |
| Ordenamiento server-side | ✅ |
| Filtros | ✅ |
| Vista single | ✅ |
| Vinculación | ✅ 100% |
| PM2 Status | ✅ Online |

### Verificación Manual

1. **Listado de Proyectos:**
   - https://sgi.ultimamilla.com.ar/proyectos
   - Verificar ordenamiento
   - Verificar filtros
   - Verificar paginación

2. **Vista de Proyecto:**
   - Click en "Ver" en cualquier proyecto
   - Verificar certificados activos/inactivos
   - Verificar badges de estado
   - Verificar navegación

3. **Certificados:**
   - Click en "Ver" en un certificado
   - Verificar que vuelve al proyecto
   - Verificar estados correctos

---

### Prerrequisitos de testing automatizado

1. Crear base de datos `test_sgi` con las mismas migraciones que producción.
2. Ejecutar `./scripts/apply-audit-migration.sh` apuntando al entorno de test para generar tablas `audit_logs` y `audit_critical_alerts`.
3. Configurar variables `TEST_DB_*` en `.env` con credenciales válidas.

Sin las tablas de auditoría los tests de integración fallan al consultar `audit_logs`.

## 📝 DOCUMENTACIÓN TÉCNICA

### Archivos de Documentación

- `RESUMEN_FINAL_CERTIFICADOS_2025-10-29.md` - Resumen completo
- `SOLUCION_5_FIXS_CERTIFICADOS_2025-10-29.md` - Soluciones implementadas
- `ANALISIS_ESTADOS_CERTIFICADOS_2025-10-29.md` - Análisis de estados
- `FIX_BADGES_CERTIFICADOS_CONTRASTE_2025-10-29.md` - Fix de badges
- `PLAN_5_FIXS_CERTIFICADOS_2025-10-29.md` - Plan de trabajo

### Métodos Principales

#### ProyectoModel

```javascript
// Obtener proyectos con paginación y ordenamiento
static async getProyectos(page, limit, filtros, sortBy, sortOrder)

// Obtener certificados de un proyecto
static async getCertificadosProyecto(proyectoId)

// Obtener proyecto completo (para vista)
static async getProyectoCompleto(id)

// Obtener proyecto simple (para edición)
static async getProyectoById(id)
```

#### CertificadoModel

```javascript
// Estados disponibles
static ESTADOS = {
  PENDIENTE: 0,
  APROBADO: 1,
  FACTURADO: 2,
  EN_PROCESO: 3,
  ANULADO: 4
}

// Mapeo de estados
static ESTADO_NOMBRES = {
  0: 'Pendiente',
  1: 'Aprobado',
  2: 'Facturado',
  3: 'En Proceso',
  4: 'Anulado'
}
```

---

## ⚠️ ISSUES CONOCIDOS

### Frontend - Renderizado de Certificados en Listado

**Síntoma:**
- Cajas grises vacías en lugar de badges
- Solo en listado de proyectos
- Vista single funciona correctamente

**Status:** ⚠️ EN INVESTIGACIÓN

**Workaround:**
- Usar vista single para ver certificados
- Backend funciona correctamente
- Datos se cargan pero no se renderizan

---

## 🔐 SEGURIDAD

### Acceso

- Sistema autenticado
- Requiere login
- Sesiones gestionadas por Express

### Base de Datos

- Usuario: root (solo para queries directas)
- Conexión pool configurada
- Queries parametrizadas

---

## 📞 SOPORTE

### Logs

```bash
# Ver logs de aplicación
pm2 logs sgi

# Ver logs de Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Ver logs de MySQL
tail -f /var/log/mysql/error.log
```

### Troubleshooting

**Aplicación no responde:**
```bash
pm2 restart sgi
```

**Error de BD:**
```bash
# Verificar conexión
mysql -u root -e "SELECT 1"

# Verificar tablas
mysql -u root sgi_production -e "SHOW TABLES"
```

**Nginx no sirve:**
```bash
systemctl status nginx
systemctl reload nginx
```

---

## 📈 PRÓXIMAS MEJORAS

### Pendientes

1. ⏳ Fix de renderizado de certificados en listado
2. ⏳ Optimización de queries (reducir N+1)
3. ⏳ Caché de certificados
4. ⏳ Tests automatizados

### Propuestas

1. API REST para certificados
2. Carga asíncrona de certificados
3. Paginación de certificados en proyecto
4. Exportación a PDF/Excel

---

**Última actualización:** 29 de Octubre 2025, 17:45 UTC-3  
**Versión:** 1.0.0  
**Mantenedor:** Equipo Última Milla
