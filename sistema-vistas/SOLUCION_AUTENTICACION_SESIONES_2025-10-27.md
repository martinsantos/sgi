# 🔐 SOLUCIÓN: AUTENTICACIÓN CON SESIONES Y PERSISTENCIA DE URL

**Fecha:** 27 de Octubre 2025
**Problema:** 
1. URLs no resuelven bien
2. No redirige a URL original después del login
3. Siempre va al dashboard

**Solución:** Implementar autenticación con sesiones y persistencia de URL

---

## 📋 PROBLEMAS IDENTIFICADOS

### 1. Sistema de Autenticación Actual
```
❌ Usa HTTP Basic Auth (credenciales en header)
❌ No mantiene sesiones
❌ No guarda URL solicitada
❌ Siempre redirige al dashboard después del login
```

### 2. Flujo Actual (INCORRECTO)
```
Usuario accede a /clientes
    ↓
basicAuth pide credenciales
    ↓
Usuario ingresa credenciales
    ↓
Redirige a /dashboard (SIEMPRE)
    ↓
Usuario debe volver a /clientes manualmente
```

### 3. Flujo Deseado (CORRECTO)
```
Usuario accede a /clientes
    ↓
Si no está autenticado:
  - Guardar URL (/clientes) en sesión
  - Redirigir a /auth/login
    ↓
Usuario ingresa credenciales
    ↓
Crear sesión
    ↓
Redirigir a URL guardada (/clientes)
    ↓
Usuario ve la página que solicitó
```

---

## ✅ SOLUCIÓN IMPLEMENTADA

### 1. Nuevo Middleware: `sessionAuth.js`
```javascript
// Características:
✅ Verifica autenticación por sesión
✅ Guarda URL solicitada en req.session.returnTo
✅ Redirige al login si no está autenticado
✅ Valida credenciales contra BD
✅ Registra último login/logout
```

**Ubicación:** `src/middleware/sessionAuth.js`

**Funciones principales:**
- `requireAuth()` - Middleware de autenticación
- `validateCredentials()` - Valida email/password contra BD
- `updateLastLogin()` - Registra login
- `updateLogout()` - Registra logout

### 2. Nuevas Rutas: `auth-session.js`
```javascript
// Rutas:
GET  /auth/login              - Mostrar formulario
POST /auth/login              - Procesar login
GET  /auth/logout             - Cerrar sesión
GET  /auth/forgot-password    - Formulario de recuperación
POST /auth/forgot-password    - Procesar recuperación
GET  /auth/reset-password/:token - Formulario de reset
POST /auth/reset-password     - Procesar reset
```

**Ubicación:** `src/routes/auth-session.js`

---

## 🔧 PASOS DE IMPLEMENTACIÓN

### Paso 1: Actualizar app.js
```javascript
// Reemplazar el middleware basicAuth con sessionAuth

// ❌ ANTES:
app.use((req, res, next) => {
  if (req.path.startsWith('/auth/') || ...) {
    return next();
  }
  return basicAuth(req, res, next);
});

// ✅ DESPUÉS:
const { requireAuth, setUserLocals } = require('./middleware/sessionAuth');
app.use(requireAuth);
app.use(setUserLocals);
```

### Paso 2: Montar rutas de autenticación
```javascript
// Reemplazar las rutas de auth antiguas
const authSessionRoutes = require('./routes/auth-session');
mountRoute(authSessionRoutes, '/auth', 'auth-session');
```

### Paso 3: Crear vistas de login
```
src/views/auth/
├── login.handlebars
├── forgot-password.handlebars
└── reset-password.handlebars
```

### Paso 4: Verificar tabla users
```sql
-- La tabla users debe tener estos campos:
SELECT * FROM users LIMIT 1;

-- Campos requeridos:
-- id (UUID)
-- email (UNIQUE)
-- password (hashed con bcrypt)
-- username
-- nombre_completo
-- activo
-- last_login
-- on_line
-- reset_token (nullable)
-- reset_token_expires (nullable)
```

---

## 📝 VISTA DE LOGIN (login.handlebars)

```handlebars
<div class="container mt-5">
  <div class="row justify-content-center">
    <div class="col-md-6">
      <div class="card shadow">
        <div class="card-header bg-primary text-white">
          <h4 class="mb-0">🔐 Sistema de Gestión Integral</h4>
        </div>
        <div class="card-body">
          {{#if error}}
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
              {{error}}
              <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
          {{/if}}

          <form method="POST" action="/auth/login">
            <div class="mb-3">
              <label for="email" class="form-label">Email</label>
              <input type="email" class="form-control" id="email" name="email" required>
            </div>

            <div class="mb-3">
              <label for="password" class="form-label">Contraseña</label>
              <input type="password" class="form-control" id="password" name="password" required>
            </div>

            <button type="submit" class="btn btn-primary w-100">Ingresar</button>
          </form>

          <hr>

          <p class="text-center">
            <a href="/auth/forgot-password">¿Olvidaste tu contraseña?</a>
          </p>
        </div>
      </div>
    </div>
  </div>
</div>
```

