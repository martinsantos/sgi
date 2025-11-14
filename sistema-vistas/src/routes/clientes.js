const express = require('express');
const router = express.Router();
const ClienteController = require('../controllers/clientesController');

// ===== RUTAS ESPECÍFICAS (ANTES DE LAS RUTAS CON :id) =====

// API para búsqueda JSON (DEBE ESTAR ANTES DE /api/:id)
router.get('/api/search', ClienteController.buscarClientes);
router.get('/api/search-json', ClienteController.buscarClientesAPI);

// API para obtener clientes (JSON)
router.get('/api', ClienteController.getClientesAPI);
router.get('/api/listado', ClienteController.getClientes);

// Crear cliente
router.post('/api/crear', ClienteController.createCliente);

// ===== RUTAS CON PARÁMETROS DINÁMICOS (DEBEN ESTAR AL FINAL) =====

// APIs específicas para datos relacionados del cliente (DEBEN ESTAR ANTES DE /api/:id)
router.get('/api/:id/proyectos', ClienteController.getProyectosCliente);
router.get('/api/:id/facturas', ClienteController.getFacturasCliente);

// Ver cliente específico por ID (DEBE ESTAR AL FINAL)
router.get('/api/:id', ClienteController.getClienteDetalle);

/**
 * Rutas de Clientes - CRM
 */

// Dashboard de clientes - COMENTADO TEMPORALMENTE
// router.get('/dashboard', ClienteController.dashboard);

// Cartera de clientes por vendedor (GC.1, GC.3) - COMENTADO TEMPORALMENTE
// router.get('/cartera', ClienteController.carteraPorVendedor);

// Reporte de comisiones (GC.5) - COMENTADO TEMPORALMENTE
// router.get('/comisiones', ClienteController.reporteComisiones);

// Listado principal
router.get('/', ClienteController.getClientes);

// Crear cliente - Ruta fallback para compatibilidad
router.post('/', ClienteController.createCliente);

// Búsqueda con filtros
router.get('/buscar', ClienteController.buscarClientes);

// Ruta específica para modal de facturas
router.get('/modal/search', (req, res) => {
  const { q, search, nombre } = req.query;
  const searchTerm = q || search || nombre || '';
  
  // Redirigir a la API principal con parámetros correctos
  req.query.search = searchTerm;
  req.headers.accept = 'application/json';
  
  // Llamar al controlador
  require('../controllers/clientesController').getClientesAPI(req, res);
});

// Formularios de creación
router.get('/crear', ClienteController.nuevoCliente);
router.get('/nuevo', ClienteController.nuevoCliente); // Alias para crear
router.post('/crear', ClienteController.createCliente);
router.post('/nuevo', ClienteController.createCliente); // Alias para crear

// Formularios de edición (DEBEN ESTAR ANTES DE /:id)
router.get('/editar/:id', ClienteController.mostrarEditar);
router.post('/editar/:id', ClienteController.actualizarCliente);

// Eliminar cliente (DEBE ESTAR ANTES DE GET /:id)
router.delete('/:id', ClienteController.eliminarCliente);

// Ver cliente específico
router.get('/ver/:id', ClienteController.getClienteDetalle);
router.get('/:id', ClienteController.getClienteDetalle);

// Historial comercial del cliente (GC.2) - COMENTADO TEMPORALMENTE
// router.get('/:id/historial', ClienteController.historialComercial);

// Generar lead desde cliente (GC.4) - COMENTADO TEMPORALMENTE
// router.post('/:id/generar-lead', ClienteController.generarLead);

module.exports = router;
