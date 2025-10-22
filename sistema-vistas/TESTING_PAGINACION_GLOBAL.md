# PLAN DE TESTING - PAGINACIÓN GLOBAL
**Fecha:** 2025-10-10 10:30 ART  
**Alcance:** Testing exhaustivo de paginación en todos los módulos  
**Estado:** ✅ IMPLEMENTACIÓN COMPLETA | 🧪 TESTING EN PROGRESO

---

## 📋 MÓDULOS CORREGIDOS

| # | Módulo | Controlador | Estado | Backup |
|---|--------|-------------|--------|--------|
| 1 | **Clientes** | `clientesController.js` | ✅ Corregido | `.backup_pagination_*` |
| 2 | **Proyectos** | `proyectoController.js` | ✅ Corregido | `.backup_pagination_*` |
| 3 | **Presupuestos** | `presupuestosController.js` | ✅ Corregido | `.backup_pagination_*` |
| 4 | **Leads** | `leadController.js` | ✅ Corregido | `.backup_pagination_*` |
| 5 | **Certificados** | `certificadoController.js` | ✅ Corregido | `.backup_pagination_*` |
| 6 | **Prospectos** | `prospectoController.js` | ✅ Corregido | `.backup_pagination_*` |

---

## ✅ CAMBIOS IMPLEMENTADOS

### 1. Helpers de Handlebars ✅
**Archivo:** `/home/sgi.ultimamilla.com.ar/src/helpers/handlebars.js`

**Helpers agregados:**
- `range(start, end)` - Array de números
- `gt(a, b)` - Mayor que
- `lt(a, b)` - Menor que
- `eq(a, b)` - Igual
- `subtract(a, b)` - Resta
- `add(a, b)` - Suma
- Y más operadores

### 2. Función Reutilizable de Paginación ✅
**Archivo:** `/home/sgi.ultimamilla.com.ar/src/utils/pagination.js`

```javascript
function buildPagination(currentPage, limit, total, maxButtons = 5) {
  // Construye objeto completo de paginación
  return {
    total: totalPages,
    current: currentPage,
    limit,
    totalCount: total,
    hasPrev, hasNext,
    prevPage, nextPage,
    startPage, endPage
  };
}
```

### 3. Controladores Actualizados ✅

**Patrón aplicado a TODOS los controladores:**

```javascript
// Construir paginación correcta
const totalRecords = resultado.pagination.total || 0;
const totalPages = Math.max(1, Math.ceil(totalRecords / limit));
const currentPage = Math.min(page, totalPages);

const maxButtons = 5;
const halfMaxButtons = Math.floor(maxButtons / 2);
let startPage = Math.max(1, currentPage - halfMaxButtons);
let endPage = Math.min(totalPages, currentPage + halfMaxButtons);

if (endPage - startPage < maxButtons - 1) {
  if (startPage === 1) {
    endPage = Math.min(totalPages, startPage + maxButtons - 1);
  } else {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }
}

const pagination = {
  total: totalPages,
  current: currentPage,
  limit,
  totalCount: totalRecords,
  hasPrev: currentPage > 1,
  hasNext: currentPage < totalPages,
  prevPage: Math.max(1, currentPage - 1),
  nextPage: Math.min(totalPages, currentPage + 1),
  startPage,
  endPage
};
```

**Variables adicionales pasadas a vistas:**
- `totalCount` - Total de registros
- `sort_by` - Campo de ordenamiento
- `sort_order` - Dirección del ordenamiento
- `search` - Término de búsqueda

---

## 🧪 PLAN DE TESTING EXHAUSTIVO

### Test 1: CLIENTES ✅
**URL:** https://sgi.ultimamilla.com.ar/clientes

