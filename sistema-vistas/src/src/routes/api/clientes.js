const express = require('express');
const router = express.Router();
const { 
  getClientes,
  getCliente,
  createCliente,
  updateCliente,
  deleteCliente
} = require('../../controllers/ClienteApiController');
const { requireAuth } = require('../../middleware/auth');

// Client API routes
router.get('/clientes', requireAuth, getClientes);
router.get('/clientes/:id', requireAuth, getCliente);
router.post('/clientes', requireAuth, createCliente);
router.put('/clientes/:id', requireAuth, updateCliente);
router.delete('/clientes/:id', requireAuth, deleteCliente);

module.exports = router;
