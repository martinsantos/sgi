/**
 * ============================================================================
 * TESTS DE INTEGRACIÓN - SISTEMA DE AUDITORÍA
 * ============================================================================
 * Verifica el funcionamiento completo del sistema de logs
 * ============================================================================
 */

const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/config/database');
const AuditLogModel = require('../../src/models/AuditLogModel');

describe('🔍 Sistema de Auditoría - Tests de Integración', () => {

  beforeAll(async () => {
    // Limpiar tabla de logs de prueba
    await db.query('DELETE FROM audit_logs WHERE user_email LIKE "%test%"');
  });

  afterAll(async () => {
    // Limpiar logs de prueba
    await db.query('DELETE FROM audit_logs WHERE user_email LIKE "%test%"');
    await db.end();
  });

  describe('1. Modelo AuditLogModel', () => {
    
    test('Crear log exitosamente', async () => {
      const logData = {
        userId: 999,
        userName: 'Test User',
        userEmail: 'test@example.com',
        action: 'CREATE',
        module: 'clientes',
        entityType: 'cliente',
        entityId: '123',
        ipAddress: '127.0.0.1',
        method: 'POST',
        url: '/clientes/nuevo',
        statusCode: 201
      };

      const logId = await AuditLogModel.createLog(logData);
      expect(logId).toBeGreaterThan(0);
    });

    test('Obtener logs con filtros', async () => {
      const result = await AuditLogModel.getLogs({
        module: 'clientes'
      }, {
        page: 1,
        limit: 10
      });

      expect(result).toHaveProperty('logs');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('totalPages');
      expect(Array.isArray(result.logs)).toBe(true);
    });

    test('Obtener log por ID', async () => {
      // Crear un log primero
      const logId = await AuditLogModel.createLog({
        userId: 999,
        userName: 'Test User',
        userEmail: 'test@example.com',
        action: 'VIEW',
        module: 'dashboard',
        statusCode: 200
      });

      const log = await AuditLogModel.getLogById(logId);
      expect(log).not.toBeNull();
      expect(log.id).toBe(logId);
      expect(log.action).toBe('VIEW');
    });

    test('Obtener estadísticas', async () => {
      const stats = await AuditLogModel.getStatistics(7);
      
      expect(stats).toHaveProperty('total_logs');
      expect(stats).toHaveProperty('unique_users');
      expect(stats).toHaveProperty('delete_actions');
      expect(typeof stats.total_logs).toBe('number');
    });

    test('Obtener usuarios activos', async () => {
      const users = await AuditLogModel.getMostActiveUsers(7, 5);
      
      expect(Array.isArray(users)).toBe(true);
      if (users.length > 0) {
        expect(users[0]).toHaveProperty('user_id');
        expect(users[0]).toHaveProperty('action_count');
      }
    });
  });

  describe('2. Controlador - Endpoints de Vistas', () => {
    
    test('GET /logs - Vista principal', async () => {
      const response = await request(app)
        .get('/logs')
        .expect(200);

      expect(response.text).toContain('Auditoría del Sistema');
    });

    test('GET /logs/statistics - Dashboard de estadísticas', async () => {
      const response = await request(app)
        .get('/logs/statistics')
        .expect(200);

      expect(response.text).toContain('Estadísticas de Auditoría');
    });

    test('GET /logs con filtros', async () => {
      const response = await request(app)
        .get('/logs?module=clientes&action=CREATE')
        .expect(200);

      expect(response.text).toContain('Auditoría');
    });
  });

  describe('3. API Endpoints', () => {
    
    test('GET /logs/api/logs - Obtener logs en JSON', async () => {
      const response = await request(app)
        .get('/logs/api/logs')
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('logs');
    });

    test('GET /logs/api/statistics - Estadísticas en JSON', async () => {
      const response = await request(app)
        .get('/logs/api/statistics?days=7')
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total_logs');
    });

    test('GET /logs/api/alerts - Alertas críticas', async () => {
      const response = await request(app)
        .get('/logs/api/alerts')
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('count');
    });
  });

  describe('4. Middleware de Auditoría', () => {
    
    test('Middleware registra acciones automáticamente', async () => {
      // Hacer una request a cualquier endpoint
      await request(app)
        .get('/logs')
        .expect([200, 302]); // Puede redirigir si no está autenticado

      // Esperar un poco para que se registre el log (async)
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verificar que se creó un log
      const result = await AuditLogModel.getLogs({
        module: 'dashboard'
      }, { limit: 1 });

      expect(result.total).toBeGreaterThan(0);
    });

    test('Middleware NO registra rutas excluidas', async () => {
      const initialCount = (await AuditLogModel.getLogs({
        url: '/health'
      }, { limit: 1 })).total;

      await request(app)
        .get('/health')
        .expect([200, 404]);

      await new Promise(resolve => setTimeout(resolve, 100));

      const finalCount = (await AuditLogModel.getLogs({
        url: '/health'
      }, { limit: 1 })).total;

      // No debería haber aumentado
      expect(finalCount).toBe(initialCount);
    });
  });

  describe('5. Alertas Críticas', () => {
    
    test('Se crea alerta en eliminaciones', async () => {
      // Crear un log de eliminación
      const logId = await AuditLogModel.createLog({
        userId: 999,
        userName: 'Test User',
        userEmail: 'test@example.com',
        action: 'DELETE',
        module: 'clientes',
        entityType: 'cliente',
        entityId: '999',
        statusCode: 200
      });

      // Esperar a que se ejecute el trigger
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verificar que se creó una alerta
      const alerts = await AuditLogModel.getCriticalAlerts();
      const alert = alerts.find(a => a.log_id === logId);

      expect(alert).toBeDefined();
      expect(alert.alert_type).toBe('DELETE');
    });
  });

  describe('6. Exportación de Datos', () => {
    
    test('Exportar logs a CSV', async () => {
      const response = await request(app)
        .get('/logs/export/csv?module=clientes')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.text).toContain('ID');
      expect(response.text).toContain('Usuario');
    });

    test('CSV contiene datos correctos', async () => {
      const csv = await AuditLogModel.exportToCSV({ module: 'clientes' });
      
      expect(csv).toContain('"ID","Fecha","Usuario"');
      expect(typeof csv).toBe('string');
    });
  });

  describe('7. Búsqueda y Filtros', () => {
    
    test('Buscar por texto', async () => {
      const result = await AuditLogModel.getLogs({
        search: 'test'
      }, { limit: 10 });

      result.logs.forEach(log => {
        const matchFound = 
          (log.user_name && log.user_name.toLowerCase().includes('test')) ||
          (log.user_email && log.user_email.toLowerCase().includes('test')) ||
          (log.url && log.url.toLowerCase().includes('test'));
        
        expect(matchFound).toBe(true);
      });
    });

    test('Filtrar por rango de fechas', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      
      const result = await AuditLogModel.getLogs({
        startDate: startDate.toISOString().split('T')[0]
      }, { limit: 10 });

      result.logs.forEach(log => {
        const logDate = new Date(log.created_at);
        expect(logDate >= startDate).toBe(true);
      });
    });
  });

  describe('8. Performance', () => {
    
    test('Consulta de logs es rápida (<1000ms)', async () => {
      const start = Date.now();
      
      await AuditLogModel.getLogs({}, { limit: 50 });
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });

    test('Estadísticas se calculan rápidamente', async () => {
      const start = Date.now();
      
      await AuditLogModel.getStatistics(30);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(2000);
    });
  });
});