#### Pruebas de Paginación
- [ ] **P1.1** - Acceder a página 1 → Verifica "Mostrando página 1 de X"
- [ ] **P1.2** - Clic en página 2 → Cambia a página 2
- [ ] **P1.3** - Clic en botón ">" → Avanza una página
- [ ] **P1.4** - Clic en botón "<" → Retrocede una página
- [ ] **P1.5** - Clic en botón ">>" → Va a última página
- [ ] **P1.6** - Clic en botón "<<" → Va a primera página
- [ ] **P1.7** - URL incluye `?page=X` correctamente

#### Pruebas de Ordenamiento
- [ ] **O1.1** - Clic en "NOMBRE" → Ordena ascendente
- [ ] **O1.2** - Clic en "NOMBRE" nuevamente → Ordena descendente
- [ ] **O1.3** - Ordenar y paginar → Mantiene ordenamiento
- [ ] **O1.4** - URL incluye `?sort_by=nombre&sort_order=ASC`

#### Pruebas de Búsqueda
- [ ] **B1.1** - Buscar un cliente existente → Muestra resultados
- [ ] **B1.2** - Búsqueda con resultados paginados → Paginación funciona
- [ ] **B1.3** - URL incluye `?search=termino`
- [ ] **B1.4** - Búsqueda + Ordenamiento + Paginación → Todo funciona

#### Pruebas de Integración
- [ ] **I1.1** - Cambiar de página mantiene búsqueda
- [ ] **I1.2** - Cambiar de página mantiene ordenamiento
- [ ] **I1.3** - Ordenar mantiene búsqueda
- [ ] **I1.4** - Todos los botones de paginación visible y funcionales

---

### Test 2: PROYECTOS
**URL:** https://sgi.ultimamilla.com.ar/proyectos

#### Pruebas de Paginación
- [ ] **P2.1** - Acceder a página 1 → Verifica "Mostrando página 1 de X"
- [ ] **P2.2** - Clic en página 2 → Cambia a página 2
- [ ] **P2.3** - Navegación con botones < > << >> funciona
- [ ] **P2.4** - URL correcta con parámetros

#### Pruebas de Ordenamiento
- [ ] **O2.1** - Ordenar por columnas funciona
- [ ] **O2.2** - Mantiene ordenamiento al paginar
- [ ] **O2.3** - URL incluye parámetros de orden

#### Pruebas de Búsqueda
- [ ] **B2.1** - Búsqueda funciona
- [ ] **B2.2** - Paginación con búsqueda funciona
- [ ] **B2.3** - URL correcta

#### Pruebas de Integración
- [ ] **I2.1** - Búsqueda + Ordenamiento + Paginación → Todo funciona
- [ ] **I2.2** - Cambios de página mantienen filtros

---

### Test 3: PRESUPUESTOS
**URL:** https://sgi.ultimamilla.com.ar/presupuestos

#### Pruebas de Paginación
- [ ] **P3.1** - Acceder a página 1 → Verifica información correcta
- [ ] **P3.2** - Navegación entre páginas funciona
- [ ] **P3.3** - Botones de navegación funcionan
- [ ] **P3.4** - URL correcta

#### Pruebas de Ordenamiento
- [ ] **O3.1** - Ordenar funciona
- [ ] **O3.2** - Mantiene orden al paginar

#### Pruebas de Búsqueda
- [ ] **B3.1** - Búsqueda funciona
- [ ] **B3.2** - Paginación con búsqueda funciona

#### Pruebas de Filtros
- [ ] **F3.1** - Filtros de estado funcionan
- [ ] **F3.2** - Filtros mantienen paginación
- [ ] **F3.3** - URL incluye todos los filtros

#### Pruebas de Integración
- [ ] **I3.1** - Filtros + Búsqueda + Orden + Paginación → Todo funciona

---

### Test 4: LEADS
**URL:** https://sgi.ultimamilla.com.ar/leads

#### Pruebas de Paginación
- [ ] **P4.1** - Paginación básica funciona
- [ ] **P4.2** - Navegación funciona
- [ ] **P4.3** - URL correcta

#### Pruebas de Ordenamiento
- [ ] **O4.1** - Ordenar funciona
- [ ] **O4.2** - Mantiene orden