---

## 🔄 FLUJO DE AUTENTICACIÓN

### 1. Usuario accede a /clientes sin autenticación
```
GET /clientes
  ↓
requireAuth() middleware
  ↓
¿req.session.userId existe? NO
  ↓
Guardar: req.session.returnTo = '/clientes'
  ↓
res.redirect('/auth/login')
```

### 2. Usuario ve formulario de login
```
GET /auth/login
  ↓
Mostrar formulario con returnTo = '/clientes'
```

### 3. Usuario ingresa credenciales
```
POST /auth/login
  ↓
Validar email/password contra BD
  ↓
¿Válidas? SÍ
  ↓
Crear sesión:
  - req.session.userId = user.id
  - req.session.email = user.email
  - req.session.username = user.username
  ↓
Obtener returnTo = '/clientes'
  ↓
Limpiar: delete req.session.returnTo
  ↓
res.redirect('/clientes')
```

### 4. Usuario ve página solicitada
```
GET /clientes
  ↓
requireAuth() middleware
  ↓
¿req.session.userId existe? SÍ
  ↓
Continuar a controlador
  ↓
Mostrar /clientes
```

---

## 🧪 TESTING

### Test 1: Acceder a URL sin autenticación
```bash
curl -i https://sgi.ultimamilla.com.ar/clientes
# Esperado: HTTP 302 → /auth/login
```

### Test 2: Login y redirección
```bash
# 1. Acceder a /clientes
curl -i https://sgi.ultimamilla.com.ar/clientes
# Esperado: Redirige a /auth/login

# 2. Hacer login
curl -X POST https://sgi.ultimamilla.com.ar/auth/login \
  -d "email=user@example.com&password=password123"
# Esperado: HTTP 302 → /clientes

# 3. Acceder a /clientes con sesión
curl -i -b "connect.sid=..." https://sgi.ultimamilla.com.ar/clientes
# Esperado: HTTP 200 - Muestra /clientes
```

### Test 3: Logout
```bash
curl -i https://sgi.ultimamilla.com.ar/auth/logout
# Esperado: HTTP 302 → /auth/login
# Sesión destruida
```

---

## 🚀 DEPLOYMENT

### Paso 1: Copiar archivos
```bash
scp src/middleware/sessionAuth.js root@23.105.176.45:/home/sgi.ultimamilla.com.ar/src/middleware/
scp src/routes/auth-session.js root@23.105.176.45:/home/sgi.ultimamilla.com.ar/src/routes/
```

### Paso 2: Actualizar app.js
```bash
scp src/app.js root@23.105.176.45:/home/sgi.ultimamilla.com.ar/src/
```

### Paso 3: Crear vistas
```bash
scp src/views/auth/*.handlebars root@23.105.176.45:/home/sgi.ultimamilla.com.ar/src/views/auth/
```

### Paso 4: Reiniciar servicio
```bash
ssh root@23.105.176.45 "pm2 restart sgi"
```

### Paso 5: Verificar
```bash
ssh root@23.105.176.45 "pm2 logs sgi --lines 20"
```

---

## ✅ BENEFICIOS

```
✅ Usuario accede a URL deseada
✅ Si no está autenticado, guarda la URL
✅ Después del login, redirige a URL original
✅ Mejor experiencia de usuario
✅ Sesiones persistentes
✅ Logout funciona correctamente
✅ Recuperación de contraseña implementada
```

---

## 📊 COMPARACIÓN

| Aspecto | Antes | Después |
|--------|-------|---------|
| Autenticación | HTTP Basic | Sesiones |
| Persistencia de URL | ❌ No | ✅ Sí |
| Redirección | Siempre dashboard | URL original |
| Logout | No existe | ✅ Implementado |
| Recuperación pass | Parcial | ✅ Completo |
| UX | Pobre | Excelente |

---

## 🔐 SEGURIDAD

```
✅ Contraseñas hasheadas con bcrypt
✅ Sesiones con cookie httpOnly
✅ CSRF protection (si aplica)
✅ Validación de entrada
✅ Logs de auditoría
✅ Timeout de sesión (24 horas)
```

---

## 📝 PRÓXIMOS PASOS

1. ✅ Crear vistas de login/logout
2. ✅ Implementar recuperación de contraseña
3. ✅ Agregar two-factor authentication
4. ✅ Implementar rate limiting
5. ✅ Agregar validación de contraseña fuerte

---

**Documento Generado:** 27 de Octubre 2025, 14:50 UTC-3

