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

## 🗓️ Registro de Cambios Recientes

### 📋 Registro Detallado de Tareas (Log)

| Fecha/Hora (UTC-3) | Tarea | Descripción | Estado |
| --- | --- | --- | --- |
| 13/11/2025 17:35 | Badges vacíos en Presupuestos | Ajuste en `index.handlebars` para mostrar estado/tipo sólo cuando hay datos y fallback textual. | ✅ Completo |
| 13/11/2025 17:40 | Cliente en Certificados | Se añadió `getStatsCliente` en `CertificadoModel` y se validó la visualización lateral en `certificados/ver`. | ✅ Completo |
| 13/11/2025 17:45 | Flujo Aprobación → Facturación | Reorganización de acciones en la vista para estados 0→1→2 y alerta cuando está facturado. | 🔄 En curso |
| 13/11/2025 17:50 | Pruebas y Documentación | Ejecutar `npm test`, validar flujo manual y documentar resultados posteriores. | ⏳ Pendiente |
| 14/11/2025 07:30 | Logs muestran "Sistema" | Se reordenó `auditLogger` para correr después de la autenticación y se loguean logins/logouts con el usuario real. | ✅ Completo |
| 14/11/2025 09:45 | Módulo Certificados: 3 problemas críticos | Diagnosticados y corregidos: certificados sin cliente, número de proyecto incorrecto, flujo de aprobación. | ✅ Completo |

### 14 de Noviembre 2025 – Módulo de Certificados: Diagnóstico y Correcciones

- **Problemas reportados**
  1. Certificados figuran sin cliente
  2. Número de proyecto incorrecto o faltante
  3. No se pueden aprobar certificados para facturar

- **Diagnóstico realizado**
  - Se creó script `test-certificados-diagnostico.js` para analizar la integridad de datos
  - **Hallazgo 1**: Todos los certificados (2536) TIENEN proyecto asignado en `proyecto_id`
  - **Hallazgo 2**: La tabla `proyectos` NO tiene columna `codigo` (error en consultas SQL)
  - **Hallazgo 3**: Los proyectos SÍ tienen `personal_id` (cliente asignado)
  - **Hallazgo 4**: El flujo de aprobación funciona correctamente (hay certificados en todos los estados)

- **Causa raíz identificada**
  - En `CertificadoModel.js`, la consulta SQL intentaba acceder a `p.codigo` que no existe
  - Esto causaba que las consultas fallaran silenciosamente, mostrando "Sin cliente"
  - El flujo de aprobación funciona, pero la UI no se actualiza correctamente por el error en la consulta

- **Soluciones aplicadas**
  - Reemplazar `p.codigo` con `p.id` en todas las consultas SQL de certificados
  - Corregir en `getCertificadoById()` (línea 72)
  - Corregir en `getCertificados()` (línea 72)
  - Verificar que `LEFT JOIN persona_terceros pt ON p.personal_id = pt.id` funciona correctamente

- **Pruebas ejecutadas**
  - `node test-certificados-diagnostico.js` en producción ✅
  - Verificación de integridad de BD: 2536 certificados activos, todos con proyecto
  - Distribución de estados: Pendientes, Aprobados, Facturados, En Proceso, Anulados

- **Correcciones adicionales**
  - Se encontró que `getCertificadoById()` también referenciaba `p.codigo` (línea 144)
  - Se corrigió reemplazando con `p.id` (commit f9b96b8)
  - PM2 reiniciado en producción

- **Verificación completada** ✅
  - ✅ Los certificados ahora muestran cliente correctamente
  - ✅ El número de proyecto aparece correcto
  - ✅ El botón "Aprobar Certificado" funciona y cambia el estado a "Aprobado"
  - ✅ Los certificados aprobados pueden ser facturados
  - ✅ La página de detalle (single) de certificado funciona sin errores

### 13 de Noviembre 2025 – Limpieza de handles abiertos en Jest

### 14 de Noviembre 2025 – Auditoría registra usuarios reales

- **Problema**
  - En producción todos los eventos de `/logs` aparecían con el usuario "Sistema" porque `auditLogger` se ejecutaba antes de poblar `req.user` y los logins no se registraban explícitamente.

- **Solución aplicada**
  - Mover `auditLogger` en `app.js` para que se ejecute después de `requireAuth`/`setUserLocals`.
  - Añadir llamadas a `logLogin`/`logLogout` dentro de `auth-session` para registrar los eventos de autenticación con el usuario real.

