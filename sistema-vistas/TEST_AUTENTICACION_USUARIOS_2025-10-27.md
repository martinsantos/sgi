# 🔐 TEST DE AUTENTICACIÓN, USUARIOS Y RECUPERACIÓN DE CONTRASEÑA

**Fecha:** 27 de Octubre 2025
**Objetivo:** Verificar creación de usuarios, login, recuperación de pass y envío de correos
**Status:** EN PROGRESO

---

## 📋 CHECKLIST DE VERIFICACIÓN

### 1. CREACIÓN DE USUARIOS ✅

- [ ] **Crear usuario nuevo**
  - Email: test@example.com
  - Contraseña: TestPass123!@#
  - Nombre: Test
  - Apellido: User
  - Esperado: Usuario creado exitosamente

- [ ] **Validar email único**
  - Intentar crear usuario con email duplicado
  - Esperado: Error "Email ya existe"

- [ ] **Validar formato de email**
  - Email inválido: "not-an-email"
  - Esperado: Error de validación

- [ ] **Validar contraseña mínima**
  - Contraseña: "pass" (muy corta)
  - Esperado: Error "Contraseña debe tener al menos 8 caracteres"

- [ ] **Validar contraseña fuerte**
  - Contraseña: "weak"
  - Esperado: Error "Contraseña debe contener mayúsculas, minúsculas, números y caracteres especiales"

---

### 2. LOGIN Y AUTENTICACIÓN ✅

- [ ] **Login con credenciales válidas**
  - URL: POST /auth/login
  - Email: test@test.com
  - Password: test123
  - Esperado: HTTP 200, token JWT, información del usuario

- [ ] **Login con contraseña incorrecta**
  - Email: test@test.com
  - Password: wrongpassword
  - Esperado: HTTP 401, error "Contraseña inválida"

- [ ] **Login con usuario no existente**
  - Email: nonexistent@test.com
  - Password: anypassword
  - Esperado: HTTP 401, error "Usuario no encontrado"

- [ ] **Validar formato de email en login**
  - Email: "not-an-email"
  - Esperado: HTTP 400, error de validación

- [ ] **Token JWT debe tener expiración**
  - Esperado: Token incluye `exp` claim
  - Duración: 1 hora

- [ ] **Rechazar token expirado**
  - Esperado: HTTP 401, error "Token expirado"

---

### 3. RECUPERACIÓN DE CONTRASEÑA ✅

- [ ] **Solicitar recuperación de contraseña**
  - URL: POST /auth/forgot-password
  - Email: test@test.com
  - Esperado: HTTP 200/202, "Correo enviado"

- [ ] **Validar email existente**
  - Email: nonexistent@test.com
  - Esperado: HTTP 200 o 404 (por seguridad)

- [ ] **Generar token de reset**
  - Esperado: Token guardado en BD con expiración de 1 hora

- [ ] **Resetear contraseña con token válido**
  - URL: POST /auth/reset-password
  - Token: válido
  - Nueva contraseña: NewPass123!@#
  - Esperado: HTTP 200, "Contraseña actualizada"

- [ ] **Rechazar token expirado**
  - Token: expirado hace más de 1 hora
  - Esperado: HTTP 400, error "Token expirado"

- [ ] **Validar contraseña fuerte en reset**
  - Nueva contraseña: "weak"
  - Esperado: HTTP 400, error de validación

---

### 4. ENVÍO DE CORREOS ✅

- [ ] **Correo de bienvenida**
  - Esperado: Se envía cuando se crea usuario
  - Contiene: Nombre, email, contraseña temporal (si aplica)

- [ ] **Correo de recuperación de contraseña**
  - Esperado: Se envía con link de reset
  - Contiene: Link con token, instrucciones

- [ ] **Correo con credenciales**
  - Esperado: Se envía cuando admin crea usuario
  - Contiene: Email, contraseña temporal

- [ ] **Validar dirección de correo**
  - Emails válidos: user@example.com, test.user@example.co.uk
  - Emails inválidos: not-an-email, @example.com
  - Esperado: Validación correcta

- [ ] **Manejo de errores en envío**
  - Si falla envío: Debe registrarse en logs
  - Usuario debe ser notificado

---

### 5. CAMBIO DE CONTRASEÑA ✅

