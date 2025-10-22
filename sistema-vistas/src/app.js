require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { engine } = require('express-handlebars');
const path = require('path');
const cors = require('cors');
const basicAuth = require('./middleware/basicAuth');

// Importar todas las rutas disponibles
let presupuestosRoutes, facturasRoutes, clientesRoutes, dashboardRoutes, proyectosRoutes, certificadosRoutes, leadsRoutes, prospectosRoutes, authRoutes, healthRoutes;

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
clientesRoutes = loadRoute('./routes/clientes', 'clientes');
dashboardRoutes = loadRoute('./routes/dashboard', 'dashboard');
proyectosRoutes = loadRoute('./routes/proyectos', 'proyectos');
certificadosRoutes = loadRoute('./routes/certificados', 'certificados');
leadsRoutes = loadRoute('./routes/leads', 'leads');
prospectosRoutes = loadRoute('./routes/prospectos', 'prospectos');
authRoutes = loadRoute('./routes/auth', 'auth');
healthRoutes = loadRoute('./routes/health.routes', 'health');

// Cargar rutas de módulos básicos
const modulosBasicos = loadRoute('./routes/modulos-basicos', 'modulos-basicos');

const app = express();

// Configuración de middlewares - ORDEN CRÍTICO
app.use(cors());

// ⚠️ SESIONES PRIMERO - CRÍTICO PARA LOGIN
app.use(session({
  secret: process.env.SESSION_SECRET || 'SGI-Secret-Key-2025-UltimaMillaSystem',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Cambiar a true solo con HTTPS completo
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

// ⚠️ BODY PARSERS DESPUÉS DE SESIÓN
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ⚠️ AUTENTICACIÓN BÁSICA - PROTEGE TODO EL SISTEMA (excepto /auth/* y /public)
app.use((req, res, next) => {
  // Permitir acceso sin auth a rutas de autenticación y assets
  if (req.path.startsWith('/auth/') || req.path.startsWith('/css/') || req.path.startsWith('/js/') || req.path.startsWith('/images/')) {
    return next();
  }
  // Aplicar basicAuth a todas las demás rutas
  return basicAuth(req, res, next);
});

// Middleware para hacer el usuario disponible en las vistas
app.use((req, res, next) => {
  if (req.user) {
    res.locals.user = req.user;
  }
  next();
});

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

mountRoute(authRoutes, '/auth', 'auth');
mountRoute(dashboardRoutes, '/dashboard', 'dashboard');
mountRoute(facturasRoutes, '/facturas', 'facturas');
mountRoute(clientesRoutes, '/clientes', 'clientes');
mountRoute(presupuestosRoutes, '/presupuestos', 'presupuestos');
mountRoute(proyectosRoutes, '/proyectos', 'proyectos');
mountRoute(certificadosRoutes, '/certificados', 'certificados');
mountRoute(leadsRoutes, '/leads', 'leads');
mountRoute(prospectosRoutes, '/prospectos', 'prospectos');
mountRoute(healthRoutes, '/health', 'health');

// Montar rutas de módulos básicos
if (modulosBasicos) {
  app.use('/', modulosBasicos);
  console.log('✅ Rutas de módulos básicos montadas');
}

// Ruta de inicio - redirigir al login
app.get('/', (req, res) => {
  // Si ya está autenticado, ir al dashboard
  if (req.session && req.session.userId) {
    return res.redirect('/dashboard');
  }
  // Si no, ir al login
  res.redirect('/auth/login');
});

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
