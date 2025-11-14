const express = require('express');
const router = express.Router();
const multer = require('multer');
const FacturaAdjuntoController = require('../controllers/facturaAdjuntoController');
const { requireAuth } = require('../middleware/auth');

// Configurar multer para subidas
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB máximo
  },
  fileFilter: (req, file, cb) => {
    // Permitir solo ciertos tipos de archivo
    const tiposPermitidos = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];

    if (tiposPermitidos.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido'), false);
    }
  }
});

// Rutas de adjuntos
// Nota: requireAuth ya está aplicado globalmente en app.js para todas las rutas
router.post('/subir', upload.single('archivo'), FacturaAdjuntoController.subirAdjunto);
router.get('/descargar/:adjuntoId', FacturaAdjuntoController.descargarAdjunto);
router.get('/factura-venta/:facturaVentaId', FacturaAdjuntoController.getAdjuntosFacturaVenta);
router.get('/factura-compra/:facturaCompraId', FacturaAdjuntoController.getAdjuntosFacturaCompra);
router.delete('/:adjuntoId', FacturaAdjuntoController.eliminarAdjunto);
router.put('/:adjuntoId/descripcion', FacturaAdjuntoController.actualizarDescripcion);
router.get('/estadisticas', FacturaAdjuntoController.getEstadisticas);

module.exports = router;
