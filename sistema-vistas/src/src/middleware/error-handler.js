/**
 * Error handler para errores no capturados
 */
const errorHandler = (err, req, res, next) => {
  console.error('❌ Error no controlado:', err);

  // Si ya se envió una respuesta, pasamos al siguiente middleware
  if (res.headersSent) {
    return next(err);
  }

  // Determinar tipo de error y respuesta apropiada
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Error de validación',
        details: err.message
      }
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      error: {
        message: 'No autorizado',
        details: err.message
      }
    });
  }

  if (err.name === 'NotFoundError') {
    return res.status(404).json({
      success: false,
      error: {
        message: 'Recurso no encontrado',
        details: err.message
      }
    });
  }

  // Error por defecto - 500 Internal Server Error
  return res.status(500).json({
    success: false,
    error: {
      message: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? err.message : 'Ocurrió un error inesperado'
    }
  });
};

/**
 * Error handler para rutas no encontradas
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Ruta no encontrada',
      details: `La ruta ${req.method} ${req.url} no existe`
    }
  });
};

module.exports = {
  errorHandler,
  notFoundHandler
};