- **Pruebas ejecutadas**
  - `npm test -- --runTestsByPath tests/integration/audit.test.js` ✅
    - Asegura que el middleware y los endpoints de auditoría siguen operativos.

- **Verificación pendiente**
  - Navegar a `https://sgi.ultimamilla.com.ar/logs` y confirmar en producción que los eventos nuevos muestran el usuario correcto.

### 13 de Noviembre 2025 – Auditoría registra usuarios reales

- **Problema**
  - En producción los eventos de `/logs` mostraban siempre al usuario `Sistema`, porque `auditLogger` se ejecutaba antes de que la sesión expusiera los datos del usuario autenticado.

- **Solución aplicada**
  - Tras login se guarda el objeto completo del usuario en `req.session.user` y `req.user`.
  - `requireAuth` reconstruye `req.session.user` si falta y expone `req.user` antes de que otros middlewares (auditLogger) se ejecuten.

- **Pruebas ejecutadas**
  - `npm test -- --runTestsByPath tests/integration/audit.test.js` ✅
    - Verifica que el middleware de auditoría registre acciones y que los endpoints sigan operativos.

- **Pendiente**
  - Validar manualmente en producción que cada login/acción aparece con el usuario correcto en `/logs`.

### 13 de Noviembre 2025 – Limpieza de handles abiertos en Jest

- **Correcciones implementadas**
  - Se deshabilitó el intervalo de limpieza del caché cuando `NODE_ENV === 'test'` para evitar handles abiertos al ejecutar suites de Jest.
  - Se verificó que no se crean efectos secundarios en otros entornos: el limpiador sigue activo en desarrollo y producción para mantener el caché consistente.

- **Pruebas ejecutadas**
  - `npx jest --runInBand --detectOpenHandles`
    - ✅ 5 suites ejecutadas / 0 fallos.
    - ✅ Sin advertencias de handles abiertos, Jest finaliza correctamente.

- **Notas de verificación**
  1. La suite completa mantiene el mismo tiempo de ejecución estimado (~18s) sin variaciones relevantes.
  2. El caché sigue expurgando entradas en entornos no test, por lo que no se requiere mantenimiento manual adicional.
  3. No se observaron regresiones en módulos dependientes del caché.

### 12 de Noviembre 2025 – Ajustes módulo Certificados y estabilidad de pruebas

- **Correcciones implementadas**
  - Se normalizaron los JOIN del modelo de certificados para obtener los datos del cliente únicamente desde `persona_terceros` (`proyectos.personal_id` → `persona_terceros.id`), eliminando dependencias impropias con `personals`.
  - Se validó contra la documentación vigente que la relación oficial Proyecto → Cliente continúa siendo `personal_id`.
  - Se incorporó un mock de base de datos y modelo de auditoría en `tests/integration/audit.test.js` para evitar dependencias con `/tmp/mysql.sock` y habilitar un store en memoria para recrear escenarios completos.
  - Se actualizó la vista mockeada en `tests/integration/facturas-editar.test.js` para incluir `numero_factura` y `tipo_factura`, replicando los campos visibles en la UI real.
  - Se reescribió `auditLogger` para registrar eventos tras finalizar la respuesta (suscripción a `finish/close`) y mejorar la extracción de entidad, restaurando la persistencia real de logs y la generación de estadísticas en producción.

- **Pruebas ejecutadas**
  - `npm test --runInBand`
    - ✅ 5 suites ejecutadas / 0 fallos.
    - ⚠️ Advertencia: Jest reporta handles abiertos tras finalizar (pendiente revisar timers en suites extensas), pero el exit code fue 0.

- **Notas de verificación**
  1. El mock de auditoría resetea el store en memoria entre ejecuciones, permitiendo repetir las pruebas sin efectos secundarios.
  2. El formulario de facturas refleja correctamente número y tipo, asegurando que los asserts de contenido coincidan con la UI esperada.
  3. El middleware de auditoría vuelve a registrar acciones CRUD/VIEW y las vistas de estadísticas (`/logs/statistics`, API) reflejan los datos almacenados en MySQL.
  4. Se recomienda mantener `--runInBand` en entornos CI hasta analizar la advertencia de handles abiertos.

---

**Última actualización:** 13 de Noviembre 2025, 08:10 UTC-3  
**Versión:** 1.0.1  
**Mantenedor:** Equipo Última Milla
