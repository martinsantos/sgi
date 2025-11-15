# 🔧 HOTFIX: RESTAURACIÓN DE SERVICIOS - 15 NOV 2025

**Fecha:** 15 de Noviembre 2025, 14:00 UTC-3  
**Servidor:** 23.105.176.45 (sgi.ultimamilla.com.ar)  
**Status:** ✅ AMBOS SERVICIOS RESTAURADOS

---

## 🚨 PROBLEMA IDENTIFICADO

**Error:** Servidor caído - ultimamilla.com.ar retornaba 502 Bad Gateway

**Causa Raíz:** SGI fue configurado en puerto 3000, interfiriendo con Astro que también necesita puerto 3000

**Impacto:**
- ❌ ultimamilla.com.ar (Astro) - NO FUNCIONABA
- ❌ sgi.ultimamilla.com.ar (SGI) - NO FUNCIONABA

---

## ✅ SOLUCIONES IMPLEMENTADAS

### 1. Restaurar SGI en Puerto 3456

**Archivo:** `/home/sgi.ultimamilla.com.ar/ecosystem.config.js`

```javascript
module.exports = {
  apps: [{
    name: "sgi",
    script: "src/server.js",
    env: {
      PORT: 3456,  // ✅ RESTAURADO A 3456
      NODE_ENV: "production",
      DB_HOST: "127.0.0.1",
      DB_PORT: "3306",
      DB_NAME: "sgi_production",
      DB_USER: "sgi_user",
      DB_PASS: "SgiProd2025Secure_"
    }
  }]
};
```

**Cambios:**
- Puerto: 3000 → 3456 (puerto correcto según arquitectura)
- PM2 reiniciado con `--update-env`

### 2. Restaurar Astro en Puerto 4321

**Problema:** Astro preview usa puerto 4321 por defecto, no respeta variable PORT

**Solución:** Actualizar Nginx para proxy a puerto 4321

**Archivo:** `/etc/nginx/sites-available/ultimamilla.com.ar`

```nginx
# ANTES:
location / {
    proxy_pass http://127.0.0.1:3000;
}

# DESPUÉS:
location / {
    proxy_pass http://127.0.0.1:4321;  # ✅ Puerto correcto de Astro
}
```

**Cambios:**
- Nginx reconfigurado para proxy a puerto 4321
- `systemctl reload nginx` ejecutado

---

## 📊 ARQUITECTURA FINAL CORRECTA

| Servicio | URL | Backend | Puerto | Status |
|----------|-----|---------|--------|--------|
| **Ultima Milla** | ultimamilla.com.ar | Astro (preview) | 4321 | ✅ HTTP 200 |
| **SGI System** | sgi.ultimamilla.com.ar | Node.js PM2 | 3456 | ✅ HTTP 302 |
| **Admin Panel** | admin.ultimamilla.com.ar | Directus | 8055 | ✅ Activo |

---

## 🚀 VERIFICACIÓN POST-FIX

✅ **Puertos Correctos:**
```
tcp   LISTEN 0      511    0.0.0.0:4321    (Astro)
tcp   LISTEN 0      511           *:3456    (SGI)
```

✅ **Servicios Activos:**
```
ultimamilla.com.ar:     HTTP 200 ✅
sgi.ultimamilla.com.ar: HTTP 302 ✅ (redirección a login)
```

✅ **PM2 Status:**
```
│ 0  │ sgi    │ default     │ 1.0.0   │ fork    │ 48129    │ 3m     │ 0    │ online    │ 0%       │ 98.9mb   │ root     │ disabled │
```

---

## 📋 CAMBIOS REALIZADOS

| Componente | Cambio | Status |
|-----------|--------|--------|
| SGI - ecosystem.config.js | Puerto 3000 → 3456 | ✅ |
| SGI - PM2 restart | Con --update-env | ✅ |
| Astro - Proceso | Reiniciado en puerto 4321 | ✅ |
| Nginx - ultimamilla.com.ar | proxy_pass 3000 → 4321 | ✅ |
| Nginx - Reload | systemctl reload nginx | ✅ |

---

## 🔍 LECCIONES APRENDIDAS

1. **Separación de Puertos:** Cada servicio debe tener su puerto único
   - Astro: 4321 (por defecto de preview)
   - SGI: 3456 (según arquitectura)
   - Nginx: 80/443 (proxy inverso)

2. **Astro Preview Limitaciones:** No respeta variable PORT, siempre usa 4321

3. **Nginx Proxy:** Debe apuntar al puerto REAL del backend, no al puerto esperado

4. **PM2 Variables de Entorno:** Requiere `--update-env` para aplicar cambios

---

## 📌 COMANDOS EJECUTADOS

```bash
# 1. Actualizar ecosystem.config.js con puerto 3456
cat > /home/sgi.ultimamilla.com.ar/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: "sgi",
    script: "src/server.js",
    env: {
      PORT: 3456,
      NODE_ENV: "production",
      DB_HOST: "127.0.0.1",
      DB_PORT: "3306",
      DB_NAME: "sgi_production",
      DB_USER: "sgi_user",
      DB_PASS: "SgiProd2025Secure_"
    }
  }]
};
EOF

# 2. Reiniciar SGI con variables actualizadas
pm2 delete sgi
cd /home/sgi.ultimamilla.com.ar
pm2 start ecosystem.config.js --update-env

# 3. Reiniciar Astro en puerto 4321
pkill -9 -f "astro preview"
cd /var/www/ultimamilla.com.ar
PORT=3000 node node_modules/.bin/astro preview --host > /dev/null 2>&1 &

# 4. Actualizar Nginx
sed -i "s/proxy_pass http:\/\/127.0.0.1:3000;/proxy_pass http:\/\/127.0.0.1:4321;/" /etc/nginx/sites-available/ultimamilla.com.ar
nginx -t
systemctl reload nginx

# 5. Verificar
ss -tulpn | grep -E "3000|3456|4321"
curl -s -I https://ultimamilla.com.ar | head -3
curl -s -I https://sgi.ultimamilla.com.ar | head -3
```

---

**Desplegado:** 15/11/2025 14:00 UTC-3  
**Servidor:** 23.105.176.45  
**Status:** ✅ **AMBOS SERVICIOS FUNCIONANDO CORRECTAMENTE**
