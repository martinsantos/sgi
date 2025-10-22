# PLAN DE ACCIÓN CORRECTIVA - SGI SYSTEM
**Basado en:** TEST_INTEGRAL_RESULTS.md  
**Fecha:** 2025-10-07  
**Responsable:** Equipo DevOps / Desarrollo  

---

## 🎯 OBJETIVO
Estabilizar el sistema SGI eliminando los 371 reinicios/23h y optimizar recursos del servidor.

---

## 🔴 PRIORIDAD 1 - ACCIÓN INMEDIATA (HOY)

### 1.1 Resolver Problema de Tabla `clientes`
**Tiempo estimado:** 30 minutos  
**Impacto:** CRÍTICO - Elimina 371 reinicios/23h

**Opciones de Solución:**

#### Opción A: Crear tabla `clientes` (Recomendado)
```sql
-- Conectar a la base de datos
mysql -u sgi_user -p'SgiProd2025Secure_' sgi_production

-- Crear tabla clientes
CREATE TABLE IF NOT EXISTS clientes (
    id VARCHAR(36) PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    codigo VARCHAR(50) UNIQUE,
    tipo_persona ENUM('F', 'J') DEFAULT 'F',
    cuil_cuit VARCHAR(11),
    contacto_principal VARCHAR(255),
    email VARCHAR(255),
    telefono VARCHAR(50),
    condicion_iva VARCHAR(50),
    tipo_cliente VARCHAR(50),
    created DATETIME DEFAULT CURRENT_TIMESTAMP,
    modified DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    activo TINYINT(1) DEFAULT 1,
    INDEX idx_codigo (codigo),
    INDEX idx_cuil_cuit (cuil_cuit),
    INDEX idx_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Pasos:**
1. Conectar al servidor: `ssh root@23.105.176.45`
2. Ejecutar script SQL anterior
3. Verificar: `SHOW TABLES LIKE 'clientes';`
4. Reiniciar SGI: `pm2 restart sgi`
5. Monitorear logs: `pm2 logs sgi --lines 50`

#### Opción B: Refactorizar código (Alternativa)
- Modificar `clientesController.js` para usar tabla `personas`
- Requiere análisis más profundo del código
- Tiempo estimado: 2-4 horas

---

### 1.2 Configurar Middleware Flash o Remover Dependencia
**Tiempo estimado:** 15 minutos  
**Impacto:** MEDIO - Elimina errores TypeError

**Opción A: Instalar connect-flash**
```bash
# Conectar al servidor
ssh root@23.105.176.45

# Ir al directorio de la aplicación
cd /home/sgi.ultimamilla.com.ar

# Instalar dependencias
npm install connect-flash express-session

# Reiniciar aplicación
pm2 restart sgi
```

**Opción B: Remover referencias a flash**
```javascript
// Buscar todas las referencias a req.flash()
grep -r "req.flash" /home/sgi.ultimamilla.com.ar/src/

// Comentar o eliminar líneas que usen req.flash()
// Reemplazar con console.log() o logger apropiado
```

---

### 1.3 Limpiar Logs y Liberar Espacio
**Tiempo estimado:** 20 minutos  
**Impacto:** ALTO - Previene fallo del sistema

```bash
# Conectar al servidor
ssh root@23.105.176.45

