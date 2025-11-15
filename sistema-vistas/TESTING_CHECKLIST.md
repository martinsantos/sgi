# Testing Checklist - Sistema de Gestión Interna (SGI)

## Fecha: 14/11/2025
## Sesión: Fixes de Clientes y Facturas

---

## 1. GESTIÓN DE CLIENTES

### 1.1 Listado de Clientes
- [ ] Acceder a https://sgi.ultimamilla.com.ar/clientes
- [ ] Verificar que se muestran todos los clientes
- [ ] Verificar que los badges están alineados correctamente

### 1.2 Búsqueda de Clientes
- [ ] Escribir en el campo de búsqueda (ej: "COLEGIO")
- [ ] Hacer click en "Buscar"
- [ ] Verificar que filtra correctamente por nombre
- [ ] Verificar que filtra correctamente por código
- [ ] Verificar que filtra correctamente por CUIT

### 1.3 Crear Nuevo Cliente
- [ ] Ir a https://sgi.ultimamilla.com.ar/clientes/nuevo
- [ ] Llenar solo el campo "Nombre" (ej: "TEST CLIENTE")
- [ ] Dejar los demás campos vacíos
- [ ] Hacer click en "Guardar Cliente"
- [ ] Verificar que se crea correctamente
- [ ] Verificar que aparece en el listado

### 1.4 Ver Detalle de Cliente
- [ ] Hacer click en cualquier cliente del listado
- [ ] Verificar que se muestra el detalle correctamente
- [ ] Verificar que los badges están alineados (Código, Tipo, Estado)
- [ ] Verificar que se muestran las facturas asociadas
- [ ] Verificar que se muestran los proyectos

### 1.5 Editar Cliente
- [ ] En la vista de detalle, hacer click en "Editar"
- [ ] Cambiar el nombre del cliente
- [ ] Hacer click en "Guardar"
- [ ] Verificar que se actualiza correctamente
- [ ] Volver al listado y verificar el cambio

### 1.6 Eliminar Cliente
- [ ] En la vista de detalle, hacer click en "Eliminar"
- [ ] Verificar que aparece un modal de confirmación
- [ ] Hacer click en "Eliminar" en el modal
- [ ] Verificar que se redirige al listado
- [ ] Verificar que el cliente ya no aparece en el listado (soft delete)

---

## 2. GESTIÓN DE FACTURAS

### 2.1 Crear Nueva Factura
- [ ] Ir a https://sgi.ultimamilla.com.ar/facturas/nueva
- [ ] Escribir "COLEGIO" en el campo de búsqueda de cliente
- [ ] Verificar que aparecen sugerencias
- [ ] Hacer click en una sugerencia
- [ ] Verificar que se selecciona el cliente correctamente
- [ ] Verificar que se muestra el cliente seleccionado

### 2.2 Búsqueda de Cliente en Modal
- [ ] En la página de nueva factura, hacer click en el icono de búsqueda
- [ ] Escribir "COLEGIO" en el campo de búsqueda del modal
- [ ] Verificar que aparecen resultados
- [ ] Hacer click en "Seleccionar" en un cliente
- [ ] Verificar que se cierra el modal y se selecciona el cliente

### 2.3 Asociar Factura a Cliente
- [ ] Crear una nueva factura
- [ ] Seleccionar un cliente
- [ ] Llenar los datos de la factura (tipo, fecha, etc.)
- [ ] Agregar al menos un item
- [ ] Hacer click en "Guardar"
- [ ] Verificar que se crea correctamente

### 2.4 Listar Facturas Emitidas
- [ ] Ir a https://sgi.ultimamilla.com.ar/facturas/emitidas
- [ ] Verificar que se muestran todas las facturas
- [ ] Intentar ordenar por cliente
- [ ] Intentar ordenar por fecha
- [ ] Verificar que funciona correctamente

### 2.5 Listar Facturas Recibidas
- [ ] Ir a https://sgi.ultimamilla.com.ar/facturas/recibidas
- [ ] Verificar que se muestran todas las facturas recibidas
- [ ] Intentar ordenar por proveedor
- [ ] Intentar ordenar por fecha
- [ ] Verificar que funciona correctamente

