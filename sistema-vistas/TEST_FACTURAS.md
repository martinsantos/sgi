# PLAN DE TESTING INTEGRAL - CREACIÓN DE FACTURAS

## 1. VERIFICACIÓN DE COMPONENTES

### 1.1 Formulario de Nueva Factura
- [x] Campo "Número de Factura" presente y obligatorio
- [x] Campo "Punto de Venta" presente y obligatorio
- [x] Campos de fecha presentes
- [x] Tabla de items con botón "Agregar Item"
- [x] Botones de acción (Guardar Borrador, Generar y Autorizar)

### 1.2 Validaciones en Cliente (JavaScript)
- [ ] Validar que cliente_id no esté vacío
- [ ] Validar que tipo_factura no esté vacío
- [ ] Validar que punto_venta no esté vacío
- [ ] Validar que numero_factura no esté vacío
- [ ] Validar que fecha_emision no esté vacía
- [ ] Validar que haya al menos 1 item

### 1.3 Envío de Datos
- [ ] Datos se envían como JSON
- [ ] Incluye credentials: 'include' para cookies
- [ ] Headers correctos (Content-Type: application/json)

### 1.4 Controlador (Backend)
- [ ] Método `crear` recibe POST en /facturas/crear
- [ ] Valida todos los campos obligatorios
- [ ] Calcula subtotal, IVA y total
- [ ] Inserta en tabla factura_ventas
- [ ] Inserta items en tabla factura_venta_items
- [ ] Devuelve JSON con éxito
- [ ] Redirige a /facturas/ver/{id}

### 1.5 Base de Datos
- [ ] Factura se guarda en factura_ventas
- [ ] Items se guardan en factura_venta_items
- [ ] numero_factura_completo tiene formato correcto (PUNTO-NUMERO)
- [ ] Campos activo=1, estado=1 (Pendiente)

### 1.6 Listado de Facturas
- [ ] Factura aparece en /facturas/emitidas
- [ ] Número de factura completo se muestra
- [ ] Fecha, cliente, tipo, estado, total visibles
- [ ] Botones de acción funcionan

### 1.7 Vista de Detalle
- [ ] Factura se puede ver en /facturas/ver/{id}
- [ ] Datos del cliente se muestran
- [ ] Items se listan correctamente
- [ ] Totales se calculan correctamente

## 2. CASOS DE PRUEBA

### Caso 1: Crear factura completa
**Datos:**
- Cliente: Seleccionar uno existente
- Tipo: Factura B
- Punto de Venta: 1
- Número de Factura: 1
- Fecha Emisión: Hoy
- Items: 
  - Descripción: "Servicio de consultoría"
  - Cantidad: 1
  - Precio: 1000
  - IVA: 21%

**Resultado Esperado:**
- Factura creada exitosamente
- Redirige a vista de detalle
- Número completo: 00001-00000001
- Total: 1210 (1000 + 210 IVA)

### Caso 2: Crear factura sin cliente
**Datos:** Dejar cliente vacío
**Resultado Esperado:** Error "Debe seleccionar un cliente"

### Caso 3: Crear factura sin número
**Datos:** Dejar número de factura vacío
**Resultado Esperado:** Error "Número de factura es obligatorio"

### Caso 4: Crear factura sin punto de venta
**Datos:** Dejar punto de venta vacío
**Resultado Esperado:** Error "Punto de venta es obligatorio"

### Caso 5: Crear factura sin items
**Datos:** No agregar items
**Resultado Esperado:** Error "Debe agregar al menos un item"

### Caso 6: Verificar número de factura completo
**Datos:** Crear factura con punto_venta=5, numero_factura=123
**Resultado Esperado:** Número completo = 00005-00000123

### Caso 7: Verificar cálculo de IVA
**Datos:** 
- Item 1: 100 con 21% IVA
- Item 2: 200 con 10.5% IVA
**Resultado Esperado:**
- Subtotal: 300
- IVA: 21 + 21 = 42
- Total: 342

### Caso 8: Verificar listado de facturas
**Datos:** Crear 3 facturas
**Resultado Esperado:**
- Las 3 facturas aparecen en /facturas/emitidas
- Se pueden ordenar por número, fecha, cliente
- Se pueden filtrar

### Caso 9: Verificar vista de detalle
**Datos:** Crear factura y acceder a su detalle
**Resultado Esperado:**
- Todos los datos se muestran correctamente
- Items se listan con cantidades y precios
- Totales coinciden

### Caso 10: Verificar asociación de cliente
**Datos:** Crear factura con cliente específico
**Resultado Esperado:**
- Cliente aparece en la factura
- Se puede hacer clic en cliente para ver su detalle
- Factura aparece en historial del cliente

## 3. CHECKLIST DE EJECUCIÓN

- [ ] Acceder a /facturas/nueva
- [ ] Verificar que formulario carga correctamente
- [ ] Ejecutar Caso 1
- [ ] Ejecutar Caso 2
- [ ] Ejecutar Caso 3
- [ ] Ejecutar Caso 4
- [ ] Ejecutar Caso 5
- [ ] Ejecutar Caso 6
- [ ] Ejecutar Caso 7
- [ ] Ejecutar Caso 8
- [ ] Ejecutar Caso 9
- [ ] Ejecutar Caso 10
- [ ] Verificar logs del servidor
- [ ] Verificar base de datos
- [ ] Documentar resultados

## 4. RESULTADOS

### Prueba 1: Crear factura completa
**Estado:** [ ] Pendiente [ ] Exitoso [ ] Fallido
**Detalles:**

### Prueba 2: Crear factura sin cliente
**Estado:** [ ] Pendiente [ ] Exitoso [ ] Fallido
**Detalles:**

### Prueba 3: Crear factura sin número
**Estado:** [ ] Pendiente [ ] Exitoso [ ] Fallido
**Detalles:**

### Prueba 4: Crear factura sin punto de venta
**Estado:** [ ] Pendiente [ ] Exitoso [ ] Fallido
**Detalles:**

### Prueba 5: Crear factura sin items
**Estado:** [ ] Pendiente [ ] Exitoso [ ] Fallido
**Detalles:**

### Prueba 6: Verificar número de factura completo
**Estado:** [ ] Pendiente [ ] Exitoso [ ] Fallido
**Detalles:**

### Prueba 7: Verificar cálculo de IVA
**Estado:** [ ] Pendiente [ ] Exitoso [ ] Fallido
**Detalles:**

### Prueba 8: Verificar listado de facturas
**Estado:** [ ] Pendiente [ ] Exitoso [ ] Fallido
**Detalles:**

### Prueba 9: Verificar vista de detalle
**Estado:** [ ] Pendiente [ ] Exitoso [ ] Fallido
**Detalles:**

### Prueba 10: Verificar asociación de cliente
**Estado:** [ ] Pendiente [ ] Exitoso [ ] Fallido
**Detalles:**

## 5. RESUMEN FINAL

**Total de Pruebas:** 10
**Exitosas:** 
**Fallidas:** 
**Pendientes:** 

**Conclusión:**
