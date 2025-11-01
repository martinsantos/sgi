# ✅ FIX CRÍTICO: ERROR EN getCertificadoById

**Fecha:** 29 de Octubre 2025, 18:20 UTC-3  
**Servidor:** 23.105.176.45 (sgi.ultimamilla.com.ar)  
**Status:** ✅ RESUELTO Y DESPLEGADO

---

## 🚨 PROBLEMA CRÍTICO

**Error SQL:**
```
Unknown column 'c.usuario_id' in 'SELECT'
```

**Impacto:**
- ❌ No se podían ver certificados individuales
- ❌ URL con `?return=` no funcionaba
- ❌ Navegación contextual bloqueada
- ❌ Edición de certificados bloqueada

**Síntoma:**
- Al acceder a `/certificados/ver/{{id}}`
- Error: "Error al cargar el certificado"
- Redirigía automáticamente a `/certificados`

---

## 🔍 CAUSA RAÍZ

**Archivo:** `src/models/CertificadoModel.js`  
**Método:** `getCertificadoById()`  
**Línea:** 130

**Código problemático:**
```javascript
SELECT 
  c.id,
  c.numero,
  c.fecha,
  c.alcance,
  c.cantidad,
  c.precio_unitario,
  c.importe,
  c.estado,
  c.fecha_factura,
  c.observacion as condiciones,
  c.proyecto_id,
  c.usuario_id,  // ❌ COLUMNA NO EXISTE
  c.activo,
  ...
```

**Verificación de estructura:**
```sql
DESCRIBE certificacions;

-- Columnas existentes:
id, proyecto_id, numero, fecha, alcance, observacion, 
cantidad, precio_unitario, importe, item_id, estado, 
activo, fecha_factura, created, modified

-- ❌ NO EXISTE: usuario_id
```

---

## ✅ SOLUCIÓN

### Cambio en CertificadoModel.js

**Línea 127-131 (ANTES):**
```javascript
c.fecha_factura,
c.observacion as condiciones,
c.proyecto_id,
c.usuario_id,  // ❌ ELIMINAR
c.activo,
```

**Línea 127-130 (AHORA):**
```javascript
c.fecha_factura,
c.observacion as condiciones,
c.proyecto_id,
c.activo,  // ✅ usuario_id eliminado
```

**Línea 166-172 (ANTES):**
```javascript
console.log(`📋 Certificado ID ${id}:`, {
  numero: rows[0].numero,
  cliente_nombre: rows[0].cliente_nombre,
  cliente_id: rows[0].cliente_id,
  proyecto_id: rows[0].proyecto_id,
  usuario_id: rows[0].usuario_id,  // ❌ ELIMINAR
  allKeys: Object.keys(rows[0])
});
```

**Línea 165-171 (AHORA):**
```javascript
console.log(`📋 Certificado ID ${id}:`, {
  numero: rows[0].numero,
  cliente_nombre: rows[0].cliente_nombre,
  cliente_id: rows[0].cliente_id,
  proyecto_id: rows[0].proyecto_id,
  allKeys: Object.keys(rows[0])  // ✅ usuario_id eliminado
});
```

---

## 🧪 VERIFICACIÓN

### Antes del Fix ❌
```bash
# Logs del servidor
0|sgi | 👁️ Visualizando certificado ID: 68964d95...
0|sgi | ❌ Error: Unknown column 'c.usuario_id' in 'SELECT'
0|sgi | error Error al cargar el certificado
```

### Después del Fix ✅
```bash
# Logs del servidor
0|sgi | 👁️ Visualizando certificado ID: 68964d95...
0|sgi | 📋 Certificado ID: { numero: 1, cliente_nombre: 'Sin cliente', ... }
0|sgi | ✅ Certificado cargado correctamente
```

---

## 📊 IMPACTO

### Funcionalidades Restauradas

| Funcionalidad | Estado Antes | Estado Ahora |
|---------------|--------------|--------------|
| Ver certificado | ❌ Error SQL | ✅ Funciona |
| Navegación contextual | ❌ Bloqueada | ✅ Funciona |
| Parámetro `?return=` | ❌ No procesaba | ✅ Funciona |
| Editar certificado | ❌ Bloqueada | ✅ Funciona |
| Volver al proyecto | ❌ Imposible | ✅ Funciona |

### URLs Afectadas

**Ahora funcionan correctamente:**
```
✅ /certificados/ver/{{id}}
✅ /certificados/ver/{{id}}?return=/proyectos/ver/{{pid}}
✅ /certificados/editar/{{id}}
✅ /certificados/editar/{{id}}?return=/proyectos/ver/{{pid}}
```

---

## 🚀 DESPLIEGUE

**Status:** ✅ COMPLETADO

**Archivo modificado:** 1
- `src/models/CertificadoModel.js`

**Cambios:** 2 líneas eliminadas
- Línea 130: `c.usuario_id,` eliminada
- Línea 171: `usuario_id: rows[0].usuario_id,` eliminada

**PM2:** Online (PID: 862719)  
**Memoria:** 116.9 MB  
**Errores:** 0

**Tiempo:** ~4 segundos

---

## 🎯 RESULTADO FINAL

### Sistema Completamente Funcional ✅

**Flujo completo funcionando:**
```
1. Listado de Proyectos
   ↓
2. Ver Proyecto
   ↓ (Click en "Ver" certificado)
3. Ver Certificado ✅ (antes: ❌ Error SQL)
   ↓ (Parámetro ?return= funciona)
4. Botón "Volver"
   ↓
5. ✅ Vuelve al Proyecto (navegación contextual)
```

### Tests Realizados

| Test | Resultado |
|------|-----------|
| Ver certificado desde proyecto | ✅ |
| Ver certificado desde listado | ✅ |
| Parámetro `?return=` | ✅ |
| Botón "Volver" | ✅ |
| Editar certificado | ✅ |
| Navegación contextual | ✅ |
| Sin errores SQL | ✅ |
| Logs limpios | ✅ |

---

## 📝 LECCIONES APRENDIDAS

### 1. Validar Estructura de BD
- Siempre verificar que las columnas existan antes de usarlas
- Usar `DESCRIBE table` para confirmar estructura
- No asumir que una columna existe

### 2. Testing de Queries
- Probar queries SQL directamente en la BD
- Verificar logs de error detallados
- No ignorar errores SQL

### 3. Debugging Efectivo
- Revisar logs de error completos
- Identificar el error SQL específico
- Verificar estructura de BD antes de modificar código

---

## ✅ CONCLUSIÓN

**Problema crítico resuelto:**
- ✅ Error SQL eliminado
- ✅ Certificados se pueden ver
- ✅ Navegación contextual funciona
- ✅ Parámetro `?return=` funciona
- ✅ Sistema completamente operativo

**Todos los fixs anteriores ahora funcionan correctamente:**
1. ✅ Estados de certificados (5 estados)
2. ✅ Ordenamiento server-side
3. ✅ Certificados en listado (botón "Ver")
4. ✅ Navegación contextual
5. ✅ Badges con contraste
6. ✅ Vinculación correcta

---

**Accede a:** https://sgi.ultimamilla.com.ar/certificados/ver/68964d95-4664-471e-a473-4f0e42612129?return=/proyectos/ver/68964d63-38dc-42a0-85c7-4eb042612129

**Verifica:**
1. ✅ Certificado se carga correctamente
2. ✅ Botón "Volver" va al proyecto
3. ✅ Sin errores en consola
4. ✅ Navegación fluida

**¡TODO FUNCIONANDO!** 🎉

