const express = require('express');
const router = express.Router();
const CertificadoController = require('../controllers/certificadoController');

/**
 * Rutas de Certificados
 */

// Dashboard de certificados
router.get('/dashboard', CertificadoController.dashboard);

// Listado principal
router.get('/', CertificadoController.listar);

// Búsqueda con filtros
router.get('/buscar', CertificadoController.buscar);

// API para búsqueda JSON
router.get('/api/search', CertificadoController.searchJSON);

// Formularios de creación
router.get('/crear', CertificadoController.mostrarCrear);
router.get('/nuevo', CertificadoController.mostrarCrear); // Alias para crear
router.post('/crear', CertificadoController.crear);
router.post('/nuevo', CertificadoController.crear); // Alias para crear

// Ver certificado específico
router.get("/ver/:id", CertificadoController.ver);
router.get('/:id', CertificadoController.ver);

// Formularios de edición
router.get('/editar/:id', CertificadoController.mostrarEditar); // URL: /certificados/editar/ID
router.get('/:id/editar', CertificadoController.mostrarEditar); // URL: /certificados/ID/editar
router.post('/:id/editar', CertificadoController.actualizar);

// API para cambiar estado
router.post('/:id/cambiar-estado', CertificadoController.cambiarEstado);

// API para marcar como facturado
router.post('/:id/marcar-facturado', CertificadoController.marcarFacturado);

// API para obtener certificados por proyecto
router.get('/api/proyecto/:proyectoId', CertificadoController.porProyecto);

// Generar reportes
router.get('/reporte', CertificadoController.reporte);

module.exports = router;
