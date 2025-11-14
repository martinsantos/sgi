/**
 * ============================================================================
 * MIDDLEWARE DE AUDITORÍA - LOGGING AUTOMÁTICO
 * ============================================================================
 * Captura automáticamente todas las operaciones del sistema
 * Registra: CRUD, logins, vistas, exportaciones, y más
 * ============================================================================
 */

const AuditLogModel = require('../models/AuditLogModel');

/**
 * Lista de rutas que NO deben ser auditadas (para economizar espacio)
 */
const EXCLUDED_PATHS = [
  '/health',
  '/api/health',
  '/favicon.ico',
  '/assets/',
  '/css/',
  '/js/',
  '/images/',
  '/fonts/',
  '/logs/statistics',
  '/logs/alerts',
  '/logs/api',
  '/dashboard'
];

/**
 * Lista de rutas que NO deben registrar el body (contienen datos sensibles)
 * Aunque el usuario pidió reportar todo, algunas cosas como passwords no deben guardarse
 */
const SENSITIVE_PATHS = [
  '/auth/login',
  '/auth/change-password',
  '/api/auth/login'
];

/**
 * Mapeo de métodos HTTP a acciones de auditoría
 */
const METHOD_TO_ACTION = {
  'POST': 'CREATE',
  'PUT': 'UPDATE',
  'PATCH': 'UPDATE',
  'DELETE': 'DELETE',
  'GET': 'VIEW'
};

/**
 * Extrae el módulo de la URL
 * @param {string} path - Path de la request
 * @returns {string} - Nombre del módulo
 */
function extractModule(path) {
  // Eliminar /api/ si existe
  const cleanPath = path.replace('/api/', '/');
  
  // Extraer el primer segmento después de /
  const segments = cleanPath.split('/').filter(s => s.length > 0);
  
  if (segments.length === 0) return 'dashboard';
  
  const module = segments[0];
  
  // Mapear algunos módulos específicos
  const moduleMap = {
    'auth': 'autenticacion',
    'login': 'autenticacion',
    'logout': 'autenticacion',
    'dashboard': 'dashboard',
    'clientes': 'clientes',
    'facturas': 'facturas',
    'presupuestos': 'presupuestos',
    'proyectos': 'proyectos',
    'leads': 'leads',
    'certificados': 'certificados',
    'prospectos': 'prospectos',
    'logs': 'auditoria'
  };
  
  return moduleMap[module] || module;
}


/**
 * Obtiene el usuario almacenado en sesión, incluso si solo hay campos sueltos
 * @param {Object} req - Request de Express
 */
function getUserFromSession(req) {
  if (req?.session?.user) {
    return req.session.user;
  }

  if (req?.session?.userId) {
    return {
      id: req.session.userId,
      username: req.session.username,
      email: req.session.email,
      nombre: req.session.nombre_completo || req.session.username
    };
  }

  return null;
}

const IGNORED_SEGMENTS_FOR_ENTITY = new Set([
  'ver',
  'editar',
  'edit',
  'nuevo',
  'nuevo',
  'crear',
  'create',
  'detalle',
  'detalle',
  'index',
  'listado',
  'timeline',
  'export',
  'download',
  'api',
  'logs',
  'statistics',
  'alerts'
]);

const UUID_SEGMENT_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
const GENERIC_ID_REGEX = /^[A-Za-z0-9_-]{6,}$/;

/**
 * Extrae información de la entidad de la URL o body
 * @param {string} path - Path de la request
 * @param {Object} body - Body de la request
 * @returns {Object} - {entityType, entityId}
 */
function extractEntity(path, body = {}) {
  const segments = path.split('/').filter(s => s.length > 0);
  
  let entityType = null;
  let entityId = null;

  for (let i = segments.length - 1; i >= 0; i--) {
    const segment = segments[i];
    if (!segment) continue;

    const segmentLower = segment.toLowerCase();
    if (IGNORED_SEGMENTS_FOR_ENTITY.has(segmentLower)) {
      continue;
    }

    const isNumeric = /^\d+$/.test(segment);
    const isUuid = UUID_SEGMENT_REGEX.test(segment);
    const isGenericId = GENERIC_ID_REGEX.test(segment);

    if (isNumeric || isUuid || isGenericId) {
      entityId = segment;
      if (i > 0) {
        entityType = segments[i - 1].replace(/s$/, '');
      }
      break;
    }
  }
  
  // Si no hay ID en URL, buscar en el body
  if (!entityId && body.id) {
    entityId = body.id.toString();
  }
  
  // Si aún no tenemos entityType, usar el módulo
  if (!entityType) {
    entityType = extractModule(path);
  }
  
  return { entityType, entityId };
}

/**
 * Sanitiza datos sensibles del body
 * @param {Object} data - Datos a sanitizar
 * @returns {Object} - Datos sanitizados
 */
