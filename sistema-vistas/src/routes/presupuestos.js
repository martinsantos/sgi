const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const PresupuestosController = require('../controllers/presupuestosController');

// === MIDDLEWARES DE VALIDACIÓN ===

// Validaciones para crear/actualizar presupuesto
const validarPresupuesto = [
  body('cliente_id')
    .notEmpty()
    .withMessage('El cliente es obligatorio')
    .isUUID()
    .withMessage('ID de cliente inválido'),
  body('importe_total')
    .isFloat({ min: 0 })
    .withMessage('El importe total debe ser mayor a 0'),
  body('fecha_validez')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Fecha de validez inválida'),
  body('dias_vencimiento')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Los días de vencimiento deben estar entre 1 y 365'),
  body('estado')
    .optional()
    .isIn(['0', '1', '2', '3', '4'])
    .withMessage('Estado inválido'),
  body('observaciones')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Las observaciones no pueden exceder 1000 caracteres')
];

// Validación para actualizar solo el estado
const validarEstado = [
  body('estado')
    .isIn(['0', '1', '2', '3', '4'])
    .withMessage('Estado inválido')
];

// Validación para parámetros de ID
const validarId = [
  param('id')
    .isUUID()
    .withMessage('ID de presupuesto inválido')
];

// Validaciones para filtros de búsqueda
const validarFiltrosBusqueda = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La página debe ser un número mayor a 0'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe estar entre 1 y 100'),
  query('sortBy')
    .optional()
    .isIn(['fecha_emision', 'numero_presupuesto', 'cliente_nombre', 'importe_total', 'estado', 'fecha_validez'])
    .withMessage('Campo de ordenamiento inválido'),
  query('sortOrder')
    .optional()
    .isIn(['ASC', 'DESC'])
    .withMessage('Orden inválido'),
  query('estado')
    .optional()
    .isIn(['0', '1', '2', '3', '4'])
    .withMessage('Estado de filtro inválido'),
  query('fecha_desde')
    .optional()
    .isISO8601()
    .withMessage('Fecha desde inválida'),
  query('fecha_hasta')
    .optional()
    .isISO8601()
    .withMessage('Fecha hasta inválida'),
  query('importe_desde')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Importe desde debe ser mayor o igual a 0'),
  query('importe_hasta')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Importe hasta debe ser mayor o igual a 0')
];

// Middleware para manejar errores de validación
const manejarErroresValidacion = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array()
      });
    } else {
      req.flash('error', 'Por favor corrija los errores en el formulario');
      req.flash('validation_errors', errors.array());
      return res.redirect('back');
    }
  }
  next();
};

// === RUTAS PRINCIPALES DE PRESUPUESTOS ===

/**
 * GET /presupuestos - Lista principal de presupuestos (dashboard)
 */
router.get('/', PresupuestosController.index);

/**
 * GET /presupuestos/listar - Listado completo con filtros
 */
router.get('/listar', validarFiltrosBusqueda, manejarErroresValidacion, PresupuestosController.listar);

// === RUTAS DE CREACIÓN ===

/**
 * GET /presupuestos/crear - Mostrar formulario de creación
 */
router.get('/crear', PresupuestosController.create);
router.get("/nuevo", PresupuestosController.create);

/**
 * POST /presupuestos - Crear nuevo presupuesto
 */
router.post('/', validarPresupuesto, manejarErroresValidacion, PresupuestosController.store);

// === RUTAS DE VISUALIZACIÓN ===

/**
 * GET /presupuestos/ver/:id - Ver detalle de un presupuesto
 */
router.get('/ver/:id', validarId, manejarErroresValidacion, PresupuestosController.show);

/**
 * GET /presupuestos/:id - Ver detalle de presupuesto (alias)
 */
router.get('/:id(\\w{8}-\\w{4}-\\w{4}-\\w{4}-\\w{12})', validarId, manejarErroresValidacion, PresupuestosController.show);

// === RUTAS DE EDICIÓN ===

/**
 * GET /presupuestos/:id/editar - Mostrar formulario de edición
 */
router.get('/:id/editar', validarId, manejarErroresValidacion, PresupuestosController.edit);

/**
 * PUT /presupuestos/:id - Actualizar presupuesto
 */
router.put('/:id', validarId.concat(validarPresupuesto), manejarErroresValidacion, PresupuestosController.update);

/**
 * POST /presupuestos/:id - Actualizar presupuesto (método POST con _method)
 */
router.post('/:id', validarId.concat(validarPresupuesto), manejarErroresValidacion, PresupuestosController.update);

// === RUTAS DE ELIMINACIÓN ===

/**
 * DELETE /presupuestos/:id - Eliminar presupuesto
 */
router.delete('/:id', validarId, manejarErroresValidacion, PresupuestosController.destroy);

// === RUTAS DE API (JSON) ===

/**
 * GET /presupuestos/api/presupuestos - Lista de presupuestos JSON
 */
router.get('/api/presupuestos', validarFiltrosBusqueda, manejarErroresValidacion, PresupuestosController.searchJSON);

/**
 * GET /presupuestos/api/search - Búsqueda JSON paginada
 */
router.get('/api/search', validarFiltrosBusqueda, manejarErroresValidacion, PresupuestosController.searchJSON);

/**
 * PUT /presupuestos/api/:id/estado - Actualizar estado de presupuesto
 */
router.put('/api/:id/estado', validarId.concat(validarEstado), manejarErroresValidacion, PresupuestosController.updateEstado);

/**
 * POST /presupuestos/api/:id/duplicate - Duplicar presupuesto
 */
router.post('/api/:id/duplicate', validarId, manejarErroresValidacion, PresupuestosController.duplicate);

// === RUTAS DE REPORTES Y ESTADÍSTICAS ===

/**
 * GET /presupuestos/estadisticas - Ver estadísticas
 */
router.get('/estadisticas', PresupuestosController.estadisticas);

// === RUTAS DE EXPORTACIÓN ===

/**
 * GET /presupuestos/export/excel - Exportar presupuestos a Excel
 */
router.get('/export/excel', validarFiltrosBusqueda, PresupuestosController.exportExcel);

/**
 * GET /presupuestos/:id/pdf - Exportar presupuesto individual a PDF
 */
router.get('/:id/pdf', validarId, manejarErroresValidacion, PresupuestosController.exportPDF);

// === RUTAS DE API (AL FINAL PARA EVITAR CONFLICTOS) ===

/**
 * POST /presupuestos/api/presupuestos - Crear presupuesto vía API
 */
router.post('/api/presupuestos', PresupuestosController.crearPresupuesto);

/**
 * PUT /presupuestos/api/presupuestos/:id/aprobar - Aprobar presupuesto vía API
 */
router.put('/api/presupuestos/:id/aprobar', PresupuestosController.aprobarPresupuesto);

/**
 * PUT /presupuestos/api/presupuestos/:id/rechazar - Rechazar presupuesto vía API
 */
router.put('/api/presupuestos/:id/rechazar', PresupuestosController.rechazarPresupuesto);

/**
 * GET /presupuestos/api/presupuestos/:id - Obtener presupuesto vía API
 */
router.get('/api/presupuestos/:id', PresupuestosController.getPresupuesto);

/**
 * GET /presupuestos/api/presupuestos - Listar presupuestos vía API
 */
router.get('/api/presupuestos', PresupuestosController.getPresupuestos);

module.exports = router;
