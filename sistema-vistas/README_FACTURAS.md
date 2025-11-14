# 📋 CREACIÓN DE FACTURAS - GUÍA COMPLETA

**Última actualización:** 14 de Noviembre 2025  
**Status:** ✅ COMPLETADO Y FUNCIONAL  
**Versión:** 1.0

---

## 🎯 RESUMEN EJECUTIVO

Se ha implementado un sistema completo de creación de facturas con:
- ✅ Número de factura obligatorio
- ✅ Punto de venta obligatorio
- ✅ Validaciones en cliente y servidor
- ✅ Cálculo automático de IVA
- ✅ Almacenamiento en base de datos
- ✅ Listado y visualización de facturas

---

## 🚀 CÓMO USAR

### Crear Nueva Factura

1. **Acceder al formulario**
   ```
   URL: https://sgi.ultimamilla.com.ar/facturas/nueva
   ```

2. **Completar datos básicos**
   - Seleccionar cliente (obligatorio)
   - Tipo de factura: A, B, C o M (obligatorio)
   - Punto de venta: 1-99999 (obligatorio)
   - Número de factura: 1-99999999 (obligatorio)
   - Fecha de emisión: Hoy o anterior (obligatorio)
   - Fecha de vencimiento: Opcional

3. **Agregar items**
   - Hacer click en "Agregar Item"
   - Completar:
     - Descripción: Nombre del producto/servicio
     - Cantidad: Número de unidades
     - Precio unitario: Precio por unidad
     - IVA: 0%, 10.5%, 21% o 27%
   - El subtotal se calcula automáticamente

4. **Guardar factura**
   - Hacer click en "Generar y Autorizar"
   - La factura se crea y se redirige a su detalle

### Ver Facturas

1. **Acceder al listado**
   ```
   URL: https://sgi.ultimamilla.com.ar/facturas/emitidas
   ```

2. **Buscar factura**
   - Usar buscador por número, cliente, CUIT
   - Usar filtros avanzados por estado, fecha, tipo
   - Ordenar por cualquier columna

3. **Ver detalle**
   - Hacer click en el número de factura
   - Ver todos los datos y items

---

## 📊 ESTRUCTURA DE DATOS

### Número de Factura Completo

El sistema construye automáticamente un número completo en formato:
```
PUNTO_VENTA - NUMERO
00001 - 00000001
```

**Ejemplo:**
- Punto de Venta: 5
- Número: 123
- Resultado: 00005-00000123

### Cálculo de Totales

```
Subtotal = Suma de (Cantidad × Precio Unitario)
IVA = Suma de (Subtotal Item × Porcentaje IVA / 100)
Total = Subtotal + IVA
```

**Ejemplo:**
- Item 1: 1 × 1000 × 21% = 1210
- Item 2: 2 × 500 × 10.5% = 1050
- Subtotal: 2000
- IVA: 260
- Total: 2260

---

## ✅ VALIDACIONES

### Campos Obligatorios

| Campo | Tipo | Validación |
|-------|------|-----------|
| Cliente | Select | Debe seleccionar uno |
| Tipo de Factura | Select | A, B, C o M |
| Punto de Venta | Number | 1-99999 |
| Número de Factura | Number | 1-99999999 |
| Fecha Emisión | Date | No puede ser futura |
| Items | Array | Al menos 1 item |

### Validaciones de Items

| Campo | Tipo | Validación |
|-------|------|-----------|
| Descripción | Text | Requerido |
| Cantidad | Number | > 0 |
| Precio Unitario | Number | >= 0 |
| IVA | Select | 0%, 10.5%, 21%, 27% |

---

## 🔍 ESTADOS DE FACTURA

| Estado | Código | Descripción |
|--------|--------|-------------|
| Pendiente | 1 | Factura creada, no pagada |
| Pagada Parcial | 2 | Pagada parcialmente |
| Pagada | 3 | Totalmente pagada |
| En Proceso | 4 | En trámite de autorización |
| Anulada | 5 | Factura anulada |

---

## 📱 INTERFAZ

### Formulario de Nueva Factura

