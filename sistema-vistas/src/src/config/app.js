const express = require('express');
const cors = require('cors');
const { errorHandler, notFoundHandler } = require('../middleware/error-handler');
const SecurityMiddleware = require('../middleware/security');
const MonitoringMiddleware = require('../middleware/monitoring');

// Importar rutas
const clientesRoutes = require('../routes/clientes.routes');
const presupuestosRoutes = require('../routes/presupuestos');
const facturasRoutes = require('../routes/facturas.routes');
const healthRoutes = require('../routes/health.routes');

class App {
  constructor() {
    this.app = express();
    this.config();
    this.routes();
    this.errorHandling();
  }

  config() {
    // Basic middleware
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(cors());

    // Security middleware
    this.app.use(SecurityMiddleware.baseSecurityHeaders);
    this.app.use(SecurityMiddleware.corsOptions);
    this.app.use(SecurityMiddleware.sanitizeRequest);

    // Monitoring middleware
    if (process.env.NODE_ENV !== 'test') {
      this.app.use(MonitoringMiddleware.requestLogger);
      this.app.use(MonitoringMiddleware.performanceMonitor);
      MonitoringMiddleware.systemMonitor();
      MonitoringMiddleware.setupMonitoringDashboard(this.app);
    }
  }

routes() {
    // Debug route
    this.app.get('/debug/routes', (req, res) => {
      const routes = [];
      this.app._router.stack.forEach(middleware => {
        if (middleware.route) { 
          routes.push({
            path: middleware.route.path,
            methods: Object.keys(middleware.route.methods)
          });
        } else if (middleware.name === 'router') { 
          middleware.handle.stack.forEach(handler => {
            if (handler.route) {
              routes.push({
                path: handler.route.path,
                methods: Object.keys(handler.route.methods)
              });
            }
          });
        }
      });
      res.json(routes);
    });

    // API routes
    this.app.use('/presupuestos', presupuestosRoutes);
    this.app.use('/clientes', clientesRoutes);
    this.app.use('/facturas', facturasRoutes);
    
    // Health check routes
    this.app.use('/health', healthRoutes);

    // Root route
    this.app.get('/', (req, res) => {
      res.json({
        status: 'ok',
        message: 'Sistema de Gestión Integral',
        version: process.env.npm_package_version || '1.0.0'
      });
    });
  }

  errorHandling() {
    // Handle 404s
    this.app.use(notFoundHandler);
    
    // Handle all other errors
    this.app.use(errorHandler);
  }

  getApp() {
    return this.app;
  }

  listen() {
    const port = process.env.PORT || 3456;
    this.app.listen(port, () => {
      console.log(`✅ Server is running on port ${port}`);
    });
  }
}

module.exports = App;
