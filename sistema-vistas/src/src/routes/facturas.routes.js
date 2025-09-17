const express = require('express');
const router = express.Router();
const FacturaController = require('../controllers/facturasController.basic');
const { validateSchema, schemas } = require('../middleware/validation');
const { apiLimiter, strictLimiter } = require('../middleware/rate-limit');

// Aplicar rate limiting a todas las rutas
router.use(apiLimiter);

// Rutas básicas
router.get('/', FacturaController.getFacturasAPI);
router.get('/:id', FacturaController.getDetalleFactura);
router.post('/', validateSchema(schemas.createFactura), strictLimiter, FacturaController.crearFactura);
router.post('/:id/anular', strictLimiter, FacturaController.anularFactura);

module.exports = router;
