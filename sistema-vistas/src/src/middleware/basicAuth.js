/**
 * Middleware de Autenticación HTTP Basic para SGI
 * Implementación simple y segura
 */

// Credenciales de acceso
const CREDENTIALS = {
  'admin': 'sgi2025!admin',
  'ultimamilla': 'SGI@2025!UM'
};

function basicAuth(req, res, next) {
  // Rutas públicas que no requieren autenticación
  const publicRoutes = ['/health', '/status', '/favicon.ico'];
  
  if (publicRoutes.some(route => req.path.startsWith(route))) {
    return next();
  }
  
  // Obtener header de autorización
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    // Solicitar autenticación
    res.set('WWW-Authenticate', 'Basic realm="SGI - Sistema de Gestión Integral"');
    res.status(401).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Acceso Requerido - SGI</title>
        <meta charset="UTF-8">
      </head>
      <body style="font-family: Arial, sans-serif; text-align: center; margin-top: 100px;">
        <h1>🔐 Sistema de Gestión Integral</h1>
        <p>Se requiere autenticación para acceder al sistema.</p>
        <p><strong>Credenciales requeridas</strong></p>
        <small>Ultima Milla - SGI 2025</small>
      </body>
      </html>
    `);
    return;
  }
  
  // Decodificar credenciales
  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');
  
  // Verificar credenciales
  if (CREDENTIALS[username] && CREDENTIALS[username] === password) {
    // Credenciales válidas - agregar usuario a la request
    req.user = {
      username: username,
      authenticated: true,
      authMethod: 'basic'
    };
    
    // Log de acceso exitoso
    console.log(`🔐 Acceso autorizado: ${username} - ${req.method} ${req.path} - ${req.ip}`);
    
    next();
  } else {
    // Credenciales inválidas
    console.log(`❌ Acceso denegado: ${username || 'unknown'} - ${req.ip}`);
    
    res.set('WWW-Authenticate', 'Basic realm="SGI - Sistema de Gestión Integral"');
    res.status(401).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Acceso Denegado - SGI</title>
        <meta charset="UTF-8">
      </head>
      <body style="font-family: Arial, sans-serif; text-align: center; margin-top: 100px; color: #d32f2f;">
        <h1>❌ Acceso Denegado</h1>
        <p>Las credenciales proporcionadas no son válidas.</p>
        <p>Verifique su usuario y contraseña.</p>
        <small>Ultima Milla - SGI 2025</small>
      </body>
      </html>
    `);
  }
}

module.exports = basicAuth;
