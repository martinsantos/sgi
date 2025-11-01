# 📋 PLAN: 5 FIXS CERTIFICADOS Y ORDENAMIENTO

**Fecha:** 29 de Octubre 2025, 15:30 UTC-3  
**Servidor:** 23.105.176.45 (sgi.ultimamilla.com.ar)  
**Status:** 🔄 EN PROGRESO

---

## 🎯 5 FIXS A IMPLEMENTAR

### FIX 1: ESTADOS DE CERTIFICADOS AMPLIADOS ✅ (VERIFICADO)

**Problema:** Imagen muestra certificados con estados ANULADO y PENDIENTE, pero existen más estados

**Estados Reales en BD:**
- 0 = Pendiente (88 certificados)
- 1 = Aprobado (19 certificados)
- 2 = Facturado (543 certificados) ← MÁS COMÚN
- 3 = En Proceso (26 certificados)
- 4 = Anulado (1,888 certificados)

**Total:** 2,564 certificados

**Solución:** ✅ YA IMPLEMENTADA
- Mapeo completo en CertificadoModel.js (líneas 12-29)
- Mapeo completo en ProyectoModel.js (líneas 208-215)
- Colores asignados a cada estado

**Status:** ✅ VERIFICADO - Los estados están correctamente mapeados

---

### FIX 2: ORDENAMIENTO CORRECTO DE TODA LA LISTA

**Problema:** Ordenamiento solo funciona en los proyectos paginados, no en toda la lista

**Causa:** El JavaScript `ordenarTabla()` ordena solo las filas visibles en el DOM

**Solución Requerida:**
1. Modificar el ordenamiento para que sea SERVER-SIDE (en la BD)
2. Pasar parámetro `sortBy` y `sortOrder` a la query
3. Actualizar la URL con los parámetros de ordenamiento
4. Mantener paginación coherente

**Archivos a Modificar:**
- `ProyectoModel.js` - Agregar parámetros de ordenamiento a `getProyectos()`
- `proyectoController.js` - Pasar parámetros desde la request
- `listar-tabla.handlebars` - Actualizar links de encabezados para incluir parámetros

**Status:** ⏳ PENDIENTE

---

### FIX 3: CERTIFICADOS NO SE MUESTRAN CORRECTAMENTE EN LISTADO

**Problema:** En la imagen, los certificados se muestran como "Anulado" pero deberían mostrar su estado real

**Causa Probable:** 
- El campo `estado_nombre` no se está pasando correctamente
- O el estado se está mostrando como "Anulado" por defecto

**Solución Requerida:**
1. Verificar que `getCertificadosProyecto()` retorna `estado_nombre`
2. Verificar que el template recibe los datos correctamente
3. Asegurar que cada certificado muestra su estado real (Facturado, Pendiente, etc.)

**Archivos a Revisar:**
- `ProyectoModel.js` - Método `getCertificadosProyecto()` (líneas 194-234)
- `listar-tabla.handlebars` - Líneas 185-210 (mostrar certificados)
- `ver.handlebars` - Líneas 142-182 (mostrar certificados activos)

**Status:** ⏳ PENDIENTE

---

### FIX 4: VINCULACIÓN DE CERTIFICADOS CON PROYECTOS

**Problema:** Verificar que:
1. Todos los certificados están vinculados con un proyecto
2. Todos los proyectos tienen sus certificados asociados
3. Los estados son correctos (no solo Anulado/Pendiente)

**Verificaciones Necesarias:**
```sql
-- Certificados sin proyecto
SELECT COUNT(*) FROM certificacions WHERE proyecto_id IS NULL;

-- Proyectos sin certificados
SELECT COUNT(*) FROM proyectos WHERE id NOT IN (SELECT DISTINCT proyecto_id FROM certificacions);

-- Distribución de estados
SELECT estado, COUNT(*) FROM certificacions GROUP BY estado;
```

**Status:** ⏳ PENDIENTE

---

### FIX 5: TESTING EXHAUSTIVO

**Tests a Realizar:**
1. ✅ Verificar que existen 5 estados de certificados
2. ✅ Verificar que BD tiene 2,564 certificados
3. ⏳ Verificar que ordenamiento funciona en toda la lista
4. ⏳ Verificar que certificados se muestran con estado correcto
5. ⏳ Verificar que todos los certificados están vinculados
6. ⏳ Verificar que todos los proyectos tienen sus certificados
7. ⏳ Verificar que los estados se muestran correctamente en la UI

**Status:** ⏳ PENDIENTE

---

## 📊 ESTADÍSTICAS ACTUALES

| Métrica | Valor |
|---------|-------|
| Total Certificados | 2,564 |
| Pendiente (0) | 88 |
| Aprobado (1) | 19 |
| Facturado (2) | 543 |
| En Proceso (3) | 26 |
| Anulado (4) | 1,888 |
| Total Proyectos | 523 |

---

## 🔄 ORDEN DE IMPLEMENTACIÓN

1. ✅ FIX 1: Estados verificados
2. ⏳ FIX 2: Ordenamiento server-side
3. ⏳ FIX 3: Mostrar estados correctos
4. ⏳ FIX 4: Vinculación verificada
5. ⏳ FIX 5: Testing exhaustivo

---

## 📝 NOTAS

- Los estados ya están mapeados correctamente en el código
- La BD tiene la estructura correcta
- Falta implementar ordenamiento server-side
- Falta verificar que los datos se muestren correctamente en la UI