#### Pruebas de Búsqueda
- [ ] **B4.1** - Búsqueda funciona
- [ ] **B4.2** - Paginación con búsqueda funciona

#### Pruebas de Integración
- [ ] **I4.1** - Todo funciona en conjunto

---

### Test 5: CERTIFICADOS
**URL:** https://sgi.ultimamilla.com.ar/certificados

#### Pruebas de Paginación
- [ ] **P5.1** - Paginación básica funciona
- [ ] **P5.2** - Navegación funciona
- [ ] **P5.3** - URL correcta

#### Pruebas de Ordenamiento
- [ ] **O5.1** - Ordenar funciona
- [ ] **O5.2** - Mantiene orden

#### Pruebas de Búsqueda
- [ ] **B5.1** - Búsqueda funciona
- [ ] **B5.2** - Paginación con búsqueda funciona

#### Pruebas de Integración
- [ ] **I5.1** - Todo funciona en conjunto

---

### Test 6: PROSPECTOS
**URL:** https://sgi.ultimamilla.com.ar/prospectos

#### Pruebas de Paginación
- [ ] **P6.1** - Paginación básica funciona
- [ ] **P6.2** - Navegación funciona
- [ ] **P6.3** - URL correcta

#### Pruebas de Ordenamiento
- [ ] **O6.1** - Ordenar funciona
- [ ] **O6.2** - Mantiene orden

#### Pruebas de Búsqueda / Filtros
- [ ] **B6.1** - Búsqueda funciona
- [ ] **B6.2** - Filtros funcionan
- [ ] **B6.3** - Paginación con filtros funciona

#### Pruebas de Integración
- [ ] **I6.1** - Filtros + Búsqueda + Orden + Paginación → Todo funciona

---

## 🎯 CRITERIOS DE ÉXITO

### Para CADA módulo debe cumplir:

1. **Paginación Visual**
   - ✅ Muestra "Mostrando página X de Y (Z registros en total)"
   - ✅ Botones `<<` `<` `1` `2` `3` `>` `>>` visibles
   - ✅ Página actual destacada
   - ✅ Botones inactivos disabled cuando corresponde

2. **Funcionalidad de Paginación**
   - ✅ Clic en número de página cambia de página
   - ✅ Botones prev/next funcionan
   - ✅ Botones first/last funcionan
   - ✅ URL se actualiza correctamente

3. **Ordenamiento**
   - ✅ Clic en encabezado de columna ordena
   - ✅ Ícono de ordenamiento visible
   - ✅ Se mantiene al paginar
   - ✅ URL incluye sort_by y sort_order

4. **Búsqueda**
   - ✅ Campo de búsqueda funcional
   - ✅ Resultados se paginan correctamente
   - ✅ Se mantiene al cambiar de página
   - ✅ URL incluye parámetro search

5. **Integración**
   - ✅ Búsqueda + Ordenamiento + Paginación funcionan juntos
   - ✅ Filtros (si existen) funcionan con paginación
   - ✅ No hay errores en consola del navegador
   - ✅ No hay errores en logs del servidor

---

## 🔍 COMANDOS DE VERIFICACIÓN

### Verificar Logs del Servidor
```bash
ssh root@23.105.176.45 "pm2 logs sgi --lines 50 | grep -E 'error|Error|ERROR|✅'"
```

### Verificar Estado PM2
```bash
ssh root@23.105.176.45 "pm2 list | grep sgi"
```

### Verificar Sintaxis (si se modifica algo)
```bash
ssh root@23.105.176.45 "node -c /home/sgi.ultimamilla.com.ar/src/controllers/nombreController.js"
```

---

## 📊 RESULTADO ESPERADO

**Por cada módulo:**
```
✅ Paginación: FUNCIONAL
✅ Ordenamiento: FUNCIONAL
✅ Búsqueda: FUNCIONAL
✅ Integración: FUNCIONAL
✅ Sin errores: VERIFICADO
```

