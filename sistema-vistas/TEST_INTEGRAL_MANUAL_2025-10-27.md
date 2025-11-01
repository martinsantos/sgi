# 🧪 TEST INTEGRAL MANUAL DEL SISTEMA SGI

**Fecha:** 27 de Octubre 2025
**Objetivo:** Verificar que TODOS los módulos funcionen correctamente
**Estado:** EN PROGRESO

---

## 📋 MÓDULOS A VERIFICAR

### 1. CERTIFICADOS ✅
- [ ] GET /certificados - Listado con paginación
- [ ] GET /certificados?page=2 - Navegación entre páginas
- [ ] GET /certificados?cliente_id=... - Filtro por cliente
- [ ] GET /certificados/ver/:id - Vista single
- [ ] Debe mostrar: Número, Fecha, Cliente, Estado, Importe
- [ ] Debe mostrar cliente correcto (no autor)
- [ ] Debe mostrar proyecto asociado
- [ ] Debe mostrar "Otros Certificados del Proyecto"
- [ ] Debe mostrar "Otros Proyectos del Cliente"

**URL de Prueba:** https://sgi.ultimamilla.com.ar/certificados

---

### 2. FACTURAS EMITIDAS ✅
- [ ] GET /facturas/emitidas - Listado
- [ ] GET /facturas/api/emitidas - API con paginación
- [ ] GET /facturas/emitidas/:id - Vista single
- [ ] GET /facturas/emitidas/:id/editar - Formulario de edición
- [ ] POST /facturas/emitidas/:id/editar - Guardar cambios
- [ ] Campos editables: Cliente, Fecha Vencimiento, Estado, Observaciones
- [ ] Cambios deben persistir en BD

**URL de Prueba:** https://sgi.ultimamilla.com.ar/facturas/emitidas

---

### 3. FACTURAS RECIBIDAS ✅
- [ ] GET /facturas/recibidas - Listado
- [ ] GET /facturas/api/recibidas - API con paginación
- [ ] Debe cargar sin errores de conexión BD
- [ ] Debe mostrar: Número, Fecha, Proveedor, Total, Estado

**URL de Prueba:** https://sgi.ultimamilla.com.ar/facturas/recibidas

---

### 4. LOGS DE AUDITORÍA ✅
- [ ] GET /logs - Listado de logs
- [ ] GET /logs/statistics - Dashboard de estadísticas
- [ ] GET /logs/alerts - Alertas críticas
- [ ] GET /logs/api/list - API de logs
- [ ] Filtros funcionando

**URL de Prueba:** https://sgi.ultimamilla.com.ar/logs

---

### 5. CLIENTES ✅
- [ ] GET /clientes - Listado
- [ ] GET /clientes/api/search-json - Búsqueda con paginación
- [ ] Modal de selección funciona
- [ ] Búsqueda instantánea

**URL de Prueba:** https://sgi.ultimamilla.com.ar/clientes

---

### 6. PROYECTOS ✅
- [ ] GET /proyectos - Listado
- [ ] GET /proyectos/ver/:id - Vista single
- [ ] Debe mostrar información completa

**URL de Prueba:** https://sgi.ultimamilla.com.ar/proyectos

---

### 7. PRESUPUESTOS ✅
- [ ] GET /presupuestos - Listado
- [ ] Paginación funciona

**URL de Prueba:** https://sgi.ultimamilla.com.ar/presupuestos

---

### 8. LEADS ✅
- [ ] GET /leads - Listado
- [ ] Paginación funciona

**URL de Prueba:** https://sgi.ultimamilla.com.ar/leads

---

## 🔧 VERIFICACIONES TÉCNICAS

### Conexión a BD
- [ ] Pool de conexiones activo
- [ ] Variables de entorno correctas (DB_PASS, no DB_PASSWORD)
- [ ] 118+ tablas en la BD

### Rutas
- [ ] GET / redirige a dashboard
- [ ] GET /dashboard carga o redirige a login
- [ ] GET /health retorna estado

### Campos en Listados
- [ ] Certificados: Número, Fecha, Cliente, Estado, Importe
- [ ] Facturas Emitidas: Número, Cliente, Total, Estado
- [ ] Facturas Recibidas: Número, Proveedor, Total, Estado

---

## 📊 RESULTADOS

### Certificados
```
✅ Listado carga
✅ Paginación funciona
✅ Filtro por cliente funciona
✅ Vista single carga
✅ Cliente mostrado correctamente
✅ Proyecto asociado visible
✅ Relacionados visibles
```

### Facturas Emitidas
```
✅ Listado carga
✅ API retorna JSON
✅ Vista single carga
✅ Formulario de edición carga
✅ Cambios se guardan
✅ Cambios persisten en BD
```

### Facturas Recibidas
```
✅ Listado carga
✅ API retorna JSON
✅ Sin errores de conexión
✅ Paginación funciona
```

### Logs de Auditoría
```
✅ Listado carga
✅ Dashboard carga
✅ Alertas carga
✅ API funciona
```

### Otros Módulos
```
✅ Clientes: Listado y búsqueda
✅ Proyectos: Listado y single
✅ Presupuestos: Listado
✅ Leads: Listado
```

---

## 🐛 PROBLEMAS ENCONTRADOS Y CORREGIDOS

### 1. Certificados - Cliente vs Autor
**Problema:** Badge mostraba autor en lugar de cliente
**Solución:** Cambiar de `SELECT c.*` a campos explícitos
**Status:** ✅ CORREGIDO

### 2. Facturas Emitidas - No guardaba cambios
**Problema:** Campo `cliente_id` no existe en BD
**Solución:** Mapear a `persona_tercero_id`
**Status:** ✅ CORREGIDO

### 3. Facturas Recibidas - Conexión a BD
**Problema:** Variable de entorno `DB_PASSWORD` no existe
**Solución:** Cambiar a `DB_PASS`
**Status:** ✅ CORREGIDO

### 4. req.flash no disponible
**Problema:** Middleware de flash no configurado
**Solución:** Usar query parameters en lugar de flash
**Status:** ✅ CORREGIDO

---

## 🚀 PRÓXIMOS PASOS

1. ✅ Ejecutar test integral automatizado
2. ✅ Verificar todos los módulos manualmente
3. ✅ Documentar resultados
4. ✅ Crear reportes de cobertura

---

## 📝 NOTAS

- Todos los tests usan credenciales de producción
- Las pruebas son no-destructivas (solo lectura o cambios reversibles)
- Los datos de prueba se limpian automáticamente
- Los logs de auditoría registran todas las operaciones

---

**Última Actualización:** 27 de Octubre 2025, 14:35 UTC-3

