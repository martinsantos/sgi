const express = require('express');
const router = express.Router();
const ProyectoController = require('../controllers/proyectoController');

/**
 * Rutas de Proyectos
 */

// Dashboard de proyectos
router.get('/dashboard', ProyectoController.dashboard);

// Listado principal
router.get('/', ProyectoController.listar);

// Búsqueda con filtros
router.get('/buscar', ProyectoController.buscar);

// API para búsqueda JSON
router.get('/api/search', ProyectoController.searchJSON);

// Formularios de creación
router.get('/crear', ProyectoController.mostrarCrear);
router.get("/nuevo", ProyectoController.mostrarCrear);
router.post('/crear', ProyectoController.crear);
router.post("/nuevo", ProyectoController.crear);

// Crear proyecto desde presupuesto
router.post('/crear-desde-presupuesto/:presupuestoId', ProyectoController.crearDesdePresupuesto);

// Ver proyecto específico
router.get("/ver/:id", ProyectoController.ver);
router.get('/:id', ProyectoController.ver);

// Formularios de edición
router.get('/:id/editar', ProyectoController.mostrarEditar);
router.post('/:id/editar', ProyectoController.actualizar);

// API para cambiar estado
router.post('/:id/cambiar-estado', ProyectoController.cambiarEstado);

module.exports = router;
