/**
 * ============================================================================
 * RUTAS DE AUDITORÍA
 * ============================================================================
 * Define todas las rutas para el módulo de logs de auditoría
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const AuditController = require('../controllers/auditController');

// ============================================================================
// RUTAS DE VISTAS
// ============================================================================

// Vista principal - Listado de logs
router.get('/', AuditController.index);

// Dashboard de estadísticas
router.get('/statistics', AuditController.statistics);

// Alertas críticas
router.get('/alerts', AuditController.criticalAlerts);

// Exportar logs a CSV
router.get('/export/csv', AuditController.exportCSV);

// Marcar alerta como leída
router.post('/alerts/:id/mark-read', AuditController.markAlertRead);

// ============================================================================
// API ENDPOINTS (JSON)
// ============================================================================

// API: Obtener logs
router.get('/api/logs', AuditController.apiGetLogs);

// API: Obtener estadísticas
router.get('/api/statistics', AuditController.apiGetStatistics);

// API: Obtener alertas críticas
router.get('/api/alerts', AuditController.apiGetCriticalAlerts);

// API: Obtener actividad por módulo
router.get('/api/activity/module', AuditController.apiGetActivityByModule);

// API: Obtener usuarios activos
router.get('/api/users/active', AuditController.apiGetActiveUsers);

// Logs por usuario
router.get('/user/:userId', AuditController.byUser);

// Logs por módulo
router.get('/module/:module', AuditController.byModule);

// Timeline de una entidad
router.get('/timeline/:entityType/:entityId', AuditController.entityTimeline);

// Detalle de un log específico (rutas genéricas al final)
router.get('/:id', AuditController.detail);

module.exports = router;
