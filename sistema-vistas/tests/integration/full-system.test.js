/**
 * TEST INTEGRAL DEL SISTEMA SGI
 * Verifica todos los módulos: Certificados, Facturas, Logs, etc.
 * 
 * Fecha: 27 de Octubre 2025
 * Objetivo: Validar que TODOS los paginados, listados, singles y creaciones funcionen
 */

const request = require('supertest');

jest.mock('../../src/middleware/validation', () => ({
  validateSchema: () => (req, res, next) => next(),
  schemas: {}
}), { virtual: true });

jest.mock('../../src/middleware/rate-limit', () => ({
  defaultLimiter: (req, res, next) => next(),
  strictLimiter: (req, res, next) => next(),
  apiLimiter: (req, res, next) => next()
}), { virtual: true });

const app = require('../../src/config/app');
const pool = require('../../src/config/database');

describe.skip('🧪 TEST INTEGRAL DEL SISTEMA SGI', () => {
  
  // ============================================================================
  // 1. CERTIFICADOS - LISTADO, PAGINACIÓN, SINGLE
  // ============================================================================
  describe('📋 MÓDULO CERTIFICADOS', () => {
    let certificadoId;

    test('✅ GET /certificados - Debe cargar listado con paginación', async () => {
      const response = await request(app)
        .get('/certificados')
        .expect(200);

      expect(response.text).toContain('Certificados');
      expect(response.text).toContain('Número');
      expect(response.text).toContain('Cliente');
    });

    test('✅ GET /certificados?page=2 - Debe cargar página 2', async () => {
      const response = await request(app)
        .get('/certificados?page=2')
        .expect(200);

      expect(response.text).toContain('Certificados');
    });

    test('✅ GET /certificados?cliente_id=... - Debe filtrar por cliente', async () => {
      // Obtener un certificado con cliente
      const [certs] = await pool.query(
        'SELECT id, cliente_id FROM certificacions WHERE activo = 1 AND cliente_id IS NOT NULL LIMIT 1'
      );

      if (certs.length > 0) {
        const response = await request(app)
          .get(`/certificados?cliente_id=${certs[0].cliente_id}`)
          .expect(200);

        expect(response.text).toContain('Certificados');
      }
    });

    test('✅ GET /certificados/ver/:id - Debe cargar vista single', async () => {
      // Obtener un certificado
      const [certs] = await pool.query(
        'SELECT id FROM certificacions WHERE activo = 1 LIMIT 1'
      );

      if (certs.length > 0) {
        certificadoId = certs[0].id;
        const response = await request(app)
          .get(`/certificados/ver/${certificadoId}`)
          .expect(200);

        expect(response.text).toContain('Certificado N°');
        expect(response.text).toContain('Información del Certificado');
      }
    });

    test('✅ GET /certificados/ver/:id - Debe mostrar cliente', async () => {
      if (certificadoId) {
        const response = await request(app)
          .get(`/certificados/ver/${certificadoId}`)
          .expect(200);

        expect(response.text).toContain('Cliente');
      }
    });

    test('✅ GET /certificados/ver/:id - Debe mostrar proyecto asociado', async () => {
      if (certificadoId) {
        const response = await request(app)
          .get(`/certificados/ver/${certificadoId}`)
          .expect(200);

        // Puede o no tener proyecto, pero no debe fallar
        expect(response.status).toBe(200);
      }
    });

    test('✅ GET /certificados/ver/:id - Debe retornar 404 si no existe', async () => {
      await request(app)
        .get('/certificados/ver/invalid-id')
        .expect(404);
    });
  });

  // ============================================================================
  // 2. FACTURAS EMITIDAS - LISTADO, PAGINACIÓN, SINGLE, EDICIÓN
  // ============================================================================
  describe('💰 MÓDULO FACTURAS EMITIDAS', () => {
    let facturaId;

    test('✅ GET /facturas/emitidas - Debe cargar listado', async () => {
      const response = await request(app)
        .get('/facturas/emitidas')
        .expect(200);

      expect(response.text).toContain('Facturas Emitidas');
    });

    test('✅ GET /facturas/api/emitidas - API debe retornar JSON', async () => {
      const response = await request(app)
        .get('/facturas/api/emitidas?page=1&limit=10')
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
    });

    test('✅ GET /facturas/emitidas/:id - Debe cargar vista single', async () => {
      // Obtener una factura
      const [facturas] = await pool.query(
        'SELECT id FROM factura_ventas WHERE activo = 1 LIMIT 1'
      );

      if (facturas.length > 0) {
        facturaId = facturas[0].id;
        const response = await request(app)
          .get(`/facturas/emitidas/${facturaId}`)
          .expect(200);

        expect(response.text).toContain('Factura');
      }
    });

    test('✅ GET /facturas/emitidas/:id/editar - Debe cargar formulario', async () => {
      if (facturaId) {
        const response = await request(app)
          .get(`/facturas/emitidas/${facturaId}/editar`)
          .expect(200);

        expect(response.text).toContain('Editar Factura');
        expect(response.text).toContain('form');
      }
    });

    test('✅ POST /facturas/emitidas/:id/editar - Debe actualizar observaciones', async () => {
      if (facturaId) {
        const nuevasObs = 'Test ' + Date.now();
        
        const response = await request(app)
          .post(`/facturas/emitidas/${facturaId}/editar`)
          .send({
            observaciones: nuevasObs,
            estado: 1
          })
          .expect(302);

        // Verificar que se guardó
        const [facturas] = await pool.query(
          'SELECT observaciones FROM factura_ventas WHERE id = ?',
          [facturaId]
        );

        expect(facturas[0].observaciones).toBe(nuevasObs);
      }
    });

    test('✅ GET /facturas/emitidas/:id/editar - Debe retornar 404 si no existe', async () => {
      await request(app)
        .get('/facturas/emitidas/invalid-id/editar')
        .expect(404);
    });
  });

  // ============================================================================
  // 3. FACTURAS RECIBIDAS - LISTADO, PAGINACIÓN
  // ============================================================================
  describe('📥 MÓDULO FACTURAS RECIBIDAS', () => {
    test('✅ GET /facturas/recibidas - Debe cargar listado', async () => {
      const response = await request(app)
        .get('/facturas/recibidas')
        .expect(200);

      expect(response.text).toContain('Facturas Recibidas');
    });

    test('✅ GET /facturas/api/recibidas - API debe retornar JSON', async () => {
      const response = await request(app)
        .get('/facturas/api/recibidas?page=1&limit=10')
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
    });

    test('✅ GET /facturas/api/recibidas - Debe tener paginación', async () => {
      const response = await request(app)
        .get('/facturas/api/recibidas?page=1&limit=10')
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  // ============================================================================
  // 4. LOGS DE AUDITORÍA - LISTADO, FILTROS
  // ============================================================================
  describe('📊 MÓDULO LOGS DE AUDITORÍA', () => {
    test('✅ GET /logs - Debe cargar listado de logs', async () => {
      const response = await request(app)
        .get('/logs')
        .expect(200);

      expect(response.text).toContain('Logs');
    });

    test('✅ GET /logs/statistics - Debe cargar dashboard de estadísticas', async () => {
      const response = await request(app)
        .get('/logs/statistics')
        .expect(200);

      expect(response.text).toContain('Estadísticas');
    });

    test('✅ GET /logs/alerts - Debe cargar alertas críticas', async () => {
      const response = await request(app)
        .get('/logs/alerts')
        .expect(200);

      expect(response.text).toContain('Alertas');
    });

    test('✅ GET /logs/api/list - API debe retornar logs', async () => {
      const response = await request(app)
        .get('/logs/api/list?page=1&limit=20')
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
    });
  });

  // ============================================================================
  // 5. CLIENTES - LISTADO, BÚSQUEDA
  // ============================================================================
  describe('👥 MÓDULO CLIENTES', () => {
    test('✅ GET /clientes - Debe cargar listado', async () => {
      const response = await request(app)
        .get('/clientes')
        .expect(200);

      expect(response.text).toContain('Clientes');
    });

    test('✅ GET /clientes/api/search-json - API de búsqueda debe funcionar', async () => {
      const response = await request(app)
        .get('/clientes/api/search-json?q=a&page=1&limit=10')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    test('✅ GET /clientes/api/search-json - Debe retornar resultados paginados', async () => {
      const response = await request(app)
        .get('/clientes/api/search-json?q=a&page=1&limit=5')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(5);
    });
  });

  // ============================================================================
  // 6. PROYECTOS - LISTADO, PAGINACIÓN, SINGLE
  // ============================================================================
  describe('📁 MÓDULO PROYECTOS', () => {
    let proyectoId;

    test('✅ GET /proyectos - Debe cargar listado', async () => {
      const response = await request(app)
        .get('/proyectos')
        .expect(200);

      expect(response.text).toContain('Proyectos');
    });

    test('✅ GET /proyectos/ver/:id - Debe cargar vista single', async () => {
      // Obtener un proyecto
      const [proyectos] = await pool.query(
        'SELECT id FROM proyectos WHERE activo = 1 LIMIT 1'
      );

      if (proyectos.length > 0) {
        proyectoId = proyectos[0].id;
        const response = await request(app)
          .get(`/proyectos/ver/${proyectoId}`)
          .expect(200);

        expect(response.text).toContain('Proyecto');
      }
    });
  });

  // ============================================================================
  // 7. PRESUPUESTOS - LISTADO, PAGINACIÓN
  // ============================================================================
  describe('💵 MÓDULO PRESUPUESTOS', () => {
    test('✅ GET /presupuestos - Debe cargar listado', async () => {
      const response = await request(app)
        .get('/presupuestos')
        .expect(200);

      expect(response.text).toContain('Presupuestos');
    });
  });

  // ============================================================================
  // 8. LEADS - LISTADO, PAGINACIÓN
  // ============================================================================
  describe('🎯 MÓDULO LEADS', () => {
    test('✅ GET /leads - Debe cargar listado', async () => {
      const response = await request(app)
        .get('/leads')
        .expect(200);

      expect(response.text).toContain('Leads');
    });
  });

  // ============================================================================
  // 9. VERIFICACIÓN DE CAMPOS EN LISTADOS
  // ============================================================================
  describe('🔍 VERIFICACIÓN DE CAMPOS EN LISTADOS', () => {
    test('✅ Certificados - Debe mostrar columnas correctas', async () => {
      const response = await request(app)
        .get('/certificados')
        .expect(200);

      expect(response.text).toContain('Número');
      expect(response.text).toContain('Fecha');
      expect(response.text).toContain('Cliente');
      expect(response.text).toContain('Estado');
    });

    test('✅ Facturas Emitidas - Debe mostrar columnas correctas', async () => {
      const response = await request(app)
        .get('/facturas/emitidas')
        .expect(200);

      expect(response.text).toContain('Factura');
      expect(response.text).toContain('Cliente');
      expect(response.text).toContain('Total');
    });

    test('✅ Facturas Recibidas - Debe mostrar columnas correctas', async () => {
      const response = await request(app)
        .get('/facturas/recibidas')
        .expect(200);

      expect(response.text).toContain('Factura');
      expect(response.text).toContain('Proveedor');
      expect(response.text).toContain('Total');
    });
  });

  // ============================================================================
  // 10. VERIFICACIÓN DE CONEXIÓN A BD
  // ============================================================================
  describe('🗄️ VERIFICACIÓN DE CONEXIÓN A BD', () => {
    test('✅ Debe conectarse a la base de datos', async () => {
      const connection = await pool.getConnection();
      expect(connection).toBeDefined();
      await connection.release();
    });

    test('✅ Debe obtener versión de MySQL', async () => {
      const [rows] = await pool.query('SELECT VERSION() as version');
      expect(rows[0].version).toBeDefined();
    });

    test('✅ Debe tener todas las tablas principales', async () => {
      const [tables] = await pool.query(
        `SELECT COUNT(*) as count FROM information_schema.tables 
         WHERE table_schema = ?`,
        ['sgi_production']
      );

      expect(tables[0].count).toBeGreaterThan(100);
    });
  });

  // ============================================================================
  // 11. VERIFICACIÓN DE RUTAS CRÍTICAS
  // ============================================================================
  describe('🛣️ VERIFICACIÓN DE RUTAS CRÍTICAS', () => {
    test('✅ GET / - Debe redirigir a dashboard', async () => {
      const response = await request(app)
        .get('/')
        .expect(302);

      expect(response.headers.location).toContain('dashboard');
    });

    test('✅ GET /dashboard - Debe cargar o redirigir a login', async () => {
      const response = await request(app)
        .get('/dashboard');

      expect([200, 302]).toContain(response.status);
    });

    test('✅ GET /health - Debe retornar estado del servidor', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
    });
  });

  afterAll(async () => {
    await pool.end();
  });
});
