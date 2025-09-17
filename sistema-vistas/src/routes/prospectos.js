const express = require('express');
const router = express.Router();
const ProspectoController = require('../controllers/prospectoController');

// =============================================================================
// RUTAS DE VISTAS
// =============================================================================

// Dashboard de prospectos
router.get('/', ProspectoController.index);

// Lista de prospectos
router.get('/listar', ProspectoController.listar);

// Formulario de creación
router.get('/crear', ProspectoController.crear);
router.get('/nuevo', ProspectoController.crear); // Alias para crear

// Ver detalle de prospecto
router.get('/ver/:id', ProspectoController.ver);

// Formulario de edición
router.get('/:id/editar', ProspectoController.editar);

// =============================================================================
// RUTAS DE ACCIONES (POST/PUT/DELETE)
// =============================================================================

// Crear prospecto
router.post('/', ProspectoController.guardar);
router.post('/nuevo', ProspectoController.guardar); // Alias para crear

// Actualizar prospecto
router.put('/:id', ProspectoController.actualizar);

// Eliminar prospecto
router.delete('/:id', ProspectoController.eliminar);

// =============================================================================
// API ENDPOINTS (JSON)
// =============================================================================

// Búsqueda de prospectos (API JSON)
router.get('/api/search', ProspectoController.apiSearch);

// Estadísticas de prospectos
router.get('/api/estadisticas', ProspectoController.apiEstadisticas);

// Actualizar estado de prospecto
router.put('/api/:id/estado', ProspectoController.apiUpdateEstado);

// Convertir prospecto a cliente
router.post('/api/:id/convertir', ProspectoController.apiConvertirCliente);

// =============================================================================
// EXPORTACIONES
// =============================================================================

// Exportar prospectos a Excel
router.get('/export/excel', ProspectoController.exportarExcel);

module.exports = router;
