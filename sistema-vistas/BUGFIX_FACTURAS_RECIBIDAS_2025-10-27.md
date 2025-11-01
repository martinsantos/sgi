# 🐛 BUGFIX: FACTURAS RECIBIDAS NO CARGABAN

**Fecha:** 27 de Octubre 2025, 10:01 UTC-3
**Severidad:** CRÍTICA
**URL:** https://sgi.ultimamilla.com.ar/facturas/recibidas

---

## ❌ PROBLEMA

La página de facturas recibidas mostraba "Cargando facturas recibidas..." indefinidamente sin cargar los datos.

### Síntoma
```
GET /facturas/recibidas → Carga la página
GET /facturas/api/recibidas → Error 500
```

### Error en Logs
```
❌ Error en API de facturas recibidas: Error: Access denied for user 'sgi_user'@'localhost' (using password: NO)
```

---

## 🔍 CAUSA RAÍZ

En el archivo `src/models/FacturaModel.js` línea 9, había un **nombre de variable de entorno incorrecto**:

```javascript
// ❌ INCORRECTO:
password: process.env.DB_PASSWORD || '',

// ✅ CORRECTO:
password: process.env.DB_PASS || '',
```

**Explicación:**
- El archivo `.env` define: `DB_PASS=SgiProd2025Secure_`
- El código buscaba: `DB_PASSWORD` (no existe)
- Resultado: La contraseña era `undefined` → MySQL rechazaba la conexión sin contraseña

---

## ✅ SOLUCIÓN

Cambié la línea 9 de `FacturaModel.js`:

```diff
- password: process.env.DB_PASSWORD || '',
+ password: process.env.DB_PASS || '',
```

---

## 📋 ARCHIVOS MODIFICADOS

| Archivo | Línea | Cambio |
|---------|-------|--------|
| `src/models/FacturaModel.js` | 9 | `DB_PASSWORD` → `DB_PASS` |

---

## 🚀 DEPLOYMENT

```bash
✅ Archivo desplegado
✅ PM2 reiniciado (PID: 32317)
✅ Conexión a BD restaurada
✅ Sin errores en logs
```

---

## ✅ VERIFICACIÓN

### Antes
```
❌ Access denied for user 'sgi_user'@'localhost' (using password: NO)
❌ Página cargando indefinidamente
```

### Después
```
✅ Conexión exitosa a la base de datos
✅ 📊 Versión de MySQL: 10.11.13-MariaDB
✅ 🗄️  Tablas en la base de datos: 118
✅ Página carga correctamente
```

---

## 🧪 TESTING

### Paso 1: Acceder a facturas recibidas
```
https://sgi.ultimamilla.com.ar/facturas/recibidas
```

### Paso 2: Verificar que carga
```
✅ Debe mostrar tabla con facturas
✅ Debe tener filtros de búsqueda
✅ Debe permitir exportar a Excel
✅ Debe permitir crear nueva factura
```

### Paso 3: Verificar API
```
GET /facturas/api/recibidas?page=1&limit=10
✅ Debe retornar JSON con datos
✅ Debe incluir paginación
```

---

## 📝 LECCIONES APRENDIDAS

1. **Nombres de variables de entorno deben ser consistentes** en todo el código
2. **Usar búsqueda global** para encontrar todas las referencias a variables de entorno
3. **Documentar variables de entorno** en archivo `.env.example`
4. **Validar en startup** que todas las variables requeridas estén configuradas

---

## 🔗 REFERENCIAS

- Archivo `.env`: Define `DB_PASS` (no `DB_PASSWORD`)
- Archivo `src/config/database.js`: Usa `DB_PASS` (correcto)
- Archivo `src/models/FacturaModel.js`: Usaba `DB_PASSWORD` (incorrecto) → **CORREGIDO**

---

**Status:** ✅ RESUELTO Y DESPLEGADO

