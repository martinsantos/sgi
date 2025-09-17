const express = require('express');
const router = express.Router();
const PresupuestoController = require('../controllers/presupuestosController.basic');
const { validateSchema, schemas } = require('../middleware/validation');
const { apiLimiter, strictLimiter } = require('../middleware/rate-limit');

// Aplicar rate limiting a todas las rutas
router.use(apiLimiter);

// Rutas API
router.get('/', PresupuestoController.getPresupuestosAPI);
router.post('/', validateSchema(schemas.createPresupuesto), strictLimiter, PresupuestoController.createPresupuesto);
router.get('/:id', PresupuestoController.getPresupuestoAPI);
router.put('/:id/estado', strictLimiter, PresupuestoController.updatePresupuestoEstado);

module.exports = router;