- [ ] **Cambiar contraseña con contraseña actual correcta**
  - URL: POST /auth/change-password
  - Contraseña actual: test123
  - Nueva contraseña: NewPass123!@#
  - Esperado: HTTP 200, "Contraseña actualizada"

- [ ] **Rechazar contraseña actual incorrecta**
  - Contraseña actual: wrongpassword
  - Esperado: HTTP 401, error "Contraseña actual incorrecta"

- [ ] **Validar nueva contraseña diferente**
  - Contraseña actual: test123
  - Nueva contraseña: test123 (igual)
  - Esperado: HTTP 400, error "Nueva contraseña debe ser diferente"

- [ ] **Validar contraseña fuerte**
  - Nueva contraseña: "weak"
  - Esperado: HTTP 400, error de validación

---

### 6. SESIONES Y TOKENS ✅

- [ ] **JWT debe incluir expiración**
  - Esperado: Token incluye `exp` claim
  - Duración: 1 hora

- [ ] **Rechazar token expirado**
  - Token: expirado
  - Esperado: HTTP 401, error "Token expirado"

- [ ] **Rechazar token inválido**
  - Token: "invalid.token.here"
  - Esperado: HTTP 401, error "Token inválido"

- [ ] **Refresh token (si aplica)**
  - Esperado: Poder renovar token sin volver a loguearse

---

### 7. LOGOUT ✅

- [ ] **Logout debe invalidar sesión**
  - URL: POST /auth/logout
  - Esperado: HTTP 200/302, sesión invalidada

- [ ] **Logout debe limpiar cookies**
  - Esperado: Cookies de sesión eliminadas

- [ ] **Logout debe limpiar token**
  - Esperado: Token invalidado en servidor (si aplica)

---

## 🔍 VERIFICACIONES TÉCNICAS

### Base de Datos
```sql
-- Tabla users debe existir
SELECT * FROM users LIMIT 1;

-- Campos requeridos:
-- id (UUID)
-- email (UNIQUE)
-- password (hashed)
-- nombre
-- apellido
-- reset_token (nullable)
-- reset_token_expires (nullable)
-- activo
-- created_at
-- updated_at
```

### Variables de Entorno
```
✅ SESSION_SECRET - Para firmar JWT
✅ MAIL_HOST - Para envío de correos
✅ MAIL_USER - Usuario de correo
✅ MAIL_PASS - Contraseña de correo
✅ MAIL_FROM - Dirección de origen
```

### Seguridad
```
✅ Contraseñas hasheadas con bcrypt
✅ Tokens JWT con expiración
✅ HTTPS en producción
✅ CORS configurado
✅ Rate limiting en login
✅ Validación de entrada
```

---

## 📊 RESULTADOS

### Creación de Usuarios
```
[ ] Crear usuario: PENDIENTE
[ ] Email único: PENDIENTE
[ ] Validación email: PENDIENTE
[ ] Validación contraseña: PENDIENTE
```

### Login
```
[ ] Credenciales válidas: PENDIENTE
[ ] Contraseña incorrecta: PENDIENTE
[ ] Usuario no existe: PENDIENTE
[ ] Token JWT: PENDIENTE
```

### Recuperación de Contraseña
```
[ ] Solicitar reset: PENDIENTE
[ ] Generar token: PENDIENTE
[ ] Resetear contraseña: PENDIENTE
[ ] Token expirado: PENDIENTE
```

### Envío de Correos
```
[ ] Correo bienvenida: PENDIENTE
[ ] Correo reset: PENDIENTE
[ ] Validación email: PENDIENTE
```

### Cambio de Contraseña
```
[ ] Cambiar contraseña: PENDIENTE
[ ] Contraseña actual: PENDIENTE
[ ] Nueva diferente: PENDIENTE
```

### Sesiones
```
[ ] JWT expiración: PENDIENTE
[ ] Token expirado: PENDIENTE
[ ] Token inválido: PENDIENTE
```

### Logout
```
[ ] Invalidar sesión: PENDIENTE
[ ] Limpiar cookies: PENDIENTE
```

---

## 🐛 PROBLEMAS ENCONTRADOS

(Se completará durante el testing)

---

## ✅ CONCLUSIONES

(Se completará después del testing)

---

**Última Actualización:** 27 de Octubre 2025, 14:39 UTC-3

