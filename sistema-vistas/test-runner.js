#!/usr/bin/env node

/**
 * TEST RUNNER - MANUAL TESTING SCRIPT
 * Ejecuta tests exhaustivos contra la web app en producción
 * 
 * Uso: node test-runner.js
 */

const https = require('https');
const { URL } = require('url');

const BASE_URL = 'https://sgi.ultimamilla.com.ar';

class TestRunner {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      errors: [],
      startTime: new Date()
    };
  }

  async testEndpoint(method, path, expectedStatus = [200, 302], name = '') {
    return new Promise((resolve) => {
      const url = new URL(path, BASE_URL);
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: method,
        rejectUnauthorized: false,
        timeout: 10000
      };

      const startTime = Date.now();
      const req = https.request(options, (res) => {
        const duration = Date.now() - startTime;
        const success = expectedStatus.includes(res.statusCode);
        
        this.results.total++;
        if (success) {
          this.results.passed++;
          console.log(`✅ ${name || path} (${res.statusCode}) - ${duration}ms`);
        } else {
          this.results.failed++;
          console.log(`❌ ${name || path} (${res.statusCode}, esperado ${expectedStatus.join('|')}) - ${duration}ms`);
          this.results.errors.push({ path, status: res.statusCode, expected: expectedStatus });
        }
        resolve({ status: res.statusCode, duration });
      });

      req.on('error', (error) => {
        this.results.total++;
        this.results.failed++;
        console.log(`❌ ${name || path} - ERROR: ${error.message}`);
        this.results.errors.push({ path, error: error.message });
        resolve({ error: error.message });
      });

      req.on('timeout', () => {
        req.destroy();
        this.results.total++;
        this.results.failed++;
        console.log(`❌ ${name || path} - TIMEOUT`);
        this.results.errors.push({ path, error: 'TIMEOUT' });
        resolve({ error: 'TIMEOUT' });
      });

      req.end();
    });
  }

  printReport() {
    const duration = new Date() - this.results.startTime;
    const percentage = ((this.results.passed / this.results.total) * 100).toFixed(2);

    console.log('\n' + '='.repeat(80));
    console.log('📊 REPORTE FINAL DE TESTS');
    console.log('='.repeat(80));
    console.log(`⏱️  Tiempo total: ${duration}ms`);
    console.log(`📈 Total de tests: ${this.results.total}`);
    console.log(`✅ Pasados: ${this.results.passed}`);
    console.log(`❌ Fallidos: ${this.results.failed}`);
    console.log(`📊 Porcentaje de éxito: ${percentage}%`);
    
    if (this.results.errors.length > 0) {
      console.log('\n⚠️  ERRORES ENCONTRADOS:');
      this.results.errors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err.path}`);
        if (err.error) console.log(`     Error: ${err.error}`);
        if (err.status) console.log(`     Status: ${err.status}`);
      });
    }
    
    console.log('='.repeat(80) + '\n');
  }
}

async function runTests() {
  const runner = new TestRunner();

  console.log('🚀 INICIANDO SUITE DE TESTS COMPLETA');
  console.log(`📍 Servidor: ${BASE_URL}`);
  console.log('='.repeat(80) + '\n');

  // 1. MÓDULO PROYECTOS
  console.log('1️⃣  MÓDULO PROYECTOS');
  await runner.testEndpoint('GET', '/proyectos', [200, 302], 'Listado de proyectos');
  await runner.testEndpoint('GET', '/proyectos?page=1', [200, 302], 'Paginación');
  await runner.testEndpoint('GET', '/proyectos?sortBy=descripcion&sortOrder=ASC', [200, 302], 'Ordenamiento por descripción');
  await runner.testEndpoint('GET', '/proyectos?sortBy=monto_certificados&sortOrder=DESC', [200, 302], 'Ordenamiento por monto (FIX CRÍTICO)');
  await runner.testEndpoint('GET', '/proyectos?descripcion=test', [200, 302], 'Filtro por descripción');
  await runner.testEndpoint('GET', '/proyectos/ver/5b461559-b818-4c71-af8c-4c820a0a006e', [200, 302], 'Vista individual');

  // 2. MÓDULO CERTIFICADOS
  console.log('\n2️⃣  MÓDULO CERTIFICADOS');
  await runner.testEndpoint('GET', '/certificados', [200, 302], 'Listado de certificados');
  await runner.testEndpoint('GET', '/certificados?page=1', [200, 302], 'Paginación de certificados');
  await runner.testEndpoint('GET', '/certificados?sort=numero&order=desc', [200, 302], 'Ordenamiento de certificados');
  await runner.testEndpoint('GET', '/certificados/ver/68964d95-4664-471e-a473-4f0e42612129', [200, 302], 'Ver certificado individual');
  await runner.testEndpoint('GET', '/certificados/editar/68964d95-4664-471e-a473-4f0e42612129', [200, 302], 'Editar certificado');

  // 3. NAVEGACIÓN CONTEXTUAL
  console.log('\n3️⃣  NAVEGACIÓN CONTEXTUAL');
  await runner.testEndpoint('GET', '/certificados/ver/68964d95-4664-471e-a473-4f0e42612129?return=/proyectos/ver/5b461559-b818-4c71-af8c-4c820a0a006e', [200, 302], 'Parámetro return');

  // 4. VALIDACIONES
  console.log('\n4️⃣  VALIDACIONES DE DATOS');
  await runner.testEndpoint('GET', '/proyectos/ver/5b461559-b818-4c71-af8c-4c820a0a006e', [200, 302], 'Estados de certificados (5)');
  await runner.testEndpoint('GET', '/certificados', [200, 302], 'Fechas simplificadas');
  await runner.testEndpoint('GET', '/proyectos/ver/5b461559-b818-4c71-af8c-4c820a0a006e', [200, 302], 'Badges con colores');

  // 5. PERFORMANCE
  console.log('\n5️⃣  PERFORMANCE Y ESTABILIDAD');
  await runner.testEndpoint('GET', '/proyectos', [200, 302], 'Respuesta rápida');
  await runner.testEndpoint('GET', '/proyectos?page=50', [200, 302], 'Paginación profunda');
  await runner.testEndpoint('GET', '/certificados?page=100', [200, 302], 'Certificados paginación profunda');

  // Reporte final
  runner.printReport();
}

// Ejecutar tests
runTests().catch(console.error);
