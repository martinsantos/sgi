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

// Formularios de edición (DEBE IR ANTES de /:id)
router.get('/editar/:id', ProyectoController.mostrarEditar);
router.post('/editar/:id', ProyectoController.actualizar);
router.get('/:id/editar', ProyectoController.mostrarEditar);
router.post('/:id/editar', ProyectoController.actualizar);

// Ver proyecto específico (DEBE IR AL FINAL)
router.get("/ver/:id", ProyectoController.ver);
router.get('/:id', ProyectoController.ver);

// API para cambiar estado
router.post('/:id/cambiar-estado', ProyectoController.cambiarEstado);

// API para certificados
router.get('/:id/certificados-disponibles', ProyectoController.getCertificadosDisponibles);
router.post('/:id/asociar-certificado', ProyectoController.asociarCertificado);
router.post('/:id/desasociar-certificado', ProyectoController.desasociarCertificado);

// Eliminar proyecto
router.post('/:id/eliminar', ProyectoController.eliminar);
router.delete('/:id', ProyectoController.eliminar);

module.exports = router;