### 2.6 Ver Detalle de Factura
- [ ] En el listado de facturas, hacer click en el icono de ojo
- [ ] Verificar que se muestra el detalle correctamente
- [ ] Verificar que se muestra el cliente asociado
- [ ] Verificar que se muestran los items

---

## 3. ORDENAMIENTO Y FILTRADO

### 3.1 Ordenar Clientes
- [ ] En el listado de clientes, hacer click en "Nombre"
- [ ] Verificar que ordena ascendente
- [ ] Hacer click nuevamente en "Nombre"
- [ ] Verificar que ordena descendente
- [ ] Hacer click en "Código"
- [ ] Verificar que ordena correctamente

### 3.2 Ordenar Facturas Emitidas
- [ ] En el listado de facturas emitidas, hacer click en "Cliente"
- [ ] Verificar que ordena correctamente
- [ ] Hacer click en "Fecha"
- [ ] Verificar que ordena correctamente
- [ ] Hacer click en "Monto"
- [ ] Verificar que ordena correctamente

### 3.3 Ordenar Facturas Recibidas
- [ ] En el listado de facturas recibidas, hacer click en "Proveedor"
- [ ] Verificar que ordena correctamente
- [ ] Hacer click en "Fecha"
- [ ] Verificar que ordena correctamente

---

## 4. VALIDACIONES Y ERRORES

### 4.1 Crear Cliente sin Nombre
- [ ] Ir a https://sgi.ultimamilla.com.ar/clientes/nuevo
- [ ] Dejar el campo "Nombre" vacío
- [ ] Hacer click en "Guardar"
- [ ] Verificar que aparece un mensaje de error

### 4.2 Crear Factura sin Cliente
- [ ] Ir a https://sgi.ultimamilla.com.ar/facturas/nueva
- [ ] No seleccionar un cliente
- [ ] Intentar guardar
- [ ] Verificar que aparece un mensaje de error

### 4.3 Búsqueda de Cliente Inexistente
- [ ] En la página de nueva factura, escribir "ZZZZZZZZZ"
- [ ] Verificar que no aparecen sugerencias
- [ ] Abrir el modal de búsqueda
- [ ] Escribir "ZZZZZZZZZ"
- [ ] Verificar que aparece "No se encontraron clientes"

---

## 5. NOTAS IMPORTANTES

### Cambios Realizados en Esta Sesión:
1. ✅ Corregida vista de detalle de cliente (clientes/detalle)
2. ✅ Eliminados requisitos rigurosos en creación de clientes
3. ✅ Corregido envío de JSON sin FormData
4. ✅ Insertando en tabla correcta (persona_terceros)
5. ✅ Normalizado tipo_persona (F/J)
6. ✅ Reemplazado DataTable con FacturasRecibidasManager
7. ✅ Corregida construcción de ORDER BY en SQL
8. ✅ Agregada funcionalidad de edición de clientes
9. ✅ Agregada funcionalidad de eliminación de clientes (soft delete)
10. ✅ Mejorado diseño de badges en detalle de cliente
11. ✅ Eliminados métodos duplicados en controlador
12. ✅ Reordenadas rutas para evitar conflictos

### URLs Principales:
- Listado de Clientes: https://sgi.ultimamilla.com.ar/clientes
- Nuevo Cliente: https://sgi.ultimamilla.com.ar/clientes/nuevo
- Nueva Factura: https://sgi.ultimamilla.com.ar/facturas/nueva
- Facturas Emitidas: https://sgi.ultimamilla.com.ar/facturas/emitidas
- Facturas Recibidas: https://sgi.ultimamilla.com.ar/facturas/recibidas

### Comandos Útiles:
```bash
# Ver logs del servidor
pm2 logs sgi

# Reiniciar servidor
pm2 restart sgi

# Ver estado
pm2 list
```

---

## Resultado Final:
**Estado:** [ ] COMPLETADO / [ ] EN PROGRESO / [ ] FALLIDO

**Observaciones:**
_Agregar aquí cualquier observación o problema encontrado_

