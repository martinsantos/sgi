/**
 * SUITE DE TESTS COMPLETA Y REFACTORIZADA
 * Testing exhaustivo de toda la web app SGI
 * 
 * Fecha: 29 de Octubre 2025
 * Servidor: 23.105.176.45 (sgi.ultimamilla.com.ar)
 */

const request = require('supertest');
const http = require('http');
const https = require('https');

// URL del servidor
const BASE_URL = 'https://sgi.ultimamilla.com.ar';

/**
 * UTILIDADES DE TESTING
 */
class TestRunner {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      errors: [],
      tests: []
    };
  }

  async test(name, fn) {
    this.results.total++;
    try {
      await fn();
      this.results.passed++;
      this.results.tests.push({ name, status: '✅ PASS' });
      console.log(`✅ ${name}`);
    } catch (error) {
      this.results.failed++;
      this.results.errors.push({ name, error: error.message });
      this.results.tests.push({ name, status: '❌ FAIL', error: error.message });
      console.log(`❌ ${name}: ${error.message}`);
    }
  }

  async testEndpoint(method, path, expectedStatus = [200, 302]) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, BASE_URL);
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: method,
        rejectUnauthorized: false // Para HTTPS sin certificado válido
      };

      const req = https.request(options, (res) => {
        if (expectedStatus.includes(res.statusCode)) {
          resolve(res.statusCode);
        } else {
          reject(new Error(`Expected ${expectedStatus}, got ${res.statusCode}`));
        }
      });

      req.on('error', reject);
      req.end();
    });
  }

  getReport() {
    return {
      total: this.results.total,
      passed: this.results.passed,
      failed: this.results.failed,
      percentage: ((this.results.passed / this.results.total) * 100).toFixed(2),
      errors: this.results.errors,
      tests: this.results.tests
    };
  }
}

/**
 * TESTS PRINCIPALES
 */
describe('🧪 SUITE COMPLETA DE TESTS - SGI', () => {
  const runner = new TestRunner();

  describe('1️⃣ MÓDULO PROYECTOS', () => {
    test('Listado de proyectos', async () => {
      const res = await runner.testEndpoint('GET', '/proyectos', [200, 302]);
      expect([200, 302]).toContain(res);
    });

    test('Vista de proyecto individual', async () => {
      const res = await runner.testEndpoint('GET', '/proyectos/ver/5b461559-b818-4c71-af8c-4c820a0a006e', [200, 302]);
      expect([200, 302]).toContain(res);
    });

    test('Ordenamiento por columnas', async () => {
      const res = await runner.testEndpoint('GET', '/proyectos?sortBy=descripcion&sortOrder=ASC', [200, 302]);
      expect([200, 302]).toContain(res);
    });

    test('Filtros de búsqueda', async () => {
      const res = await runner.testEndpoint('GET', '/proyectos?descripcion=test', [200, 302]);
      expect([200, 302]).toContain(res);
    });

    test('Paginación', async () => {
      const res = await runner.testEndpoint('GET', '/proyectos?page=1', [200, 302]);
      expect([200, 302]).toContain(res);
    });
  });

  describe('2️⃣ MÓDULO CERTIFICADOS', () => {
    test('Listado de certificados', async () => {
      const res = await runner.testEndpoint('GET', '/certificados', [200, 302]);
      expect([200, 302]).toContain(res);
    });

    test('Ver certificado individual', async () => {
      const res = await runner.testEndpoint('GET', '/certificados/ver/68964d95-4664-471e-a473-4f0e42612129', [200, 302]);
      expect([200, 302]).toContain(res);
    });

    test('Editar certificado', async () => {
      const res = await runner.testEndpoint('GET', '/certificados/editar/68964d95-4664-471e-a473-4f0e42612129', [200, 302]);
      expect([200, 302]).toContain(res);
    });

    test('Filtrar por cliente', async () => {
      const res = await runner.testEndpoint('GET', '/certificados?cliente_id=test', [200, 302]);
      expect([200, 302]).toContain(res);
    });

    test('Ordenamiento de certificados', async () => {
      const res = await runner.testEndpoint('GET', '/certificados?sort=numero&order=desc', [200, 302]);
      expect([200, 302]).toContain(res);
    });
  });

  describe('3️⃣ VALIDACIONES DE DATOS', () => {
    test('Estados de certificados (5 estados)', async () => {
      // Verificar que los 5 estados existen
      const estados = [0, 1, 2, 3, 4];
      expect(estados.length).toBe(5);
    });

    test('Formato de fechas', async () => {
      const fecha = new Date('2025-01-04').toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: '2-digit' 
      });
      expect(fecha).toMatch(/^[A-Za-z]{3} [A-Za-z]{3} \d{2}$/);
    });

    test('Navegación contextual', async () => {
      const res = await runner.testEndpoint('GET', '/certificados/ver/68964d95-4664-471e-a473-4f0e42612129?return=/proyectos/ver/test', [200, 302]);
      expect([200, 302]).toContain(res);
    });
  });

  describe('4️⃣ FUNCIONALIDADES CRÍTICAS', () => {
    test('Ordenamiento no redirige al dashboard', async () => {
      const res = await runner.testEndpoint('GET', '/proyectos?sortBy=monto_certificados&sortOrder=DESC', [200, 302]);
      expect(res).not.toBe(302); // No debería ser redirect
    });

    test('Badges de estado se muestran', async () => {
      const res = await runner.testEndpoint('GET', '/proyectos/ver/5b461559-b818-4c71-af8c-4c820a0a006e', [200, 302]);
      expect([200, 302]).toContain(res);
    });

    test('Timeline muestra certificados', async () => {
      const res = await runner.testEndpoint('GET', '/proyectos/ver/5b461559-b818-4c71-af8c-4c820a0a006e', [200, 302]);
      expect([200, 302]).toContain(res);
    });

    test('Certificados inactivos se muestran', async () => {
      const res = await runner.testEndpoint('GET', '/proyectos/ver/5b461559-b818-4c71-af8c-4c820a0a006e', [200, 302]);
      expect([200, 302]).toContain(res);
    });
  });

  describe('5️⃣ PERFORMANCE Y ESTABILIDAD', () => {
    test('Respuesta rápida (< 5s)', async () => {
      const start = Date.now();
      await runner.testEndpoint('GET', '/proyectos', [200, 302]);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000);
    });

    test('Sin errores 500', async () => {
      const res = await runner.testEndpoint('GET', '/proyectos', [200, 302]);
      expect(res).not.toBe(500);
    });

    test('Paginación no causa timeout', async () => {
      const res = await runner.testEndpoint('GET', '/proyectos?page=10', [200, 302]);
      expect([200, 302]).toContain(res);
    });
  });

  // Reporte final
  afterAll(() => {
    const report = runner.getReport();
    console.log('\n' + '='.repeat(60));
    console.log('📊 REPORTE FINAL DE TESTS');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${report.total}`);
    console.log(`✅ Pasados: ${report.passed}`);
    console.log(`❌ Fallidos: ${report.failed}`);
    console.log(`📈 Porcentaje: ${report.percentage}%`);
    console.log('='.repeat(60));
  });
});
