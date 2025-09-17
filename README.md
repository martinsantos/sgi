# sgi
sgi

## Checklist de Verificación Rápida (Post-Deploy)

### Clientes (/clientes)
- [ ] Carga listado sin errores (HTTP 200)
- [ ] Búsqueda simple: /clientes?search=um
- [ ] Orden: /clientes?sort_by=nombre&sort_order=DESC
- [ ] Navegación de paginación

### Cliente Detalle (/clientes/ver/:id)
- [ ] Renderiza datos básicos del cliente
- [ ] Secciones relacionadas (proyectos, facturas, certificados) muestran datos o mensajes vacíos sin romper
- [ ] Resumen financiero renderiza sin errores

### Dashboard (/dashboard)
- [ ] Carga sin errores
- [ ] Métricas básicas visibles (clientes activos, proyectos, facturas, presupuestos, certificados)

### Logs y Salud del Proceso
- [ ] pm2 status muestra `sgi` en `online`
- [ ] pm2 logs sgi --err sin `ER_BAD_FIELD_ERROR` ni errores 5xx

### Endpoints Clave a Probar (manual)
- [ ] GET /clientes
- [ ] GET /clientes?search=um
- [ ] GET /clientes?sort_by=nombre&sort_order=DESC
- [ ] GET /clientes/ver/:id (usar un ID válido de persona_terceros)
- [ ] GET /dashboard

### Rollback Rápido
- [ ] Restaurar backups `*.bak-<timestamp>` en controllers/models si fuese necesario
- [ ] pm2 restart sgi

