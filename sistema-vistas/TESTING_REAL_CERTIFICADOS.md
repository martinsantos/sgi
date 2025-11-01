# 🧪 TESTING REAL DE CERTIFICADOS - DIAGNÓSTICO

**Fecha:** 23 de Octubre 2025, 10:42 UTC-3  
**Status:** ❌ SISTEMA SIGUE CON ERRORES

---

## 🔴 PROBLEMAS DETECTADOS

### 1. Archivo Modelo NO se Actualizó Correctamente
```bash
# Verificación:
$ ssh root@23.105.176.45 "grep 'proyecto_id_rel' /home/sgi.ultimamilla.com.ar/src/models/CertificadoModel.js"
✅ ARCHIVO LOCAL tiene proyecto_id_rel

# Pero logs muestran:
sqlMessage: "Unknown column 'p.codigo' in 'SELECT'"
```

**Conclusión:** El archivo SÍ se copió pero PM2 puede estar usando caché o el código viejo

### 2. Respuestas HTTP Incorrectas

| URL | Status Esperado | Status Real |
|-----|-----------------|-------------|
| `/certificados` | 200 | 502 Bad Gateway |
| `/certificados/ver/:id` | 200 | 302 Redirect (requiere login) |

### 3. Página en Blanco
```bash
$ curl https://sgi.ultimamilla.com.ar/certificados -o /tmp/test.html
$ wc -l /tmp/test.html
0 /tmp/test.html  # ❌ Archivo vacío
```

---

## 🔍 ANÁLISIS DE LOGS

```
# Error logs muestran:
sqlMessage: "Unknown column 'p.codigo' in 'SELECT'"

# Esto significa que:
1. PM2 cargó el código VIEJO
2. O hay un cache de Node.js
3. O el archivo no se copió correctamente
```

---

## ✅ SOLUCIONES A PROBAR

### Opción 1: Hard Restart de PM2
```bash
ssh root@23.105.176.45 "pm2 delete sgi && pm2 start /home/sgi.ultimamilla.com.ar/ecosystem.config.js"
```

### Opción 2: Limpiar Cache de Node
```bash
ssh root@23.105.176.45 "rm -rf /home/sgi.ultimamilla.com.ar/node_modules/.cache && pm2 restart sgi"
```

### Opción 3: Verificar Archivos Realmente Copiados
```bash
ssh root@23.105.176.45 "md5sum /home/sgi.ultimamilla.com.ar/src/models/CertificadoModel.js"
md5sum src/models/CertificadoModel.js
# Comparar checksums
```

---

## 📊 ESTADO ACTUAL

```
✅ Archivo editar.handlebars: Existe (4.6KB)
✅ Archivo CertificadoModel.js: Copiado
✅ Helpers: Agregados
✅ PM2: Online (PID: 784170)

❌ Aplicación: Usando código viejo
❌ Queries SQL: Fallando con columnas inexistentes
❌ Páginas: Devolviendo 502/302
```

---

## 🎯 PRÓXIMOS PASOS

1. Verificar que el archivo realmente se copió con md5sum
2. Hacer hard restart de PM2 (delete + start)
3. Verificar que no hay copias duplicadas del código
4. Testear con curl real después del restart