# Ver uso de espacio
du -sh /var/log/* | sort -h
du -sh /root/.pm2/logs/* | sort -h

# Rotar logs PM2
pm2 flush

# Limpiar logs antiguos del sistema
find /var/log -type f -name "*.log" -mtime +30 -delete
find /var/log -type f -name "*.gz" -mtime +30 -delete

# Limpiar journal
journalctl --vacuum-time=7d

# Verificar espacio liberado
df -h /
```

---

## 🟠 PRIORIDAD 2 - CORTO PLAZO (1-2 DÍAS)

### 2.1 Actualizar Documentación Técnica
**Tiempo estimado:** 1 hora  
**Archivo:** `.windsurf/rules/arquitectturaservidor.md`

**Cambios Requeridos:**
```markdown
# CORRECCIONES:
1. Puerto Astro: 3000 → 4321
2. Proceso Astro: "PM2" → "Standalone (/root/fumbling-field)"
3. Agregar nota: admin.ultimamilla.com.ar NO configurado
4. Actualizar métricas de recursos
5. Documentar problema de tabla clientes (resuelto)
```

---

### 2.2 Configurar admin.ultimamilla.com.ar
**Tiempo estimado:** 30 minutos  

```bash
# Crear configuración Nginx
cat > /etc/nginx/sites-available/admin.ultimamilla.com.ar << 'EOF'
server {
    listen 80;
    server_name admin.ultimamilla.com.ar;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name admin.ultimamilla.com.ar;
    
    # SSL Configuration (usar Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/admin.ultimamilla.com.ar/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.ultimamilla.com.ar/privkey.pem;
    
    # Proxy a Directus
    location / {
        proxy_pass http://127.0.0.1:8055;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Obtener certificado SSL
certbot certonly --nginx -d admin.ultimamilla.com.ar

# Habilitar sitio
ln -s /etc/nginx/sites-available/admin.ultimamilla.com.ar /etc/nginx/sites-enabled/

# Verificar configuración
nginx -t

# Recargar Nginx
systemctl reload nginx
```

---

### 2.3 Migrar Astro a PM2
**Tiempo estimado:** 45 minutos  

```bash
# Crear archivo ecosystem para Astro
cat > /root/fumbling-field/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'astro-um',
    script: 'node_modules/.bin/astro',
    args: 'dev --host 0.0.0.0 --port 4321',
    cwd: '/root/fumbling-field',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    }
  }]
}
EOF

# Detener proceso actual
pkill -f "astro dev"

# Iniciar con PM2
cd /root/fumbling-field
pm2 start ecosystem.config.js
pm2 save

# Verificar
pm2 list
curl http://localhost:4321
```

---

### 2.4 Implementar Rotación Automática de Logs
**Tiempo estimado:** 30 minutos  

```bash
# Configurar logrotate para PM2
cat > /etc/logrotate.d/pm2 << 'EOF'
/root/.pm2/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# Configurar logrotate para aplicación SGI
cat > /etc/logrotate.d/sgi << 'EOF'
/home/sgi.ultimamilla.com.ar/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
    maxsize 100M
}
EOF

# Test manual
logrotate -f /etc/logrotate.d/pm2
```

---

## 🟡 PRIORIDAD 3 - MEDIANO PLAZO (1 SEMANA)

### 3.1 Upgrade de Recursos del Servidor
**Tiempo estimado:** 2-4 horas (incluye migración)  
**Requerimientos Recomendados:**
- **RAM:** 1.7GB → 4GB (mínimo 3GB)
- **Disco:** 50GB → 100GB
- **CPU:** Mantener actual (suficiente)

**Pasos:**
1. Contactar proveedor de hosting
2. Solicitar upgrade de plan
3. Planificar ventana de mantenimiento
4. Realizar backup completo
5. Ejecutar upgrade
6. Verificar todos los servicios

---

### 3.2 Optimizar Configuración Docker
**Tiempo estimado:** 1 hora  

```yaml
# Agregar límites de memoria en docker-compose.yml
services:
  um25_directus:
    mem_limit: 256m
    memswap_limit: 256m
    
  um25_database:
    mem_limit: 512m
    memswap_limit: 512m
    
  umbot-postgres-prod:
    mem_limit: 256m
    memswap_limit: 256m
    
  umbot-redis-prod:
    mem_limit: 128m
    memswap_limit: 128m
```

**Aplicar cambios:**
```bash
# Recrear contenedores con nuevos límites
docker-compose down
docker-compose up -d

# Verificar límites
docker stats --no-stream
```

---

### 3.3 Implementar Monitoreo Proactivo
**Tiempo estimado:** 2 horas  
**Herramientas sugeridas:**
- **PM2 Plus** (monitoreo PM2)
- **Netdata** (monitoreo sistema)
- **Uptime Kuma** (monitoreo URLs)

```bash
# Instalar Netdata
bash <(curl -Ss https://get.netdata.cloud/kickstart.sh)

# Configurar alertas por email
vi /etc/netdata/health_alarm_notify.conf
# Configurar SMTP y destinatarios

# Configurar PM2 Plus (opcional - requiere cuenta)
pm2 link <secret_key> <public_key>
```

**Alertas a configurar:**
- Disco > 85%
- RAM > 90%
- CPU > 80% sostenido
- Servicio caído
- Reinicio de proceso

---

## 📊 VERIFICACIÓN POST-IMPLEMENTACIÓN

### Checklist de Verificación

#### Después de Prioridad 1:
- [ ] Tabla `clientes` existe en base de datos
- [ ] SGI no tiene errores ER_NO_SUCH_TABLE en logs
- [ ] Reinicios de PM2 < 5 por día
- [ ] Espacio en disco > 30% libre
- [ ] Uso de RAM < 75%

#### Después de Prioridad 2:
- [ ] Documentación actualizada
- [ ] admin.ultimamilla.com.ar responde HTTP 200
- [ ] Astro corre en PM2
- [ ] Logs rotan automáticamente
- [ ] PM2 list muestra: sgi, astro-um

#### Después de Prioridad 3:
- [ ] Recursos del servidor expandidos
- [ ] Contenedores con límites de memoria
- [ ] Monitoreo activo y enviando alertas
- [ ] Dashboard de monitoreo accesible

---

## 📝 REGISTRO DE CAMBIOS

### Template para cada acción completada:
```
---
**Acción:** [Número y nombre]
**Fecha:** YYYY-MM-DD HH:MM
**Ejecutado por:** [Nombre]
**Resultado:** [Exitoso/Fallido]
**Observaciones:** [Detalles relevantes]
**Verificación:** [Comando usado y resultado]
---
```

---

## 🆘 ROLLBACK PLAN

### Si algo falla después de cada cambio:

#### Tabla clientes:
```sql
DROP TABLE IF EXISTS clientes;
-- O restaurar backup de BD
```

#### Nginx admin site:
```bash
rm /etc/nginx/sites-enabled/admin.ultimamilla.com.ar
systemctl reload nginx
```

#### Astro en PM2:
```bash
pm2 delete astro-um
# Reiniciar manualmente:
cd /root/fumbling-field
nohup node node_modules/.bin/astro dev --host 0.0.0.0 --port 4321 &
```

---

## 📞 CONTACTOS DE SOPORTE

**Hosting Provider:** [Agregar información]  
**Base de Datos:** root / sgi_user  
**Aplicación:** PM2 id:20 (sgi)  

**Logs importantes:**
- PM2 SGI: `/root/.pm2/logs/sgi-*.log`
- Nginx: `/var/log/nginx/error.log`
- Sistema: `journalctl -u nginx -n 100`

---

## ✅ CRITERIOS DE ÉXITO

El plan será considerado exitoso cuando:
1. ✅ Reinicios PM2 < 5 por día (vs 371/23h actual)
2. ✅ Uso de disco < 70%
3. ✅ Uso de RAM < 70%
4. ✅ No hay errores en logs por 24h consecutivas
5. ✅ Todas las URLs públicas responden HTTP 200/401
6. ✅ Documentación actualizada y precisa
7. ✅ Monitoreo activo reportando métricas

---

**Última actualización:** 2025-10-07  
**Próxima revisión:** Post-implementación de cada prioridad
