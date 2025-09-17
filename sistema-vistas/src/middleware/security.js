const helmet = require('helmet');
const cors = require('cors');

/**
 * Configuración de seguridad para la aplicación
 */
const securityMiddleware = {
  // Headers de seguridad básicos con Helmet
  baseSecurityHeaders: helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", 'https:', 'data:'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: "same-site" },
    dnsPrefetchControl: true,
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true
  }),

  // Configuración CORS
  corsOptions: cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:8080',
        process.env.FRONTEND_URL
      ].filter(Boolean);

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('No permitido por CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    credentials: true,
    maxAge: 86400 // 24 horas
  }),

  // Prevención de ataques de fuerza bruta
  bruteForceProtection: {
    freeRetries: 5, // Intentos permitidos
    minWait: 5 * 60 * 1000, // 5 minutos
    maxWait: 60 * 60 * 1000, // 1 hora
    failCallback: (req, res, next, nextValidRequestDate) => {
      res.status(429).json({
        success: false,
        error: {
          message: 'Demasiados intentos',
          details: `Intente nuevamente después de ${nextValidRequestDate}`
        }
      });
    }
  },

  // Validación de datos de entrada
  sanitizeRequest: (req, res, next) => {
    // Sanitizar parámetros de URL
    if (req.params) {
      Object.keys(req.params).forEach(key => {
        req.params[key] = req.params[key].replace(/[<>]/g, '');
      });
    }

    // Sanitizar query strings
    if (req.query) {
      Object.keys(req.query).forEach(key => {
        if (typeof req.query[key] === 'string') {
          req.query[key] = req.query[key].replace(/[<>]/g, '');
        }
      });
    }

    // Sanitizar body en solicitudes POST/PUT
    if (req.body && typeof req.body === 'object') {
      const sanitizeObj = (obj) => {
        Object.keys(obj).forEach(key => {
          if (typeof obj[key] === 'string') {
            obj[key] = obj[key].replace(/[<>]/g, '');
          } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            sanitizeObj(obj[key]);
          }
        });
      };
      sanitizeObj(req.body);
    }

    next();
  },

  // Verificación de API key para clientes externos
  validateApiKey: (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'API key requerida',
          details: 'Debe proporcionar una API key válida'
        }
      });
    }

    // Verificar API key contra lista blanca o base de datos
    const isValidApiKey = process.env.API_KEYS?.split(',').includes(apiKey);
    
    if (!isValidApiKey) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'API key inválida',
          details: 'La API key proporcionada no es válida'
        }
      });
    }

    next();
  }
};

module.exports = securityMiddleware;