function sanitizeData(data) {
  if (!data || typeof data !== 'object') return data;
  
  const sensitiveFields = ['password', 'token', 'secret', 'api_key', 'apiKey'];
  const sanitized = { ...data };
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  }
  
  return sanitized;
}

/**
 * Determina si un path debe ser excluido del logging
 * @param {string} path - Path de la request
 * @returns {boolean}
 */
function shouldExcludePath(path) {
  return EXCLUDED_PATHS.some(excluded => path.startsWith(excluded));
}

/**
 * Determina si un path contiene datos sensibles
 * @param {string} path - Path de la request
 * @returns {boolean}
 */
function isSensitivePath(path) {
  return SENSITIVE_PATHS.some(sensitive => path.includes(sensitive));
}

/**
 * Middleware principal de auditoría
 */
function auditLogger(req, res, next) {
  if (shouldExcludePath(req.path)) {
    return next();
  }

  const isListView = req.method === 'GET' && !req.path.includes('/ver/') && !req.path.includes('/edit') && !req.path.includes('/detalle');
  if (isListView && !req.path.includes('/export') && !req.path.includes('/download')) {
    return next();
  }

  const startTime = Date.now();
  let finished = false;

  const finalizeLog = () => {
    if (finished) return;
    finished = true;

    const durationMs = Date.now() - startTime;

    setImmediate(async () => {
      try {
        const user = getUserFromSession(req) || req.user || null;
        const action = METHOD_TO_ACTION[req.method] || req.method;
        const module = extractModule(req.path);
        const { entityType, entityId } = extractEntity(req.path, req.body);

        let finalAction = action;
        if (req.path.includes('/login')) finalAction = 'LOGIN';
        if (req.path.includes('/logout')) finalAction = 'LOGOUT';
        if (req.path.includes('/export')) finalAction = 'EXPORT';
        if (req.path.includes('/download')) finalAction = 'DOWNLOAD';
        if (req.path.includes('/import')) finalAction = 'IMPORT';

        let oldValues = null;
        let newValues = null;

        if (req.method === 'PUT' || req.method === 'PATCH') {
          oldValues = req.body?._oldValues || null;
          newValues = isSensitivePath(req.path) ? null : sanitizeData(req.body);
        } else if (req.method === 'POST') {
          newValues = isSensitivePath(req.path) ? null : sanitizeData(req.body);
        }

        await AuditLogModel.createLog({
          userId: user?.id || null,
          userName: user?.nombre || user?.username || null,
          userEmail: user?.email || null,
          action: finalAction,
          module,
          entityType,
          entityId,
          oldValues,
          newValues,
          ipAddress: req.ip || req.connection?.remoteAddress,
          userAgent: req.get('user-agent'),
          method: req.method,
          url: req.originalUrl || req.url,
          statusCode: res.statusCode,
          durationMs,
          metadata: {
            query: req.query,
            params: req.params
          }
        });
      } catch (error) {
        console.error('⚠️  Error al registrar log de auditoría:', error.message);
      }
    });
  };

  res.on('finish', finalizeLog);
  res.on('close', finalizeLog);

  next();
}

/**
 * Función auxiliar para registrar logins manualmente
 * Útil para el controlador de autenticación
 */
async function logLogin(userId, userName, userEmail, req, success = true) {
  try {
    await AuditLogModel.createLog({
      userId: success ? userId : null,
      userName: success ? userName : null,
      userEmail: success ? userEmail : null,
      action: 'LOGIN',
      module: 'autenticacion',
      entityType: 'usuario',
      entityId: userId ? userId.toString() : null,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('user-agent'),
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: success ? 200 : 401,
      metadata: {
        success,
        attempt_time: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('⚠️  Error al registrar login:', error.message);
  }
}

/**
 * Función auxiliar para registrar logouts manualmente
 */
async function logLogout(userId, userName, userEmail, req) {
  try {
    await AuditLogModel.createLog({
      userId,
      userName,
      userEmail,
      action: 'LOGOUT',
      module: 'autenticacion',
      entityType: 'usuario',
      entityId: userId ? userId.toString() : null,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('user-agent'),
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: 200,
      metadata: {
        logout_time: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('⚠️  Error al registrar logout:', error.message);
  }
}

/**
 * Función auxiliar para registrar cambios específicos con diff
 * Útil cuando necesitas registrar el before/after de una operación
 */
async function logChange(req, action, module, entityType, entityId, oldData, newData) {
  try {
    const user = req.session?.user || null;
    
    await AuditLogModel.createLog({
      userId: user?.id || null,
      userName: user?.nombre || null,
      userEmail: user?.email || null,
      action,
      module,
      entityType,
      entityId: entityId ? entityId.toString() : null,
      oldValues: oldData,
      newValues: newData,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('user-agent'),
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: 200
    });
  } catch (error) {
    console.error('⚠️  Error al registrar cambio:', error.message);
  }
}

module.exports = {
  auditLogger,
  logLogin,
  logLogout,
  logChange
};
