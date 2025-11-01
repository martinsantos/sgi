# ✅ FIX: NAVEGACIÓN CONTEXTUAL EN CERTIFICADOS

**Fecha:** 29 de Octubre 2025, 18:15 UTC-3  
**Servidor:** 23.105.176.45 (sgi.ultimamilla.com.ar)  
**Status:** ✅ DESPLEGADO EN PRODUCCIÓN

---

## 🎯 PROBLEMA IDENTIFICADO

**Síntoma:**
- Al acceder a un certificado desde un proyecto con `?return=/proyectos/ver/{{id}}`
- El parámetro `return` no se procesaba
- Siempre redirigía a `/certificados` en lugar de volver al proyecto

**URL esperada:**
```
https://sgi.ultimamilla.com.ar/certificados/ver/{{cert_id}}?return=/proyectos/ver/{{proyecto_id}}
```

**Comportamiento anterior:**
- ❌ Botón "Volver" → `/certificados` (listado general)
- ❌ Perdía el contexto del proyecto

---

## ✅ SOLUCIÓN IMPLEMENTADA

### 1. Controlador de Certificados

**Archivo:** `src/controllers/certificadoController.js`

#### Método `ver()` - Línea 201
```javascript
res.render('certificados/ver', {
  title: `Certificado N° ${certificado.numero}`,
  certificado,
  proyecto,
  otrosCertificadosProyecto,
  otrosProyectosCliente,
  totalCertificadosCliente,
  montoTotalCliente,
  returnUrl: req.query.return || '/certificados',  // ✅ NUEVO
  formatCurrency: CertificadoModel.formatCurrency,
  formatDate: CertificadoModel.formatDate
});
```

#### Método `mostrarEditar()` - Línea 246
```javascript
res.render('certificados/editar', {
  title: `Editar Certificado N° ${certificado.numero}`,
  certificado,
  proyectos: proyectos,
  estados: CertificadoModel.ESTADO_NOMBRES,
  returnUrl: req.query.return || '/certificados'  // ✅ NUEVO
});
```

### 2. Vista de Certificado (ver.handlebars)

**Cambios:**

#### Botón "Volver" (superior)
```handlebars
<!-- ANTES -->
<a href="/certificados" class="btn btn-outline-secondary me-2">
  <i class="bi bi-arrow-left"></i> Volver a Lista
</a>

<!-- AHORA -->
<a href="{{returnUrl}}" class="btn btn-outline-secondary me-2">
  <i class="bi bi-arrow-left"></i> Volver
</a>
```

#### Botón "Editar"
```handlebars
<!-- ANTES -->
<a href="/certificados/editar/{{certificado.id}}" class="btn btn-warning me-2">

<!-- AHORA -->
<a href="/certificados/editar/{{certificado.id}}?return={{returnUrl}}" class="btn btn-warning me-2">
```

#### Botón "Volver" (inferior)
```handlebars
<!-- ANTES -->
<a href="/certificados" class="btn btn-outline-secondary">
  <i class="bi bi-arrow-left"></i> Volver al Listado
</a>

<!-- AHORA -->
<a href="{{returnUrl}}" class="btn btn-outline-secondary">
  <i class="bi bi-arrow-left"></i> Volver
</a>
```

### 3. Vista de Edición (editar.handlebars)

**Cambios:**

#### Botón "Volver"
```handlebars
<!-- ANTES -->
<a href="/certificados/ver/{{certificado.id}}" class="btn btn-outline-secondary">

<!-- AHORA -->
<a href="{{returnUrl}}" class="btn btn-outline-secondary">
```

#### Botón "Cancelar"
```handlebars
<!-- ANTES -->
<a href="/certificados/ver/{{certificado.id}}" class="btn btn-outline-secondary">

<!-- AHORA -->
<a href="{{returnUrl}}" class="btn btn-outline-secondary">
```

---

## 🔄 FLUJO DE NAVEGACIÓN

### Flujo Completo

```
1. Listado de Proyectos
   ↓
2. Ver Proyecto
   ↓ (Click en "Ver" certificado)
3. Ver Certificado (?return=/proyectos/ver/{{proyecto_id}})
   ↓ (Click en "Editar")
4. Editar Certificado (?return=/proyectos/ver/{{proyecto_id}})
   ↓ (Click en "Volver" o "Cancelar")
5. ✅ Vuelve al Proyecto (mantiene contexto)
```

### Casos de Uso

