# 🧪 TESTING INTEGRAL - FACTURAS EMITIDAS

**Fecha:** 15 de Noviembre 2025  
**URL:** https://sgi.ultimamilla.com.ar/facturas/emitidas  
**Estado:** ✅ EN TESTING

---

## 📋 CASOS DE PRUEBA

### 1. **CARGA INICIAL DE FACTURAS**

**Objetivo:** Verificar que las facturas se cargan correctamente al acceder a la página

**Pasos:**
1. Acceder a https://sgi.ultimamilla.com.ar/facturas/emitidas
2. Esperar a que carguen los datos
3. Verificar que aparezca un listado de facturas

**Resultado Esperado:**
- ✅ Tabla con facturas visibles
- ✅ Número de facturas > 0
- ✅ Información de paginación visible
- ✅ Columnas: N° Factura, Fecha, Cliente, Tipo, Estado, Total, Cobrado/Saldo, Acciones

**Resultado Actual:** _[Completar después de prueba]_

---

### 2. **BÚSQUEDA DE FACTURAS**

**Objetivo:** Verificar que la búsqueda funciona correctamente

**Pasos:**
1. En el campo de búsqueda, escribir un número de factura (ej: "254")
2. Presionar Enter o esperar a que se filtre automáticamente
3. Verificar que solo aparezcan facturas que coincidan

**Resultado Esperado:**
- ✅ Filtrado automático mientras escribes
- ✅ Solo aparecen facturas que coinciden con la búsqueda
- ✅ Botón "X" limpia la búsqueda

**Resultado Actual:** _[Completar después de prueba]_

---

### 3. **FILTRO POR TIPO DE FACTURA**

**Objetivo:** Verificar que se pueden filtrar facturas por tipo (A, B, C, M)

**Pasos:**
1. Usar el selector "Tipo Factura" en la barra principal
2. Seleccionar "Factura A"
3. Verificar que solo aparezcan facturas tipo A
4. Cambiar a "Factura B"
5. Verificar que solo aparezcan facturas tipo B

**Resultado Esperado:**
- ✅ Selector funciona correctamente
- ✅ Filtra por tipo A, B, C, M
- ✅ "Todos los tipos" muestra todas las facturas

**Resultado Actual:** _[Completar después de prueba]_

---

### 4. **ORDENAMIENTO POR COLUMNAS**

**Objetivo:** Verificar que se puede ordenar por diferentes columnas

**Pasos:**
1. Hacer clic en el encabezado "N° FACTURA"
2. Verificar que se ordene ascendente (↑)
3. Hacer clic nuevamente
4. Verificar que se ordene descendente (↓)
5. Repetir con otras columnas: FECHA EMISIÓN, CLIENTE, TOTAL

**Resultado Esperado:**
- ✅ Indicadores de ordenamiento (↑↓) visibles
- ✅ Ordenamiento funciona en ambas direcciones
- ✅ Funciona en todas las columnas sortables

**Resultado Actual:** _[Completar después de prueba]_

---

### 5. **FACTURAS RECIENTEMENTE CREADAS**

**Objetivo:** Verificar que las facturas recién creadas aparecen en el listado

**Pasos:**
1. Crear una nueva factura desde https://sgi.ultimamilla.com.ar/facturas/nueva
2. Completar los datos y guardar
3. Volver a https://sgi.ultimamilla.com.ar/facturas/emitidas
4. Verificar que la factura recién creada aparezca en el listado

**Resultado Esperado:**
- ✅ Factura recién creada visible en el listado
- ✅ Aparece en la posición correcta según ordenamiento
- ✅ Datos correctos (número, cliente, total, etc.)

**Resultado Actual:** _[Completar después de prueba]_

---

### 6. **NÚMERO DE FACTURA COMPLETO**

**Objetivo:** Verificar que el número de factura se muestra en formato completo (PUNTO_VENTA-NUMERO)

**Pasos:**
1. Observar la columna "N° FACTURA"
2. Verificar que muestre formato: "002-00000254"
3. Verificar que debajo aparezca el tipo de factura (A, B, C, M)

**Resultado Esperado:**
- ✅ Formato: "XXX-XXXXXXXX" (punto_venta-numero)
- ✅ Tipo de factura visible debajo del número
- ✅ Diseño limpio y legible

