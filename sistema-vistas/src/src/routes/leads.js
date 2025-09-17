const express = require('express');
const router = express.Router();
const LeadController = require('../controllers/leadController');

/**
 * Rutas de Leads
 */

// Dashboard de leads
router.get('/dashboard', LeadController.dashboard);

// Pipeline de ventas (vista Kanban)
router.get('/pipeline', LeadController.pipeline);

// Listado principal
router.get('/', LeadController.listar);

// Búsqueda con filtros
router.get('/buscar', LeadController.buscar);

// API para búsqueda JSON
router.get('/api/search', LeadController.searchJSON);

// Formularios de creación
router.get('/crear', LeadController.mostrarCrear);
router.get('/nuevo', LeadController.mostrarCrear); // Alias para crear
router.post('/crear', LeadController.crear);
router.post('/nuevo', LeadController.crear); // Alias para crear

// Ver lead específico
router.get('/:id', LeadController.ver);

// Formularios de edición
router.get('/:id/editar', LeadController.mostrarEditar);
router.post('/:id/editar', LeadController.actualizar);

// API para cambiar estado
router.post('/:id/cambiar-estado', LeadController.cambiarEstado);

// Convertir lead a presupuesto
router.post('/:id/convertir-presupuesto', LeadController.convertirPresupuesto);

// Generar reportes
router.get('/reporte', LeadController.reporte);

module.exports = router;
