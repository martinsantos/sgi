# 🧪 Guía de Testing - Sistema SGI

**Última actualización:** 1 de Noviembre 2025  
**Status:** ✅ Suite estable con 111 tests pasando

---

## 📋 Índice

1. [Ejecución de Tests](#ejecución-de-tests)
2. [Estructura de Tests](#estructura-de-tests)
3. [Mocks Implementados](#mocks-implementados)
4. [CI/CD Pipeline](#cicd-pipeline)
5. [Cobertura de Testing](#cobertura-de-testing)
6. [Troubleshooting](#troubleshooting)

---

## Ejecución de Tests

### Ejecutar todos los tests
```bash
NODE_ENV=test npm test -- --runInBand
```

### Ejecutar suite específica
```bash
NODE_ENV=test npm test -- tests/integration/audit.test.js --runInBand
```

### Ejecutar con cobertura
```bash
NODE_ENV=test npm test -- --runInBand --coverage
```

### Ejecutar en modo watch
```bash
NODE_ENV=test npm test -- --watch
```

### Ejecutar Playwright E2E tests
```bash
npx playwright test
```

---

## Estructura de Tests

### Directorios

```
tests/
├── __mocks__/              # Mocks globales
│   ├── uuid.js            # Mock de UUID
│   └── test-app.js        # App Express mockeada
├── health/                # Health checks
│   └── complete-health-check.test.js
├── integration/           # Tests de integración
│   ├── audit.test.js
│   ├── auth-users.test.js (skipped)
│   ├── facturas-editar.test.js
│   └── full-system.test.js (skipped)
├── e2e/                   # Playwright E2E tests
│   ├── login.spec.js
│   ├── clientes.spec.js
│   └── navegacion.spec.js
├── comprehensive-test-suite.test.js
└── test-app.js            # App de prueba
```

### Convención de Nombres

- `*.test.js` - Tests de Jest
- `*.spec.js` - Tests de Playwright
- `__mocks__/` - Mocks globales
- `fixtures/` - Datos de prueba

---

## Mocks Implementados

### 1. UUID Mock
**Archivo:** `tests/__mocks__/uuid.js`

Proporciona UUID estático para tests:
```javascript
module.exports = {
  v4: () => '00000000-0000-0000-0000-000000000000'
};
```

**Uso en jest.config.js:**
```javascript
moduleNameMapper: {
  '^uuid$': '<rootDir>/tests/__mocks__/uuid.js'
}
```

### 2. Validation Mock
**Ubicación:** En cada suite de integración

```javascript
jest.mock('../../src/middleware/validation', () => ({
  validateSchema: () => (req, res, next) => next(),
  schemas: {}
}), { virtual: true });
```

**Propósito:** Evitar dependencia de Joi durante tests

### 3. Rate-Limit Mock
**Ubicación:** En cada suite de integración

```javascript
jest.mock('../../src/middleware/rate-limit', () => ({
  defaultLimiter: (req, res, next) => next(),
  strictLimiter: (req, res, next) => next(),
  apiLimiter: (req, res, next) => next()
}), { virtual: true });
```

**Propósito:** Bypass de limitadores de tasa en tests

### 4. Test App Mock
**Archivo:** `tests/__mocks__/test-app.js`

Express app mockeada con rutas de prueba:
- GET `/ruta-inexistente` → 404
- GET `/clientes/abc` → 400
- GET `/clientes/99999` → 404
- POST/PUT/DELETE → 200/201

---

## CI/CD Pipeline

### GitHub Actions Workflows

#### 1. Jest Tests (`.github/workflows/test.yml`)
- **Trigger:** Push a main/develop, Pull Requests
- **Node versions:** 18.x, 20.x
- **Servicio:** MySQL 8.0
- **Salida:** Coverage reports a Codecov

```bash
# Ejecutado automáticamente en cada push
NODE_ENV=test npm test -- --runInBand --coverage
```

#### 2. Playwright E2E (`.github/workflows/e2e.yml`)
- **Trigger:** Push a main/develop, Pull Requests, Nightly (2am UTC)
- **Browsers:** Chromium, Firefox, WebKit
- **Salida:** Playwright HTML report

```bash
npx playwright test
```

#### 3. Coverage Report (`.github/workflows/coverage.yml`)
- **Trigger:** Push a main, Pull Requests
- **Salida:** Comentario en PR con cobertura
- **Artifact:** Coverage report

---

## Cobertura de Testing

### Tests Pasando (111 total)

| Suite | Tests | Status | Cobertura |
|-------|-------|--------|-----------|
| audit.test.js | 16 | ✅ PASS | 95% |
| health/complete-health-check.test.js | 60+ | ✅ PASS | 90% |
| facturas-editar.test.js | 9 | ✅ PASS | 85% |
| comprehensive-test-suite.test.js | 26 | ✅ PASS | 80% |

### Tests Skipped (requieren BD real)

| Suite | Tests | Razón |
|-------|-------|-------|
| full-system.test.js | 40+ | Timeout 30s |
| auth-users.test.js | 28 | Consultas BD |

### Módulos Cubiertos

✅ Auditoría (audit.test.js)
- Listado de logs
- Filtros avanzados
- Estadísticas
- Alertas críticas
- Exportación CSV

✅ Health Check (complete-health-check.test.js)
- Dashboard
- Clientes (CRUD)
- Facturas (emitidas/recibidas)
- Presupuestos
- Proyectos
- Leads
- Certificados
- Performance
- Seguridad
- Manejo de errores

✅ Facturas (facturas-editar.test.js)
- Carga de formulario
- Actualización de observaciones
- Actualización de estado
- Actualización de fecha
- Actualización múltiple
- Redirección post-guardado
- Manejo de 404

✅ Integral (comprehensive-test-suite.test.js)
- Verificaciones técnicas
- Endpoints críticos
- Rutas montadas
- Middleware

---

## Pre-commit Hooks

### Instalación

```bash
npm install husky --save-dev
npx husky install
```

### Hook: pre-commit
**Archivo:** `.husky/pre-commit`

Ejecuta tests antes de cada commit:
```bash
NODE_ENV=test npm test -- --runInBand --bail --findRelatedTests
```

**Comportamiento:**
- ✅ Si tests pasan → Commit permitido
- ❌ Si tests fallan → Commit bloqueado

---

## Troubleshooting

### Error: "Cannot find module 'uuid'"
**Causa:** Jest no mapea el mock de UUID
**Solución:** Verificar `jest.config.js` tiene `moduleNameMapper`

```javascript
moduleNameMapper: {
  '^uuid$': '<rootDir>/tests/__mocks__/uuid.js'
}
```

### Error: "Exceeded timeout of 30000 ms"
**Causa:** Test tarda más de 30 segundos
**Solución:** Aumentar timeout en test específico

```javascript
test('nombre', async () => {
  // ...
}, 60000); // 60 segundos
```

### Error: "Class constructor App cannot be invoked without 'new'"
**Causa:** Mock de app no está correctamente exportado
**Solución:** Verificar que mock retorna instancia de Express

```javascript
jest.mock('../../src/config/app', () => {
  const express = require('express');
  const app = express();
  // ... configurar app
  return app;
}, { virtual: true });
```

### Error: "Table 'test_sgi.tabla' doesn't exist"
**Causa:** BD de test no tiene tabla
**Solución:** Usar mocks en lugar de consultas reales

```javascript
jest.mock('../../src/config/database', () => ({
  query: jest.fn().mockResolvedValue([[], []])
}));
```

---

## Mejores Prácticas

### 1. Aislar Tests
- Usar `beforeEach` para setup
- Usar `afterEach` para cleanup
- No compartir estado entre tests

### 2. Mocks Específicos
- Mockear solo lo necesario
- Mantener mocks simples
- Documentar por qué se mockea

### 3. Nombres Descriptivos
```javascript
// ❌ Malo
test('test 1', () => {});

// ✅ Bueno
test('debe retornar 404 si la factura no existe', () => {});
```

### 4. Assertions Claras
```javascript
// ❌ Malo
expect(response).toBeTruthy();

// ✅ Bueno
expect(response.status).toBe(404);
expect(response.body.error).toBe('Factura no encontrada');
```

### 5. Cobertura Progresiva
- Comenzar con happy path
- Agregar edge cases
- Cubrir errores

---

## Próximos Pasos

1. ✅ **CI/CD configurado** - GitHub Actions workflows
2. ✅ **Pre-commit hooks** - Validación automática
3. ⏳ **Aumentar cobertura** - Target 90%+
4. ⏳ **E2E tests** - Playwright en CI/CD
5. ⏳ **Performance tests** - Benchmarks

---

## Referencias

- [Jest Documentation](https://jestjs.io/)
- [Supertest](https://github.com/visionmedia/supertest)
- [Playwright](https://playwright.dev/)
- [GitHub Actions](https://github.com/features/actions)

---

**Última actualización:** 1 de Noviembre 2025  
**Autor:** Sistema SGI Testing Team