**Resultado Actual:** _[Completar después de prueba]_

---

### 7. **PAGINACIÓN**

**Objetivo:** Verificar que la paginación funciona correctamente

**Pasos:**
1. Verificar que aparezca información de paginación (ej: "Mostrando 1 a 20 de 1468")
2. Hacer clic en "Siguiente" o número de página
3. Verificar que carguen diferentes facturas
4. Hacer clic en "Anterior"
5. Verificar que vuelva a la página anterior

**Resultado Esperado:**
- ✅ Información de paginación correcta
- ✅ Navegación entre páginas funciona
- ✅ Datos se actualizan correctamente

**Resultado Actual:** _[Completar después de prueba]_

---

### 8. **FILTROS AVANZADOS**

**Objetivo:** Verificar que los filtros avanzados funcionan

**Pasos:**
1. Hacer clic en "Filtros Avanzados"
2. Completar algunos filtros (ej: Estado, Fecha, Tipo)
3. Verificar que se apliquen los filtros
4. Hacer clic en "Limpiar Filtros"
5. Verificar que se limpien todos los filtros

**Resultado Esperado:**
- ✅ Panel de filtros se abre/cierra
- ✅ Filtros se aplican correctamente
- ✅ Botón "Limpiar Filtros" funciona

**Resultado Actual:** _[Completar después de prueba]_

---

### 9. **EXPORTAR A EXCEL**

**Objetivo:** Verificar que se pueden exportar facturas a Excel

**Pasos:**
1. Hacer clic en "Exportar Excel"
2. Esperar a que se descargue el archivo
3. Abrir el archivo en Excel
4. Verificar que contenga los datos correctos

**Resultado Esperado:**
- ✅ Archivo se descarga correctamente
- ✅ Contiene todas las facturas filtradas
- ✅ Formato correcto con encabezados

**Resultado Actual:** _[Completar después de prueba]_

---

### 10. **ACCIONES EN FILA**

**Objetivo:** Verificar que los botones de acción funcionan

**Pasos:**
1. Hacer clic en el icono de "Ver" (ojo)
2. Verificar que se abra el detalle de la factura
3. Volver al listado
4. Hacer clic en el icono de "Editar" (lápiz)
5. Verificar que se abra el formulario de edición
6. Hacer clic en el icono de "PDF"
7. Verificar que se descargue el PDF

**Resultado Esperado:**
- ✅ Botón "Ver" abre detalle
- ✅ Botón "Editar" abre formulario
- ✅ Botón "PDF" descarga el archivo

**Resultado Actual:** _[Completar después de prueba]_

---

## 🔍 VERIFICACIÓN DE LOGS

### Logs Esperados en Servidor

```
📝 API: Obteniendo facturas emitidas - Página 1, Límite 20, Sort: fecha_emision DESC
📝 Filtros procesados: {}
📊 Resultado de búsqueda: 20 facturas, Total: 1468
```

### Verificar Logs

```bash
sshpass -p 'gsiB%s@0yD' ssh -o StrictHostKeyChecking=no root@23.105.176.45 'pm2 logs sgi --lines 50 --nostream | grep -E "API|Resultado"'
```

---

## 📊 RESUMEN DE RESULTADOS

| Caso de Prueba | Estado | Notas |
|---|---|---|
| 1. Carga Inicial | ⬜ | |
| 2. Búsqueda | ⬜ | |
| 3. Filtro por Tipo | ⬜ | |
| 4. Ordenamiento | ⬜ | |
| 5. Facturas Recientes | ⬜ | |
| 6. Número Completo | ⬜ | |
| 7. Paginación | ⬜ | |
| 8. Filtros Avanzados | ⬜ | |
| 9. Exportar Excel | ⬜ | |
| 10. Acciones | ⬜ | |

**Leyenda:** ⬜ Pendiente | 🟡 En Progreso | ✅ Completado | ❌ Fallido

---

## 🚀 PRÓXIMOS PASOS

1. Ejecutar todos los casos de prueba
2. Documentar resultados
3. Corregir cualquier problema encontrado
4. Hacer commit final
5. Desplegar a producción

---

**Última Actualización:** 15/11/2025 11:44 UTC-3  
**Responsable:** Testing Integral