```
┌─────────────────────────────────────────────────────┐
│ Nueva Factura de Venta                              │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Información de la Factura                           │
│ ┌──────────────────────────────────────────────┐   │
│ │ Tipo: [B]  Punto Venta: [1]  Número: [1]    │   │
│ │ Fecha Emisión: [14/11/2025]                  │   │
│ │ Fecha Vencimiento: [14/12/2025]              │   │
│ └──────────────────────────────────────────────┘   │
│                                                     │
│ Cliente                                             │
│ ┌──────────────────────────────────────────────┐   │
│ │ [Seleccionar Cliente]                        │   │
│ └──────────────────────────────────────────────┘   │
│                                                     │
│ Items                                               │
│ ┌──────────────────────────────────────────────┐   │
│ │ Descripción | Cantidad | Precio | IVA | Sub │   │
│ │ Servicio    |    1     | 1000   | 21% | 1210│   │
│ │ [Agregar Item]                               │   │
│ └──────────────────────────────────────────────┘   │
│                                                     │
│ Totales                                             │
│ ┌──────────────────────────────────────────────┐   │
│ │ Subtotal: $1000.00                           │   │
│ │ IVA: $210.00                                 │   │
│ │ Total: $1210.00                              │   │
│ └──────────────────────────────────────────────┘   │
│                                                     │
│ [Guardar Borrador] [Generar y Autorizar]          │
└─────────────────────────────────────────────────────┘
```

### Listado de Facturas

```
┌──────────────────────────────────────────────────────┐
│ Facturas Emitidas                                    │
├──────────────────────────────────────────────────────┤
│ Buscar: [_____________________]                      │
│                                                      │
│ N° Factura | Fecha | Cliente | Tipo | Total | Acciones
│ 00001-00000001 | 14/11/2025 | Cliente A | B | $1210 | Ver
│ 00001-00000002 | 14/11/2025 | Cliente B | A | $2500 | Ver
│                                                      │
│ Página 1 de 5                                        │
└──────────────────────────────────────────────────────┘
```

---

## 🔧 CONFIGURACIÓN TÉCNICA

### Rutas

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /facturas/nueva | Mostrar formulario |
| POST | /facturas/crear | Crear factura |
| GET | /facturas/emitidas | Listar facturas |
| GET | /facturas/ver/:id | Ver detalle |

### Tablas de Base de Datos

**factura_ventas**
- id (UUID)
- persona_tercero_id (FK)
- numero_factura (INT)
- numero_factura_completo (VARCHAR)
- punto_venta (INT)
- tipo_factura (CHAR)
- fecha_emision (DATE)
- subtotal (DECIMAL)
- iva (DECIMAL)
- total (DECIMAL)
- estado (INT)
- activo (TINYINT)

**factura_venta_items**
- id (UUID)
- factura_venta_id (FK)
- descripcion (VARCHAR)
- cantidad (DECIMAL)
- precio_unitario (DECIMAL)
- iva_porcentaje (DECIMAL)
- subtotal (DECIMAL)
- iva (DECIMAL)
- total (DECIMAL)

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### Problema: "Debe seleccionar un cliente"
**Solución:** Hacer click en el campo de cliente y seleccionar uno de la lista

### Problema: "Número de factura es obligatorio"
**Solución:** Ingresar un número entre 1 y 99999999

### Problema: "Punto de venta es obligatorio"
**Solución:** Ingresar un número entre 1 y 99999

### Problema: "Debe agregar al menos un item"
**Solución:** Hacer click en "Agregar Item" y completar los datos

### Problema: Los totales no se calculan
**Solución:** Verificar que cantidad y precio sean números válidos

### Problema: No aparece la factura en el listado
**Solución:** Esperar unos segundos y refrescar la página (F5)

---

## 📞 SOPORTE

Para reportar problemas o sugerencias:
- Email: martin@ultimamilla.com.ar
- Teléfono: [Número de contacto]
- Sistema: https://sgi.ultimamilla.com.ar

---

## 📚 DOCUMENTACIÓN RELACIONADA

- [TESTING_INTEGRAL_FINAL.md](./TESTING_INTEGRAL_FINAL.md) - Testing completo
- [RESUMEN_SESION_FACTURAS_NOV14.md](./RESUMEN_SESION_FACTURAS_NOV14.md) - Resumen de implementación
- [VERIFICACION_FINAL_FACTURAS.md](./VERIFICACION_FINAL_FACTURAS.md) - Verificación final

---

**Última actualización:** 14/11/2025 20:50 UTC-3  
**Versión:** 1.0  
**Status:** ✅ PRODUCCIÓN
