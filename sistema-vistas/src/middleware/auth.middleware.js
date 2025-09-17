const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Acceso no autorizado'
        }
      });
    }

    // Verify token
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
    
    // Add user info to request
    req.user = decoded;
    
    next();
  } catch (error) {
    console.error('Error de autenticación:', error);
    return res.status(401).json({
      success: false,
      error: {
        message: 'Token inválido'
      }
    });
  }
}

module.exports = authMiddleware;
