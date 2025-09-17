const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/dashboardController');

/**
 * Rutas del Dashboard
 */

// Dashboard principal con todas las estadísticas
router.get('/', DashboardController.index);

// API endpoints para obtener estadísticas en tiempo real
router.get('/api/estadisticas', DashboardController.getEstadisticas);
router.get('/api/metricas/:tipo', DashboardController.getMetricas);

module.exports = router;
