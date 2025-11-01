/**
 * Rutas de Autenticación con Sesiones
 * Maneja login, logout, recuperación de contraseña
 * 
 * Fecha: 27 de Octubre 2025
 */

const express = require('express');
const router = express.Router();
const sessionAuth = require('../middleware/sessionAuth');

/**
 * GET /auth/login - Mostrar formulario de login
 */
router.get('/login', (req, res) => {
  // Si ya está autenticado, redirigir al dashboard
  if (req.session && req.session.userId) {
    return res.redirect('/dashboard');
  }

  // Mostrar formulario de login
  res.render('auth/login', {
    layout: 'main',
    title: 'Login - Sistema de Gestión Integral',
    returnTo: req.session.returnTo || '/dashboard'
  });
});

/**
 * POST /auth/login - Procesar login
 * Acepta email O username
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar que se proporcionaron email/username y contraseña
    if (!email || !password) {
      return res.render('auth/login', {
        layout: 'main',
        title: 'Login - Sistema de Gestión Integral',
        error: 'Usuario/Email y contraseña son requeridos',
        returnTo: req.session.returnTo || '/dashboard'
      });
    }

    // Validar credenciales (acepta email o username)
    const result = await sessionAuth.validateCredentials(email, password);

    if (!result.valid) {
      console.log(`❌ Login fallido para ${email}: ${result.error}`);
      return res.render('auth/login', {
        layout: 'main',
        title: 'Login - Sistema de Gestión Integral',
        error: result.error,
        returnTo: req.session.returnTo || '/dashboard'
      });
    }

    // Credenciales válidas - crear sesión
    const user = result.user;
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.email = user.email;
    req.session.nombre_completo = user.nombre_completo;

    // Registrar último login
    await sessionAuth.updateLastLogin(user.id);

    console.log(`✅ Login exitoso para ${email}`);

    // Obtener URL de retorno
    const returnTo = req.session.returnTo || '/dashboard';
    delete req.session.returnTo; // Limpiar la URL guardada

    // Redirigir a la URL original o al dashboard
    res.redirect(returnTo);

  } catch (error) {
    console.error('Error en login:', error);
    res.render('auth/login', {
      layout: 'main',
      title: 'Login - Sistema de Gestión Integral',
      error: 'Error al procesar el login',
      returnTo: req.session.returnTo || '/dashboard'
    });
  }
});

/**
 * GET /auth/logout - Cerrar sesión
 */
router.get('/logout', async (req, res) => {
  try {
    // Registrar logout
    if (req.session && req.session.userId) {
      await sessionAuth.updateLogout(req.session.userId);
      console.log(`🚪 Logout para ${req.session.email}`);
    }

    // Destruir sesión
    req.session.destroy((err) => {
      if (err) {
        console.error('Error al destruir sesión:', err);
      }
      res.redirect('/auth/login');
    });
  } catch (error) {
    console.error('Error en logout:', error);
    res.redirect('/auth/login');
  }
});

/**
 * GET /auth/forgot-password - Mostrar formulario de recuperación
 */
router.get('/forgot-password', (req, res) => {
  res.render('auth/forgot-password', {
    layout: 'main',
    title: 'Recuperar Contraseña - Sistema de Gestión Integral'
  });
});

/**
 * POST /auth/forgot-password - Procesar solicitud de recuperación
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.render('auth/forgot-password', {
        layout: 'main',
        title: 'Recuperar Contraseña - Sistema de Gestión Integral',
        error: 'Email es requerido'
      });
    }

    // Buscar usuario
    const user = await sessionAuth.getUserByEmail(email);

    if (!user) {
      // Por seguridad, no revelar si el email existe
      return res.render('auth/forgot-password', {
        layout: 'main',
        title: 'Recuperar Contraseña - Sistema de Gestión Integral',
        success: 'Si el email existe en el sistema, recibirás un correo con instrucciones'
      });
    }

    // TODO: Generar token de reset y enviar correo
    console.log(`📧 Solicitud de reset para ${email}`);

    res.render('auth/forgot-password', {
      layout: 'main',
      title: 'Recuperar Contraseña - Sistema de Gestión Integral',
      success: 'Si el email existe en el sistema, recibirás un correo con instrucciones'
    });

  } catch (error) {
    console.error('Error en forgot-password:', error);
    res.render('auth/forgot-password', {
      layout: 'main',
      title: 'Recuperar Contraseña - Sistema de Gestión Integral',
      error: 'Error al procesar la solicitud'
    });
  }
});

/**
 * GET /auth/reset-password/:token - Mostrar formulario de reset
 */
router.get('/reset-password/:token', (req, res) => {
  res.render('auth/reset-password', {
    layout: 'main',
    title: 'Resetear Contraseña - Sistema de Gestión Integral',
    token: req.params.token
  });
});

/**
 * POST /auth/reset-password - Procesar reset de contraseña
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password, passwordConfirm } = req.body;

    if (!token || !password || !passwordConfirm) {
      return res.render('auth/reset-password', {
        layout: 'main',
        title: 'Resetear Contraseña - Sistema de Gestión Integral',
        token,
        error: 'Todos los campos son requeridos'
      });
    }

    if (password !== passwordConfirm) {
      return res.render('auth/reset-password', {
        layout: 'main',
        title: 'Resetear Contraseña - Sistema de Gestión Integral',
        token,
        error: 'Las contraseñas no coinciden'
      });
    }

    // TODO: Validar token y actualizar contraseña
    console.log(`🔄 Reset de contraseña con token: ${token}`);

    res.render('auth/reset-password', {
      layout: 'main',
      title: 'Resetear Contraseña - Sistema de Gestión Integral',
      success: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error en reset-password:', error);
    res.render('auth/reset-password', {
      layout: 'main',
      title: 'Resetear Contraseña - Sistema de Gestión Integral',
      error: 'Error al procesar el reset'
    });
  }
});

module.exports = router;
