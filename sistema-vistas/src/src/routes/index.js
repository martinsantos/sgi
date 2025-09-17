const express = require('express');
const router = express.Router();

// Importar middleware
const { errorHandler, notFoundHandler } = require('../middleware/error-handler');
const { defaultLimiter } = require('../middleware/rate-limit');
const AuthMiddleware = require('../middleware/auth');
const SecurityMiddleware = require('../middleware/security');
const MonitoringMiddleware = require('../middleware/monitoring');

// Aplicar middleware de seguridad
router.use(SecurityMiddleware.baseSecurityHeaders);
router.use(SecurityMiddleware.corsOptions);
router.use(SecurityMiddleware.sanitizeRequest);

// Aplicar rate limiting global
router.use(defaultLimiter);

// Configurar monitoreo
router.use(MonitoringMiddleware.requestLogger);
router.use(MonitoringMiddleware.performanceMonitor);
MonitoringMiddleware.systemMonitor(); // Iniciar monitoreo del sistema

// Importar rutas
const clientesRoutes = require('./clientes.routes');
const presupuestosRoutes = require('./presupuestos.routes');
const facturasRoutes = require('./facturas.routes');

// Importar rutas de health check
const healthRoutes = require('./health.routes');

// Montar rutas en sus respectivos prefijos
router.use('/health', healthRoutes);
router.use('/api/clientes', clientesRoutes);
router.use('/api/presupuestos', presupuestosRoutes);
router.use('/api/facturas', facturasRoutes);

// Ruta raíz para verificar que la API está funcionando
router.get('/', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'API del Sistema de Gestión en funcionamiento',
    version: '1.0.0'
  });
});

// Manejo de errores y rutas no encontradas
router.use(notFoundHandler);
router.use(errorHandler);

module.exports = router;
