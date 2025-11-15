require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const { engine } = require('express-handlebars');
const path = require('path');
const cors = require('cors');
const basicAuth = require('./middleware/basicAuth');
const { requireAuth, setUserLocals } = require('./middleware/sessionAuth');
const pool = require('./config/database');

const isTestEnv = process.env.NODE_ENV === 'test';

// Importar todas las rutas disponibles
let presupuestosRoutes, facturasRoutes, facturaAdjuntosRoutes, clientesRoutes, dashboardRoutes, proyectosRoutes, certificadosRoutes, leadsRoutes, prospectosRoutes, authRoutes, authSessionRoutes, healthRoutes, logsRoutes;

// Cargar rutas con manejo de errores
const loadRoute = (path, name) => {
  try {
    const route = require(path);
    console.log(`✅ Ruta ${name} cargada`);
    return route;
  } catch(e) { 
    console.log(`❌ Ruta ${name} no encontrada: ${e.message}`);
    return null;
  }
};

presupuestosRoutes = loadRoute('./routes/presupuestos', 'presupuestos');
facturasRoutes = loadRoute('./routes/facturas', 'facturas');
facturaAdjuntosRoutes = loadRoute('./routes/facturaAdjuntos', 'facturaAdjuntos');
clientesRoutes = loadRoute('./routes/clientes', 'clientes');
dashboardRoutes = loadRoute('./routes/dashboard', 'dashboard');
proyectosRoutes = loadRoute('./routes/proyectos', 'proyectos');
certificadosRoutes = loadRoute('./routes/certificados', 'certificados');
leadsRoutes = loadRoute('./routes/leads', 'leads');
prospectosRoutes = loadRoute('./routes/prospectos', 'prospectos');
authRoutes = loadRoute('./routes/auth', 'auth');
authSessionRoutes = loadRoute('./routes/auth-session', 'auth-session');
healthRoutes = loadRoute('./routes/health.routes', 'health');
logsRoutes = loadRoute('./routes/logs', 'logs');

// Cargar rutas de módulos básicos
const modulosBasicos = loadRoute('./routes/modulos-basicos', 'modulos-basicos');

const app = express();

// Configuración de middlewares - ORDEN CRÍTICO
app.use(cors());

// ⚠️ SESIONES PRIMERO - CRÍTICO PARA LOGIN
// Usar MySQL para almacenar sesiones (persistente)
const sessionStore = new MySQLStore({
  expiration: 24 * 60 * 60 * 1000, // 24 horas
  createDatabaseTable: true,
  schema: {
    tableName: 'sessions',
    columnNames: {
      session_id: 'session_id',
      expires: 'expires',
      data: 'data'
    }
  }
}, pool);

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'SGI-Secret-Key-2025-UltimaMillaSystem',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: { 
    secure: false, // Cambiar a true solo con HTTPS completo
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    sameSite: 'lax' // Permitir cookies en peticiones POST
  }
});

app.use(sessionMiddleware);

// Middleware para asegurar que la sesión se guarda después de cada petición
app.use((req, res, next) => {
  // Guardar la sesión después de que se envíe la respuesta
  const originalJson = res.json;
  const originalSend = res.send;
  const originalRedirect = res.redirect;
  
  res.json = function(data) {
    if (req.session) {
      req.session.save((err) => {
        if (err) console.error('Error guardando sesión en json:', err);
      });
    }
    return originalJson.call(this, data);
  };
  
  res.send = function(data) {
    if (req.session) {
      req.session.save((err) => {
        if (err) console.error('Error guardando sesión en send:', err);
      });
    }
    return originalSend.call(this, data);
  };
  
  res.redirect = function(url) {
    if (req.session) {
      req.session.save((err) => {
        if (err) console.error('Error guardando sesión en redirect:', err);
      });
    }
    return originalRedirect.call(this, url);
  };
  
  next();
});

