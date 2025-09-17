const winston = require('winston');
const expressWinston = require('express-winston');
const { createLogger, format, transports } = winston;

/**
 * Configuración de logging y monitoreo
 */
const monitoringMiddleware = {
  // Logger para requests HTTP
  requestLogger: expressWinston.logger({
    transports: [
      new transports.Console({
        format: format.combine(
          format.colorize(),
          format.timestamp(),
          format.printf(({ level, message, timestamp, meta }) => {
            return `${timestamp} ${level}: ${message} ${meta.responseTime}ms`;
          })
        )
      }),
      new transports.File({
        filename: 'logs/requests.log',
        format: format.combine(
          format.timestamp(),
          format.json()
        )
      })
    ],
    meta: true,
    msg: "HTTP {{req.method}} {{req.url}}",
    expressFormat: true,
    colorize: true,
    ignoreRoute: (req) => {
      // Ignorar rutas de health check y assets estáticos
      return req.url.startsWith('/health') || 
             req.url.startsWith('/static') ||
             req.url.startsWith('/favicon.ico');
    }
  }),

  // Logger para errores
  errorLogger: expressWinston.errorLogger({
    transports: [
      new transports.Console({
        format: format.combine(
          format.colorize(),
          format.timestamp(),
          format.printf(({ level, message, timestamp, meta }) => {
            return `${timestamp} ${level}: ${message} - ${meta.stack || meta.message}`;
          })
        )
      }),
      new transports.File({ 
        filename: 'logs/errors.log',
        format: format.combine(
          format.timestamp(),
          format.json()
        )
      })
    ]
  }),

  // Métricas básicas de performance
  performanceMonitor: (req, res, next) => {
    const start = process.hrtime();

    res.on('finish', () => {
      const diff = process.hrtime(start);
      const time = diff[0] * 1e3 + diff[1] * 1e-6; // Convertir a milisegundos
      
      // Registrar métricas de performance
      const metrics = {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        responseTime: time.toFixed(2),
        timestamp: new Date().toISOString()
      };

      // Log de métricas
      const logger = createLogger({
        format: format.combine(
          format.timestamp(),
          format.json()
        ),
        transports: [
          new transports.File({ filename: 'logs/metrics.log' })
        ]
      });

      logger.info('Request metrics', metrics);

      // Agregar headers de timing si es una API request
      if (req.path.startsWith('/api/') && !res.headersSent) {
        try {
          res.setHeader('X-Response-Time', `${time.toFixed(2)}ms`);
        } catch (error) {
          // Ignorar si no se pueden establecer headers
        }
      }
    });

    next();
  },

  // Monitor de memoria y CPU
  systemMonitor: () => {
    setInterval(() => {
      const metrics = {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      };

      // Log de métricas del sistema
      const logger = createLogger({
        format: format.combine(
          format.timestamp(),
          format.json()
        ),
        transports: [
          new transports.File({ filename: 'logs/system.log' })
        ]
      });

      logger.info('System metrics', metrics);
    }, 60000); // Cada minuto
  },

  // Dashboard de monitoreo (opcional)
  setupMonitoringDashboard: (app) => {
    if (process.env.ENABLE_MONITORING_DASHBOARD === 'true') {
      const expressStatusMonitor = require('express-status-monitor');
      app.use(expressStatusMonitor({
        title: 'Estado del Sistema',
        path: '/status',
        spans: [{
          interval: 1,     // Cada segundo
          retention: 60    // Mantener 60 datos
        }, {
          interval: 5,     // Cada 5 segundos
          retention: 60
        }, {
          interval: 15,    // Cada 15 segundos
          retention: 60
        }]
      }));
    }
  }
};

module.exports = monitoringMiddleware;
