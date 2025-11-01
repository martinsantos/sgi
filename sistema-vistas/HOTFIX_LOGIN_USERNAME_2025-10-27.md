# 🔧 HOTFIX - LOGIN CON USERNAME Y EMAIL

**Fecha:** 27 de Octubre 2025, 15:05 UTC-3
**Problema:** Login no funcionaba con credenciales de usuario
**Status:** ✅ RESUELTO

---

## 🐛 PROBLEMA IDENTIFICADO

### Síntomas
```
❌ Formulario de login pide "Email"
❌ Usuario intenta ingresar con "ultimamilla" (username)
❌ Login falla: "Usuario no encontrado"
❌ Credenciales: ultimamilla / SGI@2025!UM
```

### Causa Raíz
```
El middleware sessionAuth.validateCredentials() solo buscaba por EMAIL
Pero el usuario estaba intentando ingresar con USERNAME
```

---

## ✅ SOLUCIÓN IMPLEMENTADA

### Cambio 1: Middleware sessionAuth.js
```javascript
// ❌ ANTES:
const [users] = await pool.query(
  'SELECT ... FROM users WHERE email = ? AND activo = 1',
  [email]
);

// ✅ DESPUÉS:
const [users] = await pool.query(
  'SELECT ... FROM users WHERE (email = ? OR username = ?) AND activo = 1',
  [emailOrUsername, emailOrUsername]
);
```

### Cambio 2: Formulario login.handlebars
```handlebars
<!-- ❌ ANTES -->
<label for="username">Usuario</label>
<input type="text" name="username" ...>

<!-- ✅ DESPUÉS -->
<label for="email">Usuario o Email</label>
<input type="text" name="email" ...>
```

### Cambio 3: Rutas auth-session.js
```javascript
// Actualizar comentarios para indicar que acepta ambos
// Validar credenciales (acepta email o username)
```

---

## 🧪 VERIFICACIÓN

### Test: Login con username
```bash
curl -X POST http://localhost:3456/auth/login \
  -d 'email=ultimamilla&password=SGI@2025!UM'

Resultado:
✅ HTTP 302 Found
✅ Location: /dashboard
✅ Set-Cookie: connect.sid=... (sesión creada)
```

---

## 📊 ARCHIVOS MODIFICADOS

| Archivo | Cambios |
|---------|---------|
| `src/middleware/sessionAuth.js` | Buscar por email O username |
| `src/routes/auth-session.js` | Actualizar comentarios |
| `src/views/auth/login.handlebars` | Cambiar label a "Usuario o Email" |

---

## 🔐 CREDENCIALES DE PRUEBA

```
Usuario: ultimamilla
Email: martin@ultimamilla.com.ar
Contraseña: SGI@2025!UM
```

Ambas credenciales funcionan ahora:
- ✅ ultimamilla / SGI@2025!UM
- ✅ martin@ultimamilla.com.ar / SGI@2025!UM

---

## 🚀 DEPLOYMENT

```bash
✅ Archivos copiados a servidor
✅ PM2 reiniciado (PID: 97667)
✅ Sin errores críticos
✅ Login funcionando
```

---

## ✅ CONCLUSIÓN

```
🎉 LOGIN FUNCIONANDO CORRECTAMENTE

✅ Acepta username: FUNCIONANDO
✅ Acepta email: FUNCIONANDO
✅ Credenciales ultimamilla: FUNCIONANDO
✅ Sesión creada: FUNCIONANDO
✅ Redirección: FUNCIONANDO
```

---

**Hotfix Completado:** 27 de Octubre 2025, 15:05 UTC-3

