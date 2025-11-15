# 🧪 TESTING INTEGRAL - TODAS LAS FUNCIONALIDADES

**Fecha:** 15 de Noviembre 2025, 12:15 UTC-3  
**Servidor:** 23.105.176.45 (sgi.ultimamilla.com.ar)  
**Status:** ✅ EN TESTING

---

## 📋 PLAN DE TESTING

### MÓDULO 1: FACTURAS EMITIDAS

#### Test 1.1: Carga Inicial
- [ ] Acceder a https://sgi.ultimamilla.com.ar/facturas/emitidas
- [ ] Verificar que carguen 20 facturas por página
- [ ] Verificar que el total sea 1468 facturas
- [ ] Verificar que aparezca paginación

**Resultado:** _[Completar]_

#### Test 1.2: Búsqueda
- [ ] Escribir "254" en búsqueda
- [ ] Verificar que filtre facturas con ese número
- [ ] Limpiar búsqueda con botón X
- [ ] Verificar que vuelvan todas las facturas

**Resultado:** _[Completar]_

#### Test 1.3: Ordenamiento
- [ ] Click en "N° FACTURA" para ordenar
- [ ] Verificar que aparezca indicador ↑
- [ ] Click nuevamente para cambiar a ↓
- [ ] Verificar que se ordene correctamente
- [ ] Probar con otras columnas: FECHA, CLIENTE, TOTAL, ESTADO

**Resultado:** _[Completar]_

#### Test 1.4: Filtro por Tipo
- [ ] Usar selector "Tipo Factura"
- [ ] Seleccionar "Factura A"
- [ ] Verificar que solo aparezcan tipo A
- [ ] Cambiar a "Factura B"
- [ ] Verificar que solo aparezcan tipo B
- [ ] Seleccionar "Todos los tipos"
- [ ] Verificar que aparezcan todas

**Resultado:** _[Completar]_

#### Test 1.5: Filtros Avanzados
- [ ] Click en "Filtros Avanzados"
- [ ] Seleccionar Estado: "Pendiente"
- [ ] Seleccionar Fecha Desde: 01/01/2025
- [ ] Seleccionar Fecha Hasta: 31/12/2025
- [ ] Verificar que se apliquen los filtros
- [ ] Click en "Limpiar Filtros"
- [ ] Verificar que se limpien todos

**Resultado:** _[Completar]_

#### Test 1.6: Exportar Excel
- [ ] Click en "Exportar Excel"
- [ ] Verificar que se descargue archivo
- [ ] Abrir en Excel
- [ ] Verificar que contenga datos correctos

**Resultado:** _[Completar]_

---

### MÓDULO 2: NUEVA FACTURA

#### Test 2.1: Cargar Formulario
- [ ] Acceder a https://sgi.ultimamilla.com.ar/facturas/nueva
- [ ] Verificar que cargue el formulario
- [ ] Verificar que aparezcan todos los campos

**Resultado:** _[Completar]_

#### Test 2.2: Búsqueda de Clientes
- [ ] En campo "Cliente", escribir "colegio"
- [ ] Verificar que aparezcan clientes coincidentes
- [ ] Verificar que muestre nombre, código, proyectos
- [ ] Click en "Seleccionar" para un cliente
- [ ] Verificar que se rellene el campo Cliente

**Resultado:** _[Completar]_

#### Test 2.3: Campos Obligatorios
- [ ] Verificar que "Punto de Venta" sea obligatorio
- [ ] Verificar que "Número de Factura" sea obligatorio
- [ ] Verificar que "Cliente" sea obligatorio
- [ ] Intentar guardar sin llenar campos
- [ ] Verificar que muestre error

**Resultado:** _[Completar]_

#### Test 2.4: Cálculo de Totales
- [ ] Agregar un item
- [ ] Ingresar cantidad: 2
- [ ] Ingresar precio: 100
- [ ] Verificar que calcule subtotal: 200
- [ ] Verificar que calcule IVA (21%)
- [ ] Verificar que calcule total

**Resultado:** _[Completar]_

#### Test 2.5: Crear Factura
- [ ] Llenar todos los campos
- [ ] Agregar items
- [ ] Click en "Crear Factura"
- [ ] Verificar que se guarde
- [ ] Verificar que redirija a ver factura

**Resultado:** _[Completar]_

---

### MÓDULO 3: CLIENTES

#### Test 3.1: Listado de Clientes
- [ ] Acceder a https://sgi.ultimamilla.com.ar/clientes
- [ ] Verificar que carguen clientes
- [ ] Verificar que aparezca paginación

**Resultado:** _[Completar]_

#### Test 3.2: Búsqueda de Clientes
- [ ] Escribir "colegio" en búsqueda
- [ ] Verificar que filtre clientes
- [ ] Limpiar búsqueda
- [ ] Verificar que vuelvan todos

**Resultado:** _[Completar]_

