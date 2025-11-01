/**
 * ============================================================================
 * MODELO DE AUDITORÍA - SISTEMA DE LOGS
 * ============================================================================
 * Gestiona todos los logs de auditoría del sistema
 * Diseñado para almacenamiento eficiente con retención indefinida
 * ============================================================================
 */

const db = require('../config/database');

function parseJsonField(value) {
  if (!value || typeof value !== 'string') {
    return value ?? null;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    // Almacenar el valor crudo para análisis futuro sin romper el flujo
    return value;
  }
}

class AuditLogModel {
  
  /**
   * Crea un nuevo log de auditoría
   * @param {Object} logData - Datos del log
   * @returns {Promise<number>} ID del log creado
   */
  static async createLog(logData) {
    try {
      const {
        userId,
        userName,
        userEmail,
        action,
        module,
        entityType = null,
        entityId = null,
        oldValues = null,
        newValues = null,
        ipAddress = null,
        userAgent = null,
        method = null,
        url = null,
        statusCode = null,
        durationMs = null,
        metadata = null
      } = logData;

      const query = `
        INSERT INTO audit_logs (
          user_id, user_name, user_email, action, module,
          entity_type, entity_id, old_values, new_values,
          ip_address, user_agent, method, url, status_code,
          duration_ms, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        userId,
        userName,
        userEmail,
        action,
        module,
        entityType,
        entityId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ipAddress,
        userAgent,
        method,
        url,
        statusCode,
        durationMs,
        metadata ? JSON.stringify(metadata) : null
      ];

      const [result] = await db.query(query, values);
      return result.insertId;
    } catch (error) {
      console.error('❌ Error al crear log de auditoría:', error);
      // No lanzar error para no afectar la operación principal
      return null;
    }
  }

  /**
   * Obtiene logs con filtros y paginación
   * @param {Object} filters - Filtros de búsqueda
   * @param {Object} pagination - Opciones de paginación
   * @returns {Promise<Object>} Logs y total
   */
  static async getLogs(filters = {}, pagination = {}) {
    try {
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

      const {
        page = 1,
        limit = 50,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = pagination;

      const offset = (page - 1) * limit;
      const conditions = [];
      const values = [];

      // Construir condiciones dinámicamente
      if (userId) {
        conditions.push('user_id = ?');
        values.push(userId);
      }

      if (module) {
        conditions.push('module = ?');
        values.push(module);
      }

      if (action) {
        conditions.push('action = ?');
        values.push(action);
      }

      if (entityType) {
        conditions.push('entity_type = ?');
        values.push(entityType);
      }

      if (entityId) {
        conditions.push('entity_id = ?');
        values.push(entityId);
      }

      if (startDate) {
        conditions.push('created_at >= ?');
        values.push(startDate);
      }

      if (endDate) {
        conditions.push('created_at <= ?');
        values.push(endDate);
      }

      if (search) {
        conditions.push('(user_name LIKE ? OR user_email LIKE ? OR url LIKE ?)');
        const searchTerm = `%${search}%`;
        values.push(searchTerm, searchTerm, searchTerm);
      }

      if (isCritical) {
        conditions.push('action = "DELETE"');
      }

      const whereClause = conditions.length > 0 
        ? `WHERE ${conditions.join(' AND ')}` 
        : '';

      // Consulta para obtener el total
      const countQuery = `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`;
      const [countResult] = await db.query(countQuery, values);
      const total = countResult[0].total;

      // Consulta para obtener los logs
      const logsQuery = `
        SELECT 
          id, user_id, user_name, user_email, action, module,
          entity_type, entity_id, old_values, new_values,
          ip_address, user_agent, method, url, status_code,
          duration_ms, metadata, created_at,
          (SELECT COUNT(*) FROM audit_critical_alerts WHERE log_id = audit_logs.id) as is_critical
        FROM audit_logs
        ${whereClause}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?
      `;

      values.push(limit, offset);
      const [logs] = await db.query(logsQuery, values);

      // Parse JSON fields
      const parsedLogs = logs.map(log => ({
        ...log,
        old_values: parseJsonField(log.old_values),
        new_values: parseJsonField(log.new_values),
        metadata: parseJsonField(log.metadata),
        is_critical: log.is_critical > 0
      }));

      return {
        logs: parsedLogs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('❌ Error al obtener logs:', error);
      throw error;
    }
  }

  /**
   * Obtiene un log específico por ID
   * @param {number} logId - ID del log
   * @returns {Promise<Object>} Log completo
   */
  static async getLogById(logId) {
    try {
      const query = `
        SELECT 
          al.*,
          (SELECT COUNT(*) FROM audit_critical_alerts WHERE log_id = al.id) as is_critical
        FROM audit_logs al
        WHERE al.id = ?
      `;

      const [logs] = await db.query(query, [logId]);

      if (logs.length === 0) {
        return null;
      }

      const log = logs[0];
      return {
        ...log,
        old_values: parseJsonField(log.old_values),
        new_values: parseJsonField(log.new_values),
        metadata: parseJsonField(log.metadata),
        is_critical: log.is_critical > 0
      };
    } catch (error) {
      console.error('❌ Error al obtener log por ID:', error);
      throw error;
    }
  }

  /**
   * Obtiene logs por usuario
   * @param {number} userId - ID del usuario
   * @param {Object} options - Opciones de consulta
   * @returns {Promise<Array>} Lista de logs
   */
  static async getLogsByUser(userId, options = {}) {
    return this.getLogs({ userId }, options);
  }

  /**
   * Obtiene logs por módulo
   * @param {string} module - Nombre del módulo
   * @param {Object} options - Opciones de consulta
   * @returns {Promise<Array>} Lista de logs
   */
  static async getLogsByModule(module, options = {}) {
    return this.getLogs({ module }, options);
  }

  /**
   * Obtiene logs por entidad específica
   * @param {string} entityType - Tipo de entidad
   * @param {string} entityId - ID de la entidad
   * @param {Object} options - Opciones de consulta
   * @returns {Promise<Array>} Lista de logs
   */
  static async getLogsByEntity(entityType, entityId, options = {}) {
    return this.getLogs({ entityType, entityId }, options);
  }

  /**
   * Obtiene logs críticos (eliminaciones)
   * @param {Object} options - Opciones de consulta
   * @returns {Promise<Array>} Lista de logs críticos
   */
  static async getCriticalLogs(options = {}) {
    return this.getLogs({ isCritical: true }, options);
  }

  /**
   * Obtiene estadísticas de auditoría
   * @param {number} daysBack - Días hacia atrás para las estadísticas
   * @returns {Promise<Object>} Estadísticas
   */
  static async getStatistics(daysBack = 7) {
    try {
      const query = `CALL sp_audit_get_statistics(?)`;
      const [results] = await db.query(query, [daysBack]);
      return results[0][0];
    } catch (error) {
      console.error('❌ Error al obtener estadísticas:', error);
      throw error;
    }
  }

  /**
   * Obtiene actividad por módulo
   * @param {number} daysBack - Días hacia atrás
   * @returns {Promise<Array>} Actividad por módulo
   */
  static async getActivityByModule(daysBack = 7) {
    try {
      const query = `
        SELECT 
          module,
          action,
          COUNT(*) as count,
          DATE(created_at) as date
        FROM audit_logs
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY module, action, DATE(created_at)
        ORDER BY date DESC, count DESC
      `;

      const [activity] = await db.query(query, [daysBack]);
      return activity;
    } catch (error) {
      console.error('❌ Error al obtener actividad por módulo:', error);
      throw error;
    }
  }

  /**
   * Obtiene usuarios más activos
   * @param {number} daysBack - Días hacia atrás
   * @param {number} limit - Cantidad de usuarios
   * @returns {Promise<Array>} Usuarios más activos
   */
  static async getMostActiveUsers(daysBack = 7, limit = 10) {
    try {
      const query = `
        SELECT 
          user_id,
          user_name,
          user_email,
          COUNT(*) as action_count,
          MAX(created_at) as last_activity
        FROM audit_logs
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
          AND user_id IS NOT NULL
        GROUP BY user_id, user_name, user_email
        ORDER BY action_count DESC
        LIMIT ?
      `;

      const [users] = await db.query(query, [daysBack, limit]);
      return users;
    } catch (error) {
      console.error('❌ Error al obtener usuarios activos:', error);
      throw error;
    }
  }

  /**
   * Obtiene alertas críticas pendientes
   * @returns {Promise<Array>} Alertas pendientes
   */
  static async getCriticalAlerts() {
    try {
      const query = `
        SELECT 
          aca.*,
          al.user_name,
          al.module,
          al.entity_type,
          al.entity_id,
          al.created_at as log_created_at
        FROM audit_critical_alerts aca
        INNER JOIN audit_logs al ON aca.log_id = al.id
        WHERE aca.notified = FALSE
        ORDER BY aca.created_at DESC
      `;

      const [alerts] = await db.query(query);
      return alerts;
    } catch (error) {
      console.error('❌ Error al obtener alertas críticas:', error);
      throw error;
    }
  }

  /**
   * Marca una alerta como notificada
   * @param {number} alertId - ID de la alerta
   * @returns {Promise<boolean>} Éxito
   */
  static async markAlertAsNotified(alertId) {
    try {
      const query = `
        UPDATE audit_critical_alerts
        SET notified = TRUE, notified_at = NOW()
        WHERE id = ?
      `;

      await db.query(query, [alertId]);
      return true;
    } catch (error) {
      console.error('❌ Error al marcar alerta como notificada:', error);
      return false;
    }
  }

  /**
   * Exporta logs a formato CSV
   * @param {Object} filters - Filtros de búsqueda
   * @returns {Promise<string>} Datos en formato CSV
   */
  static async exportToCSV(filters = {}) {
    try {
      const { logs } = await this.getLogs(filters, { limit: 10000 });

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
        log.action,
        log.module,
        log.entity_type || 'N/A',
        log.entity_id || 'N/A',
        log.ip_address || 'N/A',
        log.method || 'N/A',
        log.url || 'N/A',
        log.status_code || 'N/A',
        log.duration_ms || 'N/A',
        log.is_critical ? 'SÍ' : 'NO'
      ]);

      const csv = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      return csv;
    } catch (error) {
      console.error('❌ Error al exportar logs:', error);
      throw error;
    }
  }

  /**
   * Obtiene módulos disponibles
   * @returns {Promise<Array>} Lista de módulos
   */
  static async getAvailableModules() {
    try {
      const query = `
        SELECT DISTINCT module
        FROM audit_logs
        ORDER BY module
      `;

      const [modules] = await db.query(query);
      return modules.map(m => m.module);
    } catch (error) {
      console.error('❌ Error al obtener módulos:', error);
      return [];
    }
  }

  /**
   * Obtiene acciones disponibles
   * @returns {Promise<Array>} Lista de acciones
   */
  static async getAvailableActions() {
    try {
      const query = `
        SELECT DISTINCT action
        FROM audit_logs
        ORDER BY action
      `;

      const [actions] = await db.query(query);
      return actions.map(a => a.action);
    } catch (error) {
      console.error('❌ Error al obtener acciones:', error);
      return [];
    }
  }

  /**
   * Obtiene lista de usuarios con actividad en logs
   * @returns {Promise<Array>} Lista de usuarios con su información
   */
  static async getAvailableUsers() {
    try {
      const query = `
        SELECT DISTINCT 
          user_id as id,
          user_name as username,
          user_email as email,
          COUNT(*) as total_logs
        FROM audit_logs
        WHERE user_id IS NOT NULL
        GROUP BY user_id, user_name, user_email
        ORDER BY total_logs DESC, user_name ASC
      `;

      const [users] = await db.query(query);
      return users || [];
    } catch (error) {
      console.error('❌ Error al obtener usuarios:', error);
      return [];
    }
  }
}

module.exports = AuditLogModel;
