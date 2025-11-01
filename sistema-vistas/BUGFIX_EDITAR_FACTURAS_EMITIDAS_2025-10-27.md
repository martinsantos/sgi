# 🐛 BUGFIX: EDICIÓN DE FACTURAS EMITIDAS NO GUARDABA

**Fecha:** 27 de Octubre 2025, 10:04 UTC-3
**Severidad:** CRÍTICA
**URL:** https://sgi.ultimamilla.com.ar/facturas/emitidas/{id}/editar

---

## ❌ PROBLEMA

El formulario de edición de facturas emitidas mostraba los datos correctamente pero **no guardaba los cambios** al hacer click en "Guardar Cambios".

### Síntomas
```
1. Abrir formulario de edición → ✅ Carga correctamente
2. Modificar campos → ✅ Se modifican en el formulario
3. Click "Guardar Cambios" → ❌ No guarda, redirige sin cambios
```

### Errores en Logs
```
❌ Error al actualizar factura: Error: Unknown column 'cliente_id' in 'SET'
❌ TypeError: req.flash is not a function
```

---

## 🔍 CAUSA RAÍZ

### Problema 1: Nombre de Campo Incorrecto
El controller intentaba actualizar `cliente_id` pero la tabla `factura_ventas` usa `persona_tercero_id`:

```javascript
// ❌ INCORRECTO:
const updateData = {
  cliente_id: req.body.cliente_id,  // Campo no existe en BD
  // ...
};

// ✅ CORRECTO:
const updateData = {
  persona_tercero_id: req.body.cliente_id,  // Mapear al campo correcto
  // ...
};
```

### Problema 2: req.flash No Disponible
El controller intentaba usar `req.flash()` que no estaba disponible:

```javascript
// ❌ INCORRECTO:
req.flash('success', 'Factura actualizada correctamente');

// ✅ CORRECTO:
// Usar query parameters en lugar de flash
res.redirect(`/facturas/emitidas/${id}?success=1`);
```

### Problema 3: Lista de Campos Permitidos Incompleta
El modelo tenía una lista de campos permitidos que no incluía todos los campos de la tabla.

---

## ✅ SOLUCIÓN

### Cambio 1: Controller - Mapear campo correcto
```javascript
// Archivo: src/controllers/facturaController.js (línea 1306)
const updateData = {
  persona_tercero_id: req.body.cliente_id,  // ✅ Mapear al campo correcto
  fecha_vto_pago: req.body.fecha_vto_pago,
  observaciones: req.body.observaciones,
  estado: req.body.estado || 1
};
```

### Cambio 2: Controller - Remover req.flash
```javascript
// Archivo: src/controllers/facturaController.js (línea 1314-1320)
if (success) {
  console.log(`✅ Factura ${id} actualizada correctamente`);
  return res.redirect(`/facturas/emitidas/${id}?success=1`);
} else {
  console.log(`⚠️ No se actualizó la factura ${id}`);
  return res.redirect(`/facturas/emitidas/${id}?error=1`);
}
```

### Cambio 3: Modelo - Actualizar campos permitidos
```javascript
// Archivo: src/models/FacturaModel.js (línea 169-192)
const camposPermitidos = [
  'persona_tercero_id',  // ✅ Campo correcto
  'observaciones',
  'estado',
  'fecha_pago',
  'fecha_vto_pago',
  'numero_factura',
  'porcentaje_iibb',
  'neto_iibb',
  'total_iva_10',
  'total_iva_21',
  'total_iva_27',
  'cae',
  'fecha_vto_cae',
  'punto_venta',
  'periodo_desde',
  'periodo_hasta',
  'condicion_venta',
  'tipo_actividad_afip',
  'tipo_actividad_iibb',
  'cancelado',
  'total',
  'fecha_cobro'
];
```

---

## 📋 ARCHIVOS MODIFICADOS

| Archivo | Líneas | Cambios |
|---------|--------|---------|
| `src/controllers/facturaController.js` | 1300-1327 | Mapear campo, remover flash |
| `src/models/FacturaModel.js` | 169-192 | Actualizar campos permitidos |

---

## 🚀 DEPLOYMENT

```bash
✅ Archivos desplegados
✅ PM2 reiniciado (PID: 35085)
✅ Sin errores en logs
```

---

## ✅ VERIFICACIÓN

### Antes
```
❌ Unknown column 'cliente_id' in 'SET'
❌ TypeError: req.flash is not a function
❌ Cambios no se guardan
```

### Después
```
✅ Cambios se guardan correctamente
✅ Redirige a vista de factura
✅ Datos persisten en BD
```

---

## 🧪 TESTING

### Paso 1: Acceder a editar
```
https://sgi.ultimamilla.com.ar/facturas/emitidas/{id}/editar
```

### Paso 2: Modificar campos
```
1. Cambiar Cliente
2. Cambiar Fecha de Vencimiento
3. Cambiar Estado
4. Agregar Observaciones
```

### Paso 3: Guardar
```
Click "Guardar Cambios"
✅ Debe redirigir a /facturas/emitidas/{id}
✅ Cambios deben estar guardados
```

### Paso 4: Verificar persistencia
```
Recargar página
✅ Cambios deben mantenerse
```

---

## 📝 ESTRUCTURA DE TABLA

```
factura_ventas
├─ id (char(36))
├─ persona_tercero_id (char(36)) ✅ Campo correcto para cliente
├─ fecha_vto_pago (date)
├─ observaciones (text)
├─ estado (int)
└─ ... otros campos
```

---

## 🔗 REFERENCIAS

- Tabla: `factura_ventas`
- Campo cliente: `persona_tercero_id` (no `cliente_id`)
- Método: `FacturaModel.updateFacturaField(id, updateData)`

---

**Status:** ✅ RESUELTO Y DESPLEGADO

