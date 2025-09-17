const express = require('express');
const router = express.Router();
const ClienteController = require('../controllers/clientesController.basic');
const { validateSchema, schemas } = require('../middleware/validation');
const { apiLimiter } = require('../middleware/rate-limit');

// Aplicar rate limiting a todas las rutas
router.use(apiLimiter);

// Middleware de validación
const validateCreate = validateSchema(schemas.createCliente);
const validateUpdate = validateSchema(schemas.updateCliente);

// Rutas API
router.get('/', ClienteController.getClientesAPI);
router.post('/', validateCreate, ClienteController.createCliente);
router.put('/:id', validateUpdate, ClienteController.updateCliente);
router.get('/:id/detalle', ClienteController.getClienteDetalleAPI);

module.exports = router;