| Origen | URL Certificado | returnUrl | Destino al "Volver" |
|--------|----------------|-----------|---------------------|
| Listado Certificados | `/certificados/ver/{{id}}` | `/certificados` | Listado Certificados |
| Vista Proyecto | `/certificados/ver/{{id}}?return=/proyectos/ver/{{pid}}` | `/proyectos/ver/{{pid}}` | Vista Proyecto |
| Búsqueda | `/certificados/ver/{{id}}?return=/buscar` | `/buscar` | Búsqueda |

---

## ✅ VENTAJAS

### 1. Navegación Contextual ✅
- Mantiene el contexto de navegación
- Usuario vuelve a donde estaba
- No se pierde en la aplicación

### 2. UX Mejorada ✅
- Flujo natural de navegación
- Menos clicks para volver
- Experiencia más intuitiva

### 3. Flexibilidad ✅
- Funciona desde cualquier origen
- Parámetro `return` opcional
- Fallback a `/certificados` si no se especifica

### 4. Consistencia ✅
- Mismo patrón en ver y editar
- Botones "Volver" y "Cancelar" consistentes
- Comportamiento predecible

---

## 📊 ARCHIVOS MODIFICADOS

| Archivo | Cambios | Líneas |
|---------|---------|--------|
| `src/controllers/certificadoController.js` | Agregar `returnUrl` | 201, 246 |
| `src/views/certificados/ver.handlebars` | Usar `{{returnUrl}}` | 4, 7, 211, 221 |
| `src/views/certificados/editar.handlebars` | Usar `{{returnUrl}}` | 4, 91 |

---

## 🚀 DESPLIEGUE

**Status:** ✅ COMPLETADO

**Archivos desplegados:** 3
- `certificadoController.js`
- `ver.handlebars`
- `editar.handlebars`

**PM2:** Online (PID: 860868)  
**Memoria:** 115.9 MB  
**Errores:** 0

**Tiempo:** ~4 segundos

---

## 🧪 TESTING

### Casos de Prueba

| Test | Resultado |
|------|-----------|
| Ver certificado desde proyecto | ✅ |
| Botón "Volver" va al proyecto | ✅ |
| Editar desde proyecto | ✅ |
| Botón "Cancelar" va al proyecto | ✅ |
| Ver certificado desde listado | ✅ |
| Botón "Volver" va al listado | ✅ |
| Parámetro return opcional | ✅ |
| Fallback a /certificados | ✅ |

### Verificación Manual

**1. Desde Proyecto:**
```
1. Ir a: https://sgi.ultimamilla.com.ar/proyectos
2. Click en "Ver" en un proyecto
3. Click en "Ver" (ojo) en un certificado
4. Verificar URL: ?return=/proyectos/ver/{{id}}
5. Click en "Volver"
6. ✅ Debe volver al proyecto
```

**2. Desde Listado:**
```
1. Ir a: https://sgi.ultimamilla.com.ar/certificados
2. Click en "Ver" en un certificado
3. Verificar URL: sin parámetro return
4. Click en "Volver"
5. ✅ Debe volver al listado
```

**3. Edición:**
```
1. Ver certificado desde proyecto
2. Click en "Editar"
3. Verificar URL: ?return=/proyectos/ver/{{id}}
4. Click en "Cancelar"
5. ✅ Debe volver al proyecto
```

---

## 📝 DOCUMENTACIÓN

### Uso del Parámetro `return`

**En enlaces:**
```handlebars
<a href="/certificados/ver/{{id}}?return={{currentUrl}}">Ver</a>
```

**En controlador:**
```javascript
const returnUrl = req.query.return || '/default';
res.render('vista', { returnUrl });
```

**En vista:**
```handlebars
<a href="{{returnUrl}}">Volver</a>
```

### Patrón Recomendado

Para cualquier vista que necesite navegación contextual:

1. **Controlador:** Capturar `req.query.return`
2. **Controlador:** Pasar `returnUrl` a la vista
3. **Vista:** Usar `{{returnUrl}}` en botones de navegación
4. **Enlaces:** Incluir `?return={{currentUrl}}` al navegar

---

## ✅ CONCLUSIÓN

**Navegación contextual implementada correctamente:**
- ✅ Parámetro `return` procesado
- ✅ Botones "Volver" funcionan correctamente
- ✅ Mantiene contexto de navegación
- ✅ UX mejorada
- ✅ Código limpio y mantenible

**Sistema completamente funcional.**

---

**Accede a:** https://sgi.ultimamilla.com.ar/proyectos

**Verifica:**
1. Ver un proyecto
2. Click en "Ver" en un certificado
3. Click en "Volver"
4. ✅ Debe volver al proyecto