// ⚠️ BODY PARSERS DESPUÉS DE SESIÓN
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ⚠️ MIDDLEWARE DE AUDITORÍA - Después de tener usuario disponible
const { auditLogger } = require('./middleware/auditLogger');
app.use(auditLogger);

// Configuración de Handlebars - Versión funcional
const handlebarsEngine = engine({
  extname: '.handlebars',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  partialsDir: path.join(__dirname, 'views/partials'),
  helpers: require('./helpers/handlebars'),
  runtimeOptions: {
    allowProtoPropertiesByDefault: true,
    allowProtoMethodsByDefault: true
  }
});

app.engine('handlebars', handlebarsEngine);
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// Archivos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// Montar todas las rutas disponibles
const mountRoute = (route, path, name) => {
  if (route) {
    app.use(path, route);
    console.log(`✅ Ruta ${name} montada en ${path}`);
  }
};

// ⚠️ MONTAR RUTAS DE AUTENTICACIÓN PRIMERO (ANTES de requireAuth)
mountRoute(authSessionRoutes, '/auth', 'auth-session');
mountRoute(authRoutes, '/auth', 'auth');
mountRoute(healthRoutes, '/health', 'health');

// Ruta de inicio - redirigir al login (ANTES de requireAuth)
app.get('/', (req, res) => {
  // Si ya está autenticado, ir al dashboard
  if (req.session && req.session.userId) {
    return res.redirect('/dashboard');
  }
  // Si no, ir al login
  res.redirect('/auth/login');
});

// ⚠️ AUTENTICACIÓN CON SESIONES - PROTEGE TODO EL SISTEMA (DESPUÉS de rutas públicas)
if (!isTestEnv) {
  app.use(requireAuth);
  app.use(setUserLocals);
} else {
  // En tests exponemos un usuario simulado para evitar redirecciones 302
  app.use((req, res, next) => {
    req.session = req.session || {};
    if (!req.session.user) {
      req.session.user = {
        id: 0,
        username: 'test-user',
        email: 'test@sgi.local'
      };
    }
    req.user = {
      id: 0,
      username: 'test-user',
      email: 'test@sgi.local',
      authenticated: true,
      authMethod: 'test-bypass'
    };
    res.locals.user = req.user;
    res.locals.isAuthenticated = true;
    next();
  });
}

// ⚠️ MONTAR RUTAS PROTEGIDAS (DESPUÉS de requireAuth)
mountRoute(dashboardRoutes, '/dashboard', 'dashboard');
mountRoute(facturasRoutes, '/facturas', 'facturas');
mountRoute(facturaAdjuntosRoutes, '/facturas/adjuntos', 'facturaAdjuntos');
mountRoute(clientesRoutes, '/clientes', 'clientes');
mountRoute(presupuestosRoutes, '/presupuestos', 'presupuestos');
mountRoute(proyectosRoutes, '/proyectos', 'proyectos');
mountRoute(certificadosRoutes, '/certificados', 'certificados');
mountRoute(leadsRoutes, '/leads', 'leads');
mountRoute(prospectosRoutes, '/prospectos', 'prospectos');
mountRoute(logsRoutes, '/logs', 'logs');

// Montar rutas de módulos básicos
if (modulosBasicos) {
  app.use('/', modulosBasicos);
  console.log('✅ Rutas de módulos básicos montadas');
}

// Ruta de prueba para diagnosticar handlebars
app.get('/test-handlebars', (req, res) => {
  try {
    res.render('test-simple', {
      layout: false, // Sin layout para esta prueba
      title: 'Prueba Handlebars - Sistema SGI',
      message: 'Si ves esto, handlebars funciona correctamente!',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error en handlebars',
      details: error.message
    });
  }
});

// Handler 404 - Debe estar al final de todas las rutas
app.use((req, res, next) => {
  res.status(404).render('errors/404', {
    layout: false,
    url: req.url
  });
});

module.exports = app;
