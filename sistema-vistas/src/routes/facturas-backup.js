const express = require('express');
const router = express.Router();
const FacturasController = require('../controllers/facturasController');

// Middleware para verificar si la solicitud es AJAX
const isAjax = (req, res, next) => {
  req.isAjax = req.xhr || req.get('Content-Type') === 'application/json';
  next();
};

// === RUTAS PRINCIPALES DE FACTURAS ===

/**
 * GET /facturas - Lista principal de facturas con estadísticas
 */
router.get('/', FacturasController.index);

/**
 * GET /facturas/dashboard - Dashboard con estadísticas y métricas
 */
router.get('/dashboard', FacturasController.dashboard);

/**
 * GET /facturas/search - Búsqueda avanzada de facturas
 */
router.get('/search', FacturasController.search);

/**
 * GET /facturas/list - Listado de facturas con filtros avanzados
 */
router.get('/list', async (req, res) => {
  try {
    const facturaController = new FacturasController();
    const result = await facturaController.busquedaAvanzada(req, res);
    
    // Si el controlador ya envió una respuesta, no hacer nada más
    if (res.headersSent) {
      return;
    }
    
    // Obtener clientes y proyectos para los filtros
    const clientes = await facturaController.obtenerClientesParaFiltros();
    const proyectos = await facturaController.obtenerProyectosParaFiltros();
    
    res.render('facturas/list', {
      title: 'Listado de Facturas',
      facturas: result.facturas,
      pagination: result.pagination,
      filters: req.query,
      stats: result.stats,
      clientes: clientes || [],
      proyectos: proyectos || [],
      view: req.query.view || 'table'
    });
  } catch (error) {
    console.error('Error en listado de facturas:', error);
    res.status(500).render('error', {
      message: 'Error al cargar el listado de facturas',
      error: error
    });
  }
});

/**
 * GET /facturas/ver/:id - Ver detalle de una factura específica
 */
router.get('/ver/:id', FacturasController.show);

/**
 * GET /facturas/:id - Ver detalle de factura (nueva ruta)
 */
router.get('/:id', async (req, res) => {
  try {
    const facturaController = new FacturasController();
    const factura = await facturaController.obtenerFacturaPorId(req.params.id);
    
    if (!factura) {
      return res.status(404).render('error', {
        message: 'Factura no encontrada',
        error: new Error('La factura solicitada no existe')
      });
    }
    
    res.render('facturas/detail', {
      title: `Factura ${factura.tipo_factura} ${factura.punto_venta}-${factura.numero_factura}`,
      ...factura
    });
  } catch (error) {
    console.error('Error al obtener detalle de factura:', error);
    res.status(500).render('error', {
      message: 'Error al cargar el detalle de la factura',
      error: error
    });
  }
});

/**
 * POST /facturas/:id/marcar-pagada - Marcar factura como pagada
 */
router.post('/:id/marcar-pagada', async (req, res) => {
  try {
    const facturaController = new FacturasController();
    const result = await facturaController.marcarComoPagada(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Error al marcar factura como pagada:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /facturas/:id/autorizar - Autorizar factura
 */
router.post('/:id/autorizar', async (req, res) => {
  try {
    const facturaController = new FacturasController();
    const result = await facturaController.autorizarFactura(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Error al autorizar factura:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /facturas/:id/anular - Anular factura
 */
router.post('/:id/anular', async (req, res) => {
  try {
    const facturaController = new FacturasController();
    const result = await facturaController.anularFactura(req.params.id, req.body.motivo);
    res.json(result);
  } catch (error) {
    console.error('Error al anular factura:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /facturas/:id/enviar-recordatorio - Enviar recordatorio de pago
 */
router.post('/:id/enviar-recordatorio', async (req, res) => {
  try {
    const facturaController = new FacturasController();
    const result = await facturaController.enviarRecordatorio(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Error al enviar recordatorio:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /facturas/:id/pdf - Generar PDF de factura
 */
router.get('/:id/pdf', async (req, res) => {
  try {
    const facturaController = new FacturasController();
    await facturaController.generarPDF(req, res);
  } catch (error) {
    console.error('Error al generar PDF:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// === RUTAS DE FUNCIONALIDAD AVANZADA ===

/**
 * GET /facturas/export/excel - Exportar facturas a Excel
 * Acepta los mismos parámetros de filtros que la búsqueda avanzada
 */
router.get('/export/excel', FacturasController.exportExcel);

// === RUTAS DE API (JSON) ===

/**
 * GET /facturas/api/search - Búsqueda JSON paginada de facturas
 */
router.get('/api/search', FacturasController.searchFacturasJSON);

/**
 * GET /facturas/api/cliente/:clienteId - Obtener facturas de un cliente específico
 */
router.get('/api/cliente/:clienteId', FacturasController.getFacturasByCliente);

/**
 * PUT /facturas/api/:id/estado - Actualizar estado de una factura
 */
router.put('/api/:id/estado', FacturasController.updateEstado);

// === RUTAS DE COMPATIBILIDAD CON EL SISTEMA EXISTENTE ===

/**
 * GET /facturas/emitidas - Vista de facturas emitidas (compatibilidad)
 */
router.get('/emitidas', FacturasController.getFacturasEmitidas);

/**
 * GET /facturas/emitidas/:id - Ver detalle de factura (compatibilidad)
 */
router.get('/emitidas/:id', FacturasController.getFacturaById);

/**
 * PUT /facturas/emitidas/:id - Actualizar factura (compatibilidad)
 */
router.put('/emitidas/:id', isAjax, FacturasController.updateFactura);

/**
 * GET /facturas/buscar - Búsqueda básica (compatibilidad)
 */
router.get('/buscar', isAjax, FacturasController.buscarFacturas);

/**
 * GET /facturas/exportar - Exportación básica (compatibilidad)
 */
router.get('/exportar', FacturasController.exportExcel);

module.exports = router;
