# CHECKLIST DE VERIFICACIÓN 24 HORAS POST-ESTABILIZACIÓN
**Inicio estabilización:** 2025-10-08 07:56 ART  
**Verificar en:** 2025-10-09 07:56 ART (24h después)  

---

## 🎯 OBJETIVO
Confirmar que la estabilización fue exitosa y el sistema permanece sin reinicios constantes.

---

## ✅ CHECKLIST DE VERIFICACIÓN

### 1. Estado del Proceso PM2
```bash
ssh root@23.105.176.45
pm2 list
```

**Verificar:**
- [ ] Proceso `sgi` está **online**
- [ ] Número de reinicios: **372 o cercano** (no debe aumentar significativamente)
- [ ] Uptime: **~24 horas** (o cercano)
- [ ] Memoria: **< 150MB** (normal)
- [ ] CPU: **< 5%** (normal)

**Resultado esperado:** ✅ Reinicios < 380 (menos de 8 en 24h es aceptable)

---

### 2. Logs sin Errores Críticos
```bash
ssh root@23.105.176.45
pm2 logs sgi --lines 50 --nostream
```

**Verificar que NO aparezcan:**
- [ ] ❌ `Table 'sgi_production.clientes' doesn't exist`
- [ ] ❌ `TypeError: req.flash is not a function`
- [ ] ❌ `ER_NO_SUCH_TABLE`
- [ ] ❌ Errores de conexión a base de datos

**Errores aceptables:**
- ⚠️ Warning de MemoryStore (no crítico)
- ⚠️ Errores de autenticación (401/403 - normales)

**Resultado esperado:** ✅ Sin errores críticos de tabla/flash

---

### 3. Tabla Clientes Funcional
```bash
ssh root@23.105.176.45
mysql -u sgi_user -p'SgiProd2025Secure_' sgi_production -e "
SHOW TABLES LIKE 'clientes';
DESCRIBE clientes;
SELECT COUNT(*) as total FROM clientes;
"
```

**Verificar:**
- [ ] Tabla `clientes` existe
- [ ] Tiene 13 campos
- [ ] Puede hacer queries sin errores

**Resultado esperado:** ✅ Tabla funcional

---

### 4. Middleware Flash Operativo
```bash
ssh root@23.105.176.45
grep -c "req\.flash is not a function" /root/.pm2/logs/sgi-error.log
# Debe retornar: 0
```

**Verificar:**
- [ ] No hay errores de `req.flash is not a function` en logs nuevos
- [ ] Middleware session.js existe en `/home/sgi.ultimamilla.com.ar/src/middleware/`
- [ ] connect-flash está en package.json

**Resultado esperado:** ✅ 0 errores de flash en últimas 24h

---

### 5. Conectividad HTTP
```bash
curl -I https://sgi.ultimamilla.com.ar
```

**Verificar:**
- [ ] Responde HTTP/2 **401** (auth requerida - correcto)
- [ ] Header `server: nginx`
- [ ] Header `x-powered-by: Express`
- [ ] Respuesta en < 2 segundos

**Resultado esperado:** ✅ HTTP 401 consistente

---

### 6. Recursos del Servidor
```bash
ssh root@23.105.176.45
df -h / && echo "---" && free -h
```

**Verificar:**
- [ ] Disco: **< 85%** usado
- [ ] RAM: **< 90%** usado
- [ ] SWAP: **< 70%** usado

**Resultado esperado:** ✅ Recursos dentro de límites aceptables

---

### 7. Base de Datos Conectada
```bash
ssh root@23.105.176.45
mysql -u sgi_user -p'SgiProd2025Secure_' sgi_production -e "
SELECT VERSION();
SELECT COUNT(*) as total_tablas FROM information_schema.tables 
WHERE table_schema = 'sgi_production';
"
```

**Verificar:**
- [ ] Versión MySQL: 10.11.13-MariaDB
- [ ] Total tablas: **111 o más**
- [ ] Conexión exitosa sin errores

**Resultado esperado:** ✅ Base de datos accesible

---

### 8. Test de Funcionalidad (Opcional - Manual)
**Requiere acceso web con credenciales:**

1. Abrir navegador: https://sgi.ultimamilla.com.ar
2. Ingresar credenciales de autenticación
3. Intentar:
   - [ ] Crear un cliente de prueba
   - [ ] Ver listado de clientes
   - [ ] Verificar mensajes flash (success/error)

**Resultado esperado:** ✅ Operaciones CRUD funcionan sin errores

---

## 📊 PLANTILLA DE REPORTE

