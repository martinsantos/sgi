const rateLimit = require('express-rate-limit');

// Límites por defecto
const defaultLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // límite por IP
  message: {
    success: false,
    error: {
      message: 'Demasiadas solicitudes',
      details: 'Por favor, intente nuevamente más tarde'
    }
  }
});

// Límites más estrictos para endpoints críticos
const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 30, // límite por IP
  message: {
    success: false,
    error: {
      message: 'Demasiadas solicitudes',
      details: 'Ha excedido el límite de solicitudes permitidas'
    }
  }
});

// Límites para la API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300, // límite por IP
  message: {
    success: false,
    error: {
      message: 'Límite de API excedido',
      details: 'Ha excedido el límite de solicitudes a la API'
    }
  }
});

module.exports = {
  defaultLimiter,
  strictLimiter,
  apiLimiter
};
