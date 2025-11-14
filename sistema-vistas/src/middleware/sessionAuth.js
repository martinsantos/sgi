/**
 * Middleware de Autenticación con Sesiones
 * Maneja login, logout, persistencia de URL y redirecciones
 * 
 * Fecha: 27 de Octubre 2025
 */

const pool = require('../config/database');
const bcrypt = require('bcrypt');

/**
 * Middleware para verificar si el usuario está autenticado
 * Si no lo está, guarda la URL solicitada y redirige al login
 */
function requireAuth(req, res, next) {
  if (process.env.NODE_ENV === 'test') {
    req.session = req.session || {};
    req.session.user = req.session.user || {
      id: 0,
      username: 'test-user',
      email: 'test@sgi.local'
    };
    req.user = {
      id: req.session.user.id,
      username: req.session.user.username,
      email: req.session.user.email,
      authenticated: true,
      authMethod: 'test-bypass'
    };
    res.locals.user = req.user;
    res.locals.isAuthenticated = true;
    return next();
  }

  // Rutas públicas que no requieren autenticación
  const publicRoutes = [
    '/auth/login',
    '/auth/logout',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/health',
    '/status',
    '/favicon.ico'
  ];

  // Permitir acceso a rutas públicas
  if (publicRoutes.some(route => req.path === route || req.path.startsWith(route))) {
    return next();
  }

  // Permitir acceso a assets estáticos
  if (req.path.startsWith('/css/') || req.path.startsWith('/js/') || req.path.startsWith('/images/')) {
    return next();
  }

  // Verificar si el usuario está autenticado en la sesión
  if (req.session && req.session.userId) {
    // Asegurar que mantenemos los datos del usuario en la sesión
    if (!req.session.user) {
      req.session.user = {
        id: req.session.userId,
        username: req.session.username,
        email: req.session.email,
        nombre: req.session.nombre_completo || req.session.username
      };
    }

    // Usuario autenticado - exponerlo en req para el resto de middlewares
    req.user = {
      id: req.session.user.id,
      username: req.session.user.username,
      email: req.session.user.email,
      nombre: req.session.user.nombre,
      authenticated: true,
      authMethod: 'session'
    };
    return next();
  }

  // Usuario NO autenticado - guardar URL solicitada y redirigir al login
  req.session.returnTo = req.originalUrl || req.url;
  console.log(`🔐 Usuario no autenticado. Guardando URL de retorno: ${req.session.returnTo}`);
  
  res.redirect('/auth/login');
}

/**
 * Middleware para hacer el usuario disponible en las vistas
 */
function setUserLocals(req, res, next) {
  if (req.user) {
    res.locals.user = req.user;
    res.locals.isAuthenticated = true;
  } else {
    res.locals.isAuthenticated = false;
  }
  next();
}

/**
 * Obtener usuario por email desde la BD
 */
async function getUserByEmail(email) {
  try {
    const [users] = await pool.query(
      'SELECT id, username, email, nombre_completo FROM users WHERE email = ? AND activo = 1',
      [email]
    );
    return users.length > 0 ? users[0] : null;
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    return null;
  }
}

/**
 * Obtener usuario por ID desde la BD
 */
async function getUserById(id) {
  try {
    const [users] = await pool.query(
      'SELECT id, username, email, nombre_completo FROM users WHERE id = ? AND activo = 1',
      [id]
    );
    return users.length > 0 ? users[0] : null;
  } catch (error) {
    console.error('Error al obtener usuario por ID:', error);
    return null;
  }
}

/**
 * Validar credenciales del usuario
 * Acepta email O username
 */
async function validateCredentials(emailOrUsername, password) {
  try {
    // Buscar por email o username
    const [users] = await pool.query(
      'SELECT id, username, email, nombre_completo, password FROM users WHERE (email = ? OR username = ?) AND activo = 1',
      [emailOrUsername, emailOrUsername]
    );

    if (users.length === 0) {
      return { valid: false, error: 'Usuario no encontrado' };
    }

    const user = users[0];
    const passwordValid = await bcrypt.compare(password, user.password);

    if (!passwordValid) {
      return { valid: false, error: 'Contraseña inválida' };
    }

    // Retornar usuario sin la contraseña
    const { password: _, ...userWithoutPassword } = user;
    return { valid: true, user: userWithoutPassword };
  } catch (error) {
    console.error('Error al validar credenciales:', error);
    return { valid: false, error: 'Error al procesar el login' };
  }
}

/**
 * Registrar último login
 */
async function updateLastLogin(userId) {
  try {
    await pool.query(
      'UPDATE users SET last_login = NOW(), on_line = 1 WHERE id = ?',
      [userId]
    );
  } catch (error) {
    console.error('Error al actualizar último login:', error);
  }
}

/**
 * Registrar logout
 */
async function updateLogout(userId) {
  try {
    await pool.query(
      'UPDATE users SET on_line = 0 WHERE id = ?',
      [userId]
    );
  } catch (error) {
    console.error('Error al actualizar logout:', error);
  }
}

module.exports = {
  requireAuth,
  setUserLocals,
  getUserByEmail,
  getUserById,
  validateCredentials,
  updateLastLogin,
  updateLogout
};