```
=== REPORTE DE VERIFICACIÓN 24H ===
Fecha de verificación: YYYY-MM-DD HH:MM
Verificado por: [Nombre]

1. Estado PM2:
   - Status: [online/offline]
   - Reinicios: [número] (Δ desde estabilización: [diferencia])
   - Uptime: [tiempo]
   - Memoria: [MB]
   ✅/❌

2. Logs:
   - Errores ER_NO_SUCH_TABLE: [0/número]
   - Errores req.flash: [0/número]
   - Otros errores críticos: [descripción]
   ✅/❌

3. Tabla clientes:
   - Existe: [sí/no]
   - Funcional: [sí/no]
   - Registros: [número]
   ✅/❌

4. Middleware flash:
   - Configurado: [sí/no]
   - Errores: [0/número]
   ✅/❌

5. HTTP:
   - Respuesta: [código HTTP]
   - Latencia: [ms]
   ✅/❌

6. Recursos:
   - Disco: [%]
   - RAM: [%]
   - SWAP: [%]
   ✅/❌

7. Base de datos:
   - Conectada: [sí/no]
   - Tablas: [número]
   ✅/❌

=== RESULTADO GLOBAL ===
✅ ESTABILIZACIÓN EXITOSA
o
❌ REQUIERE ATENCIÓN

Observaciones:
[Detalles adicionales]
```

---

## 🎯 CRITERIOS DE ÉXITO PARA 24H

La estabilización se considerará **EXITOSA** si:

1. ✅ Reinicios totales < 380 (menos de 8 en 24h)
2. ✅ Sin errores de tabla `clientes` en logs
3. ✅ Sin errores de `req.flash` en logs
4. ✅ Sistema responde HTTP 401 consistentemente
5. ✅ Recursos del servidor dentro de límites
6. ✅ Base de datos accesible y funcional

**Meta mínima:** 5/6 criterios cumplidos  
**Meta ideal:** 6/6 criterios cumplidos

---

## 🚨 ACCIONES SI FALLA VERIFICACIÓN

### Si Reinicios > 380 (más de 8 en 24h)
1. Revisar logs: `pm2 logs sgi --lines 100`
2. Buscar nuevo error: `grep "Error\|TypeError" /root/.pm2/logs/sgi-error.log | tail -20`
3. Verificar recursos: `free -h && df -h`
4. Reportar problema con logs

### Si Aparecen Errores de Tabla
1. Verificar tabla existe: `SHOW TABLES LIKE 'clientes';`
2. Si no existe, recrear con script de ESTABILIZACION_COMPLETADA.md
3. Reiniciar: `pm2 restart sgi`

### Si Aparecen Errores de Flash
1. Verificar archivo existe: `ls -la /home/sgi.ultimamilla.com.ar/src/middleware/session.js`
2. Verificar integración: `grep "configureSession" /home/sgi.ultimamilla.com.ar/src/app.js`
3. Reinstalar si necesario: `npm install connect-flash`
4. Reiniciar: `pm2 restart sgi`

### Si Recursos Críticos (>90%)
1. Limpiar logs: `pm2 flush`
2. Limpiar journal: `journalctl --vacuum-time=3d`
3. Considerar upgrade de servidor (ver PLAN_ACCION_CORRECTIVA.md)

---

## 📅 CALENDARIO DE VERIFICACIONES

| Momento | Hora | Verificar | Estado |
|---------|------|-----------|--------|
| **Inmediato** | 2025-10-08 08:00 | Estado inicial | ✅ |
| **1 hora** | 2025-10-08 09:00 | Reinicios < 373 | ⏳ |
| **4 horas** | 2025-10-08 12:00 | Reinicios < 374 | ⏳ |
| **12 horas** | 2025-10-08 20:00 | Reinicios < 376 | ⏳ |
| **24 horas** | 2025-10-09 08:00 | Reinicios < 380 | ⏳ |
| **48 horas** | 2025-10-10 08:00 | Confirmación final | ⏳ |

---

## 📝 REGISTRO DE VERIFICACIONES

### Verificación 1h (08:00 - 09:00)
```
Fecha: _________
Reinicios PM2: _________
Estado: ✅ / ❌
Notas: _________________________________
```

### Verificación 4h (08:00 - 12:00)
```
Fecha: _________
Reinicios PM2: _________
Estado: ✅ / ❌
Notas: _________________________________
```

### Verificación 12h (08:00 - 20:00)
```
Fecha: _________
Reinicios PM2: _________
Estado: ✅ / ❌
Notas: _________________________________
```

### Verificación 24h (08:00 - 08:00 +1día)
```
Fecha: _________
Reinicios PM2: _________
Estado: ✅ / ❌
Notas: _________________________________
```

### Verificación 48h (Confirmación Final)
```
Fecha: _________
Reinicios PM2: _________
Estado: ✅ / ❌
Notas: _________________________________
```

---

## 🎉 CONCLUSIÓN POST-VERIFICACIÓN

**Si todos los checks pasan:**
- ✅ Marcar estabilización como EXITOSA
- ✅ Proceder con tareas de Prioridad 2 (PLAN_ACCION_CORRECTIVA.md)
- ✅ Documentar lecciones aprendidas
- ✅ Actualizar documentación de arquitectura

**Si algún check falla:**
- ⚠️ Identificar problema específico
- ⚠️ Aplicar acción correctiva correspondiente
- ⚠️ Reiniciar ciclo de verificación de 24h
- ⚠️ Reportar a equipo técnico

---

**Documento creado:** 2025-10-08 11:01 UTC  
**Para verificación en:** 2025-10-09 08:00 ART  
**Responsable verificación:** [Asignar]
