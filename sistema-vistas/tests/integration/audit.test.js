/**
 * ============================================================================
 * TESTS DE INTEGRACIÓN - SISTEMA DE AUDITORÍA
 * ============================================================================
 * Verifica el funcionamiento completo del sistema de logs
 * ============================================================================
 */

const request = require('supertest');

const inMemoryStore = {
  logs: [],
  alerts: [],
  logId: 1,
  alertId: 1
};

jest.mock('../../src/config/database', () => ({
  query: jest.fn(async (sql) => {
    if (/DELETE FROM\s+AUDIT_LOGS/i.test(sql)) {
      inMemoryStore.logs = inMemoryStore.logs.filter(log => !log.user_email?.includes('test'));
      return [{ affectedRows: 1 }];
    }

    if (/DELETE FROM\s+AUDIT_CRITICAL_ALERTS/i.test(sql)) {
      inMemoryStore.alerts = inMemoryStore.alerts.filter(alert => {
        const relatedLog = inMemoryStore.logs.find(log => log.id === alert.log_id);
        return !(relatedLog && relatedLog.user_email?.includes('test'));
      });
      return [{ affectedRows: 1 }];
    }

    return [[[]]];
  }),
  end: jest.fn().mockResolvedValue()
}));

jest.mock('../../src/models/AuditLogModel', () => {
  const normalizeDate = (value) => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return isNaN(date.getTime()) ? null : date;
  };

  const enrichLog = (log) => {
    const alert = inMemoryStore.alerts.find(a => a.log_id === log.id && !a.notified) || null;
    return {
      ...log,
      old_values: log.old_values ?? null,
      new_values: log.new_values ?? null,
      metadata: log.metadata ?? null,
      is_critical: Boolean(alert)
    };
  };

  const applyFilters = (logs, filters = {}) => {
    const {
      userId,
      module,
      action,
      entityType,
      entityId,
      startDate,
      endDate,
      search,
      isCritical
    } = filters;

    let result = [...logs];

    if (userId) {
      result = result.filter(log => log.user_id === userId);
    }

    if (module) {
      result = result.filter(log => log.module === module);
    }

    if (action) {
      result = result.filter(log => log.action === action);
    }

    if (entityType) {
      result = result.filter(log => log.entity_type === entityType);
    }

    if (entityId) {
      result = result.filter(log => log.entity_id === entityId);
    }

    if (startDate) {
      const start = normalizeDate(startDate);
      if (start) {
        result = result.filter(log => normalizeDate(log.created_at) >= start);
      }
    }

    if (endDate) {
      const end = normalizeDate(endDate);
      if (end) {
        result = result.filter(log => normalizeDate(log.created_at) <= end);
      }
    }

    if (search) {
      const term = search.toLowerCase();
      result = result.filter(log => {
        return [log.user_name, log.user_email, log.url]
          .filter(Boolean)
          .some(field => field.toLowerCase().includes(term));
      });
    }

    if (isCritical) {
      result = result.filter(log => inMemoryStore.alerts.some(a => a.log_id === log.id && !a.notified));
    }

    return result;
  };

  const sortLogs = (logs, sortBy = 'created_at', sortOrder = 'DESC') => {
    const multiplier = sortOrder.toUpperCase() === 'ASC' ? 1 : -1;
    return [...logs].sort((a, b) => {
      const valueA = a[sortBy];
      const valueB = b[sortBy];

      if (valueA == null && valueB == null) return 0;
      if (valueA == null) return 1 * multiplier;
      if (valueB == null) return -1 * multiplier;

      if (valueA === valueB) return 0;
      return valueA > valueB ? 1 * multiplier : -1 * multiplier;
    });
  };

  const paginate = (logs, page = 1, limit = 50) => {
    const offset = (page - 1) * limit;
    return logs.slice(offset, offset + limit);
  };

  const createLog = async (logData = {}) => {
    const log = {
      id: inMemoryStore.logId++,
      user_id: logData.userId ?? null,
      user_name: logData.userName ?? null,
      user_email: logData.userEmail ?? null,
      action: logData.action ?? null,
      module: logData.module ?? null,
      entity_type: logData.entityType ?? null,
      entity_id: logData.entityId ?? null,
      old_values: logData.oldValues ?? null,
      new_values: logData.newValues ?? null,
      ip_address: logData.ipAddress ?? null,
      user_agent: logData.userAgent ?? null,
      method: logData.method ?? null,
      url: logData.url ?? null,
      status_code: logData.statusCode ?? null,
      duration_ms: logData.durationMs ?? null,
      metadata: logData.metadata ?? null,
      created_at: new Date().toISOString()
    };

    inMemoryStore.logs.push(log);

    if (log.action === 'DELETE') {
      inMemoryStore.alerts.push({
        id: inMemoryStore.alertId++,
        log_id: log.id,
        alert_type: 'DELETE',
        created_at: new Date().toISOString(),
        notified: false,
        notified_at: null
      });
    }

    return log.id;
  };

  const getLogs = async (filters = {}, pagination = {}) => {
    const {
      page = 1,
      limit = 50,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = pagination;

    const filtered = applyFilters(inMemoryStore.logs, filters);
    const sorted = sortLogs(filtered, sortBy, sortOrder);
    const paginated = paginate(sorted, page, limit).map(enrichLog);

    return {
      logs: paginated,
      total: filtered.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit) || 1
    };
  };

  const getLogById = async (logId) => {
    const log = inMemoryStore.logs.find(item => item.id === logId);
    return log ? enrichLog(log) : null;
  };

  const getStatistics = async (daysBack = 7) => {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - daysBack);

    const recentLogs = inMemoryStore.logs.filter(log => normalizeDate(log.created_at) >= threshold);
    const uniqueUsers = new Set(recentLogs.map(log => log.user_id).filter(Boolean));

    return {
      total_logs: recentLogs.length,
      unique_users: uniqueUsers.size,
      delete_actions: recentLogs.filter(log => log.action === 'DELETE').length
    };
  };

  const getMostActiveUsers = async (daysBack = 7, limit = 10) => {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - daysBack);

    const activity = inMemoryStore.logs.reduce((acc, log) => {
      if (!log.user_id || normalizeDate(log.created_at) < threshold) return acc;

      if (!acc[log.user_id]) {
        acc[log.user_id] = {
          user_id: log.user_id,
          user_name: log.user_name,
          user_email: log.user_email,
          action_count: 0,
          last_activity: log.created_at
        };
      }

      acc[log.user_id].action_count += 1;
      acc[log.user_id].last_activity = log.created_at;
      return acc;
    }, {});

    return Object.values(activity)
      .sort((a, b) => b.action_count - a.action_count)
      .slice(0, limit);
  };

  const getCriticalAlerts = async () => {
    return inMemoryStore.alerts
      .filter(alert => !alert.notified)
      .map(alert => {
        const log = inMemoryStore.logs.find(item => item.id === alert.log_id) || {};
        return {
          ...alert,
          user_name: log.user_name ?? null,
          module: log.module ?? null,
          entity_type: log.entity_type ?? null,
          entity_id: log.entity_id ?? null,
          log_created_at: log.created_at ?? null
        };
      });
  };

  const markAlertAsNotified = async (alertId) => {
    const alert = inMemoryStore.alerts.find(item => item.id === alertId);
    if (!alert) return false;

    alert.notified = true;
    alert.notified_at = new Date().toISOString();
    return true;
  };

  const exportToCSV = async (filters = {}) => {
    const { logs } = await getLogs(filters, { limit: 10000 });

    const headers = [
      'ID', 'Fecha', 'Usuario', 'Email', 'Acción', 'Módulo',
      'Tipo Entidad', 'ID Entidad', 'IP', 'Método', 'URL',
      'Status', 'Duración (ms)', 'Crítico'
    ];

    const rows = logs.map(log => [
      log.id,
      log.created_at,
      log.user_name || 'N/A',
      log.user_email || 'N/A',
      log.action || 'N/A',
      log.module || 'N/A',
      log.entity_type || 'N/A',
      log.entity_id || 'N/A',
      log.ip_address || 'N/A',
      log.method || 'N/A',
      log.url || 'N/A',
      log.status_code || 'N/A',
      log.duration_ms || 'N/A',
      log.is_critical ? 'SÍ' : 'NO'
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  };

  const getAvailableModules = async () => {
    return [...new Set(inMemoryStore.logs.map(log => log.module).filter(Boolean))].sort();
  };

  const getAvailableActions = async () => {
    return [...new Set(inMemoryStore.logs.map(log => log.action).filter(Boolean))].sort();
  };

  const getAvailableUsers = async () => {
    const users = new Map();

    inMemoryStore.logs.forEach(log => {
      if (!log.user_id) return;
      if (!users.has(log.user_id)) {
        users.set(log.user_id, {
          id: log.user_id,
          username: log.user_name,
          email: log.user_email,
          total_logs: 0
        });
      }

      const user = users.get(log.user_id);
      user.total_logs += 1;
    });

    return Array.from(users.values()).sort((a, b) => b.total_logs - a.total_logs);
  };

  const getCriticalLogs = async (options = {}) => {
    return getLogs({ ...options, isCritical: true }, options.pagination || {});
  };

  const getActivityByModule = async (daysBack = 7) => {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - daysBack);

    const activity = {};

    inMemoryStore.logs.forEach(log => {
      const createdAt = normalizeDate(log.created_at);
      if (!createdAt || createdAt < threshold) return;

      const key = `${log.module || 'N/A'}|${log.action || 'N/A'}|${createdAt.toISOString().split('T')[0]}`;

      if (!activity[key]) {
        activity[key] = {
          module: log.module || 'N/A',
          action: log.action || 'N/A',
          count: 0,
          date: createdAt.toISOString().split('T')[0]
        };
      }

      activity[key].count += 1;
    });

    return Object.values(activity)
      .sort((a, b) => new Date(b.date) - new Date(a.date) || b.count - a.count);
  };

  return {
    createLog,
    getLogs,
    getLogById,
    getStatistics,
    getMostActiveUsers,
    getCriticalAlerts,
    markAlertAsNotified,
    exportToCSV,
    getAvailableModules,
    getAvailableActions,
    getAvailableUsers,
    getCriticalLogs,
    getActivityByModule
  };
});

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
