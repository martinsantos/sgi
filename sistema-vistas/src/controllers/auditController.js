/**
 * ============================================================================
 * CONTROLADOR DE AUDITORÍA
 * ============================================================================
 * Gestiona todas las operaciones de consulta y visualización de logs
 * ============================================================================
 */

const AuditLogModel = require('../models/AuditLogModel');

class AuditController {
  
  /**
   * Vista principal - Listado de logs con filtros
   */
  static async index(req, res) {
    try {
      const {
        page = 1,
        limit = 50,
        module,
        action,
        userId,
        startDate,
        endDate,
        search,
        sortBy = 'created_at',
        sortOrder = 'DESC',
        myActivity = false
      } = req.query;

      // Detectar si es usuario admin (ultima milla)
      const isAdmin = req.session.user?.email === 'santosma@gmail.com' || 
                      req.session.user?.username === 'ultima milla';
      
      console.log(`👤 Usuario: ${req.session.user?.username} (${req.session.user?.email}) - Admin: ${isAdmin}`);

      // Construir filtros
      const filters = {};
      
      // Si es "Mis actividades", filtrar automáticamente por usuario autenticado
      if (myActivity === 'true' || myActivity === true) {
        filters.userId = req.session.user?.id;
        console.log(`📊 Filtrando logs por usuario autenticado: ${req.session.user?.id}`);
      } else if (userId && isAdmin) {
        // Si se especifica un userId en query, usarlo (solo si es admin)
        filters.userId = userId;
        console.log(`📊 [ADMIN] Filtrando logs por usuario especificado: ${userId}`);
      } else if (userId && !isAdmin) {
        // Usuario no-admin intenta filtrar por otro usuario - rechazar
        console.log(`⚠️ Usuario no-admin intenta filtrar por otro usuario: ${userId}`);
      }
      
      if (module) filters.module = module;
      if (action) filters.action = action;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      if (search) filters.search = search;

      // Obtener logs
      const result = await AuditLogModel.getLogs(filters, {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder
      });

      // Obtener opciones para filtros
      const modules = await AuditLogModel.getAvailableModules();
      const actions = await AuditLogModel.getAvailableActions();

      // Obtener lista de usuarios (solo para admin)
      let users = [];
      if (isAdmin) {
        try {
          users = await AuditLogModel.getAvailableUsers();
          console.log(`📋 Cargando lista de ${users.length} usuarios para admin`);
        } catch (err) {
          console.error('❌ Error al cargar usuarios:', err);
          users = [];
        }
      }

      res.render('logs/index', {
        title: 'Auditoría del Sistema',
        logs: result.logs,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        },
        filters: {
          module,
          action,
          userId,
          startDate,
          endDate,
          search,
          myActivity: myActivity === 'true' || myActivity === true
        },
        modules,
        actions,
        users,
        isAdmin,
        user: req.session.user
      });
    } catch (error) {
      console.error('❌ Error en index de auditoría:', error);
      res.status(500).render('error', {
        message: 'Error al cargar logs de auditoría',
        error: process.env.NODE_ENV === 'development' ? error : {}
      });
    }
  }

  /**
   * Detalle de un log específico
   */
  static async detail(req, res) {
    try {
      const { id } = req.params;
      const log = await AuditLogModel.getLogById(id);

      if (!log) {
        return res.status(404).render('error', {
          message: 'Log no encontrado',
          error: {}
        });
      }

      res.render('logs/detail', {
        title: 'Detalle de Log',
        log,
        user: req.session.user
      });
    } catch (error) {
      console.error('❌ Error al obtener detalle de log:', error);
      res.status(500).render('error', {
        message: 'Error al cargar detalle del log',
        error: process.env.NODE_ENV === 'development' ? error : {}
      });
    }
  }

  /**
   * Dashboard de estadísticas
   */
  static async statistics(req, res) {
    try {
      const { days = 7 } = req.query;
      const daysBack = parseInt(days);

      // Obtener estadísticas generales
      const stats = await AuditLogModel.getStatistics(daysBack);

      // Obtener actividad por módulo
      const activityByModule = await AuditLogModel.getActivityByModule(daysBack);

      // Obtener usuarios más activos
      const activeUsers = await AuditLogModel.getMostActiveUsers(daysBack, 10);

      // Obtener logs críticos recientes
      const criticalLogs = await AuditLogModel.getCriticalLogs({ limit: 20 });
      
      // Calcular tiempo uptime del sistema
      const uptime = process.uptime();
      const uptimeDays = Math.floor(uptime / 86400);
      const uptimeHours = Math.floor((uptime % 86400) / 3600);
      const uptimeMinutes = Math.floor((uptime % 3600) / 60);
      const uptimeFormatted = `${uptimeDays}d ${uptimeHours}h ${uptimeMinutes}m`;
      
      // Obtener fecha del último reinicio
      const lastRestart = new Date(Date.now() - uptime * 1000);
      
      // Contar incidencias críticas (errores 500, eliminaciones, etc)
      const incidentsCount = (criticalLogs && criticalLogs.total) ? criticalLogs.total : 0;

      res.render('logs/statistics', {
        title: 'Estadísticas de Auditoría',
        stats: stats || {},
        activityByModule: activityByModule || [],
        activeUsers: activeUsers || [],
        criticalLogs: (criticalLogs && criticalLogs.logs) ? criticalLogs.logs : [],
        daysBack: daysBack || 7,
        uptime: uptimeFormatted || '0d 0h 0m',
        uptimeSeconds: Math.floor(uptime) || 0,
        lastRestart: lastRestart || new Date(),
        incidentsCount: incidentsCount,
        user: req.session.user
      });
    } catch (error) {
      console.error('❌ Error al obtener estadísticas:', error);
      res.status(500).render('error', {
        message: 'Error al cargar estadísticas',
        error: process.env.NODE_ENV === 'development' ? error : {}
      });
    }
  }

  /**
   * Logs por usuario específico - Redirige a index con filtro
   */
  static async byUser(req, res) {
    try {
      const { userId } = req.params;
      const { page = 1 } = req.query;
      res.redirect(`/logs?userId=${userId}&page=${page}`);
    } catch (error) {
      console.error('❌ Error al redirigir logs por usuario:', error);
      res.redirect('/logs');
    }
  }

  /**
   * Logs por módulo específico - Redirige a index con filtro
   */
  static async byModule(req, res) {
    try {
      const { module } = req.params;
      const { page = 1 } = req.query;
      res.redirect(`/logs?module=${module}&page=${page}`);
    } catch (error) {
      console.error('❌ Error al redirigir logs por módulo:', error);
      res.redirect('/logs');
    }
  }

  /**
   * Timeline de actividad de una entidad
   */
  static async entityTimeline(req, res) {
    try {
      const { entityType, entityId } = req.params;
      const { page = 1, limit = 50 } = req.query;

      const result = await AuditLogModel.getLogsByEntity(entityType, entityId, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.render('logs/timeline', {
        title: `Timeline de ${entityType} #${entityId}`,
        logs: result.logs,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        },
        entityType,
        entityId,
        user: req.session.user
      });
    } catch (error) {
      console.error('❌ Error al obtener timeline:', error);
      res.status(500).render('error', {
        message: 'Error al cargar timeline',
        error: process.env.NODE_ENV === 'development' ? error : {}
      });
    }
  }

  /**
   * Exportar logs a CSV
   */
  static async exportCSV(req, res) {
    try {
      const {
        module,
        action,
        userId,
        startDate,
        endDate,
        search
      } = req.query;

      // Construir filtros
      const filters = {};
      if (module) filters.module = module;
      if (action) filters.action = action;
      if (userId) filters.userId = userId;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      if (search) filters.search = search;

      // Generar CSV
      const csv = await AuditLogModel.exportToCSV(filters);

      // Configurar headers para descarga
      const filename = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      // Enviar CSV
      res.send('\uFEFF' + csv); // BOM para UTF-8
    } catch (error) {
      console.error('❌ Error al exportar logs:', error);
      res.status(500).json({
        success: false,
        message: 'Error al exportar logs'
      });
    }
  }

  /**
   * Alertas críticas
   */
  static async criticalAlerts(req, res) {
    try {
      const alerts = await AuditLogModel.getCriticalAlerts();

      res.render('logs/alerts', {
        title: 'Alertas Críticas',
        alerts,
        user: req.session.user
      });
    } catch (error) {
      console.error('❌ Error al obtener alertas críticas:', error);
      res.status(500).render('error', {
        message: 'Error al cargar alertas',
        error: process.env.NODE_ENV === 'development' ? error : {}
      });
    }
  }

  /**
   * Marcar alerta como vista
   */
  static async markAlertRead(req, res) {
    try {
      const { id } = req.params;
      const success = await AuditLogModel.markAlertAsNotified(id);

      res.json({ success });
    } catch (error) {
      console.error('❌ Error al marcar alerta:', error);
      res.status(500).json({
        success: false,
        message: 'Error al marcar alerta'
      });
    }
  }

  // ============================================================================
  // API ENDPOINTS - Para consultas desde JavaScript
  // ============================================================================

  /**
   * API: Obtener logs (JSON)
   */
  static async apiGetLogs(req, res) {
    try {
      const {
        page = 1,
        limit = 50,
        module,
        action,
        userId,
        startDate,
        endDate,
        search,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;

      const filters = {};
      if (module) filters.module = module;
      if (action) filters.action = action;
      if (userId) filters.userId = userId;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      if (search) filters.search = search;

      const result = await AuditLogModel.getLogs(filters, {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('❌ Error en API getLogs:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener logs'
      });
    }
  }

  /**
   * API: Obtener estadísticas (JSON)
   */
  static async apiGetStatistics(req, res) {
    try {
      const { days = 7 } = req.query;
      const stats = await AuditLogModel.getStatistics(parseInt(days));

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('❌ Error en API getStatistics:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas'
      });
    }
  }

  /**
   * API: Obtener alertas críticas (JSON)
   */
  static async apiGetCriticalAlerts(req, res) {
    try {
      const alerts = await AuditLogModel.getCriticalAlerts();

      res.json({
        success: true,
        data: alerts,
        count: alerts.length
      });
    } catch (error) {
      console.error('❌ Error en API getCriticalAlerts:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener alertas'
      });
    }
  }

  /**
   * API: Obtener actividad por módulo (JSON)
   */
  static async apiGetActivityByModule(req, res) {
    try {
      const { days = 7 } = req.query;
      const activity = await AuditLogModel.getActivityByModule(parseInt(days));

      res.json({
        success: true,
        data: activity
      });
    } catch (error) {
      console.error('❌ Error en API getActivityByModule:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener actividad'
      });
    }
  }

  /**
   * API: Obtener usuarios más activos (JSON)
   */
  static async apiGetActiveUsers(req, res) {
    try {
      const { days = 7, limit = 10 } = req.query;
      const users = await AuditLogModel.getMostActiveUsers(
        parseInt(days), 
        parseInt(limit)
      );

      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      console.error('❌ Error en API getActiveUsers:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener usuarios activos'
      });
    }
  }
}

module.exports = AuditController;
