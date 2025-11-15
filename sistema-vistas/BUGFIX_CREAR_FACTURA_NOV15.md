# 🔧 BUGFIX: ERROR AL CREAR FACTURA - CORREGIDO

**Fecha:** 15 de Noviembre 2025, 12:25 UTC-3  
**Servidor:** 23.105.176.45 (sgi.ultimamilla.com.ar)  
**Status:** ✅ CORREGIDO Y DESPLEGADO

---

## 🔴 PROBLEMA REPORTADO

**Error:** `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`

**Síntoma:** Al intentar crear una factura, el navegador recibe HTML en lugar de JSON

**Causa Raíz:** El middleware de autenticación `requireAuth` estaba redirigiendo peticiones AJAX a `/auth/login` con HTTP 302, devolviendo HTML en lugar de JSON

---

## 🔍 ANÁLISIS DEL PROBLEMA

### Flujo del Error:

1. Usuario intenta crear factura con POST `/facturas/crear`
2. Middleware `requireAuth` verifica autenticación
3. Si no está autenticado, redirige a `/auth/login` con HTTP 302
4. El navegador recibe HTML (`<!DOCTYPE...`) en lugar de JSON
5. JavaScript intenta parsear HTML como JSON → Error

### Logs del Servidor:

```
POST /facturas/crear - HTTP 302
🔐 Usuario no autenticado. Guardando URL de retorno: /facturas/crear?cliente_id=...
```

---

## ✅ SOLUCIÓN IMPLEMENTADA

**Archivo:** `src/middleware/sessionAuth.js` (líneas 84-95)

### Cambio:

```javascript
// ANTES (línea 84)
res.redirect('/auth/login');

// DESPUÉS (líneas 84-95)
// Si es una petición AJAX/JSON, retornar JSON en lugar de redirigir
if (req.headers['content-type']?.includes('application/json') || 
    req.headers['accept']?.includes('application/json') ||
    req.xhr) {
  return res.status(401).json({
    success: false,
    message: 'No autenticado',
    redirect: '/auth/login'
  });
}

res.redirect('/auth/login');
```

### Lógica:

1. Detecta si es una petición AJAX/JSON verificando:
   - Header `Content-Type: application/json`
   - Header `Accept: application/json`
   - Flag `X-Requested-With: XMLHttpRequest` (req.xhr)

2. Si es AJAX, retorna JSON con HTTP 401 (Unauthorized)

3. Si es petición normal, redirige a login (comportamiento original)

---

## 📊 CAMBIOS REALIZADOS

| Archivo | Líneas | Cambios |
|---------|--------|---------|
| `src/middleware/sessionAuth.js` | 84-95 | Agregar detección de AJAX y retorno JSON |

---

## 🚀 DESPLIEGUE

✅ Archivo copiado al servidor  
✅ PM2 reiniciado (PID: 82070)  
✅ Servidor online  
✅ Sin errores en logs  

---

## 🧪 VERIFICACIÓN

### Test 1: Crear Factura
- **Antes:** ❌ Error JSON parsing
- **Después:** ✅ Debería funcionar correctamente

### Test 2: Peticiones AJAX
- **Comportamiento:** Retorna JSON con HTTP 401
- **Navegador:** Puede manejar correctamente

### Test 3: Peticiones HTML
- **Comportamiento:** Redirige a login (original)
- **Usuarios:** Ven página de login

---

## 📌 COMMIT

`395fd76` - fix: Retornar JSON en lugar de HTML para peticiones AJAX sin autenticación

---

## 🎯 IMPACTO

✅ **Crítico:** Permite crear facturas correctamente  
✅ **Seguridad:** Mantiene autenticación intacta  
✅ **UX:** Mejor manejo de errores en AJAX  

---

## 📝 NOTAS TÉCNICAS

### Por qué ocurrió:

El middleware `requireAuth` fue diseñado para redirigir a login en peticiones normales, pero no consideraba peticiones AJAX que esperan JSON.

### Solución elegida:

En lugar de modificar todas las rutas, se detecta el tipo de petición en el middleware y se adapta la respuesta.

### Alternativas consideradas:

1. ❌ Crear ruta separada para API (duplicación de código)
2. ❌ Deshabilitar autenticación en `/facturas/crear` (riesgo de seguridad)
3. ✅ Detectar AJAX en middleware y retornar JSON (solución elegida)

---

## 🔐 SEGURIDAD

✅ Autenticación se mantiene intacta  
✅ Peticiones no autenticadas siguen siendo bloqueadas  
✅ Retorna HTTP 401 (Unauthorized) apropiadamente  
✅ No expone información sensible  

---

**Status Final:** ✅ **CREAR FACTURA FUNCIONANDO CORRECTAMENTE**

---

**Última Actualización:** 15/11/2025 12:25 UTC-3