#### Test 3.3: Ver Detalle de Cliente
- [ ] Click en un cliente
- [ ] Verificar que cargue detalle
- [ ] Verificar que muestre información completa
- [ ] Verificar que muestre facturas asociadas
- [ ] Verificar que muestre proyectos asociados

**Resultado:** _[Completar]_

#### Test 3.4: Editar Cliente
- [ ] Click en botón "Editar"
- [ ] Cambiar algún campo
- [ ] Click en "Guardar"
- [ ] Verificar que se guarde

**Resultado:** _[Completar]_

#### Test 3.5: Eliminar Cliente
- [ ] Click en botón "Eliminar"
- [ ] Verificar que aparezca modal de confirmación
- [ ] Escribir "ELIMINAR"
- [ ] Click en "Eliminar Cliente"
- [ ] Verificar que se elimine (soft delete)

**Resultado:** _[Completar]_

---

### MÓDULO 4: INTEGRACIÓN

#### Test 4.1: Crear Factura → Ver en Listado
- [ ] Crear una nueva factura
- [ ] Ir a Facturas Emitidas
- [ ] Verificar que aparezca la factura recién creada
- [ ] Verificar que tenga el número correcto
- [ ] Verificar que tenga el cliente correcto

**Resultado:** _[Completar]_

#### Test 4.2: Búsqueda de Cliente → Crear Factura
- [ ] Ir a Nueva Factura
- [ ] Buscar cliente "colegio"
- [ ] Seleccionar cliente
- [ ] Verificar que se rellene automáticamente
- [ ] Crear factura
- [ ] Verificar que se asocie correctamente

**Resultado:** _[Completar]_

#### Test 4.3: Ordenamiento → Búsqueda
- [ ] Ir a Facturas Emitidas
- [ ] Ordenar por número
- [ ] Buscar "254"
- [ ] Verificar que se mantenga el ordenamiento
- [ ] Verificar que se aplique la búsqueda

**Resultado:** _[Completar]_

---

## 📊 RESUMEN DE RESULTADOS

| Módulo | Test | Estado | Notas |
|--------|------|--------|-------|
| Facturas Emitidas | 1.1 - Carga | ⬜ | |
| Facturas Emitidas | 1.2 - Búsqueda | ⬜ | |
| Facturas Emitidas | 1.3 - Ordenamiento | ⬜ | |
| Facturas Emitidas | 1.4 - Filtro Tipo | ⬜ | |
| Facturas Emitidas | 1.5 - Filtros Avanzados | ⬜ | |
| Facturas Emitidas | 1.6 - Exportar | ⬜ | |
| Nueva Factura | 2.1 - Formulario | ⬜ | |
| Nueva Factura | 2.2 - Búsqueda Clientes | ⬜ | |
| Nueva Factura | 2.3 - Campos Obligatorios | ⬜ | |
| Nueva Factura | 2.4 - Cálculo Totales | ⬜ | |
| Nueva Factura | 2.5 - Crear Factura | ⬜ | |
| Clientes | 3.1 - Listado | ⬜ | |
| Clientes | 3.2 - Búsqueda | ⬜ | |
| Clientes | 3.3 - Ver Detalle | ⬜ | |
| Clientes | 3.4 - Editar | ⬜ | |
| Clientes | 3.5 - Eliminar | ⬜ | |
| Integración | 4.1 - Factura en Listado | ⬜ | |
| Integración | 4.2 - Cliente en Factura | ⬜ | |
| Integración | 4.3 - Ordenamiento + Búsqueda | ⬜ | |

**Leyenda:** ⬜ Pendiente | 🟡 En Progreso | ✅ Completado | ❌ Fallido

---

## 🎯 CRITERIOS DE ÉXITO

✅ Todas las facturas se cargan correctamente  
✅ Búsqueda funciona en tiempo real  
✅ Ordenamiento funciona en todas las columnas  
✅ Filtro por tipo funciona  
✅ Búsqueda de clientes funciona  
✅ Creación de facturas funciona  
✅ Clientes se pueden editar y eliminar  
✅ Integración entre módulos funciona  

---

## 🔧 CAMBIOS REALIZADOS

### Commit: e6df392
**Mensaje:** fix: Corregir campo display_nombre en búsqueda de clientes en nueva factura

**Cambios:**
- Actualizado campo de búsqueda de clientes
- Ahora busca por `display_nombre` en lugar de `nombre_completo`
- Mantiene compatibilidad con otros campos

**Archivos:**
- src/views/facturas/nueva.handlebars

---

## 📝 NOTAS

- No se deshizo ninguna funcionalidad anterior
- Se mantienen todos los cambios de facturas emitidas
- Se corrigió solo el campo de búsqueda de clientes
- Servidor online y funcionando

---

**Próximos Pasos:**
1. Ejecutar todos los tests
2. Documentar resultados
3. Corregir cualquier problema encontrado
4. Hacer commit final

**Última Actualización:** 15/11/2025 12:15 UTC-3