**Estado General del Sistema:**
```
┌─────────────────┬────────────┬──────────────┬────────────┬─────────────┐
│ Módulo          │ Paginación │ Ordenamiento │ Búsqueda   │ Integración │
├─────────────────┼────────────┼──────────────┼────────────┼─────────────┤
│ Clientes        │ ✅ OK      │ ✅ OK        │ ✅ OK      │ ✅ OK       │
│ Proyectos       │ ⏳ Testing │ ⏳ Testing   │ ⏳ Testing │ ⏳ Testing  │
│ Presupuestos    │ ⏳ Testing │ ⏳ Testing   │ ⏳ Testing │ ⏳ Testing  │
│ Leads           │ ⏳ Testing │ ⏳ Testing   │ ⏳ Testing │ ⏳ Testing  │
│ Certificados    │ ⏳ Testing │ ⏳ Testing   │ ⏳ Testing │ ⏳ Testing  │
│ Prospectos      │ ⏳ Testing │ ⏳ Testing   │ ⏳ Testing │ ⏳ Testing  │
└─────────────────┴────────────┴──────────────┴────────────┴─────────────┘
```

---

## 🚨 PLAN DE ROLLBACK

**Si algo falla en algún módulo:**

```bash
# Restaurar un controlador específico
ssh root@23.105.176.45 "
  CONTROLLER=proyectoController  # Cambiar por el que falló
  BACKUP=\$(ls -t /home/sgi.ultimamilla.com.ar/src/controllers/\${CONTROLLER}.js.backup_pagination_* | head -1)
  cp \"\$BACKUP\" /home/sgi.ultimamilla.com.ar/src/controllers/\${CONTROLLER}.js
  pm2 restart sgi
"
```

**Restaurar todos los controladores:**
```bash
ssh root@23.105.176.45 "
  for controller in proyectoController presupuestosController leadController certificadoController prospectoController; do
    BACKUP=\$(ls -t /home/sgi.ultimamilla.com.ar/src/controllers/\${controller}.js.backup_pagination_* | head -1)
    cp \"\$BACKUP\" /home/sgi.ultimamilla.com.ar/src/controllers/\${controller}.js
  done
  pm2 restart sgi
"
```

---

## 📝 NOTAS DE TESTING

### Módulo: Clientes
**Fecha:** 2025-10-08  
**Estado:** ✅ FUNCIONAL  
**Notas:** Paginación funciona perfectamente después de la corrección inicial

### Módulo: Proyectos
**Fecha:** _Por testear_  
**Estado:** ⏳ PENDIENTE  
**Notas:**

### Módulo: Presupuestos
**Fecha:** _Por testear_  
**Estado:** ⏳ PENDIENTE  
**Notas:**

### Módulo: Leads
**Fecha:** _Por testear_  
**Estado:** ⏳ PENDIENTE  
**Notas:**

### Módulo: Certificados
**Fecha:** _Por testear_  
**Estado:** ⏳ PENDIENTE  
**Notas:**

### Módulo: Prospectos
**Fecha:** _Por testear_  
**Estado:** ⏳ PENDIENTE  
**Notas:**

---

## ✅ CHECKLIST FINAL

- [x] Helpers de Handlebars agregados
- [x] Función buildPagination creada
- [x] Clientes corregido
- [x] Proyectos corregido
- [x] Presupuestos corregido
- [x] Leads corregido
- [x] Certificados corregido
- [x] Prospectos corregido
- [x] Sintaxis verificada en todos
- [x] Backups creados
- [x] Archivos subidos al servidor
- [x] Servicio PM2 reiniciado
- [x] Sin errores en logs
- [ ] Testing manual completado
- [ ] Documentación actualizada
- [ ] Usuario verificó funcionamiento

---

**Implementado por:** Cascade AI  
**Fecha de implementación:** 2025-10-10 10:30 ART  
**Próximo paso:** Testing manual exhaustivo por usuario
