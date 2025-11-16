const FacturaModel = require('../models/FacturaModel');
const ClienteModel = require('../models/ClienteModel');
const { formatCurrency, formatDate } = require('../helpers/formatters');
const ExcelJS = require('exceljs');

// Helper functions for estado handling
function getEstadoBadge(estado) {
  const estados = {
    1: { class: 'bg-warning', text: 'Pendiente' },
    2: { class: 'bg-success', text: 'Pagada' },
    3: { class: 'bg-danger', text: 'Anulada' },
    4: { class: 'bg-info', text: 'En proceso' },
    5: { class: 'bg-secondary', text: 'Rechazada' }
  };
  
  const estadoInfo = estados[estado] || { class: 'bg-secondary', text: 'Desconocido' };
  return `<span class="badge ${estadoInfo.class}">${estadoInfo.text}</span>`;
}

function getEstadoNombre(estado) {
  const estados = {
    1: 'Pendiente',
    2: 'Pagada',
    3: 'Anulada',
    4: 'En proceso',
    5: 'Rechazada'
  };
  
  return estados[estado] || 'Desconocido';
}

class FacturasController {
  /**
   * Lista todas las facturas con paginación
   */
  static async index(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      
      const result = await FacturaModel.getFacturasEmitidas(page, limit);
      const estadisticas = await FacturaModel.getFacturasEstadisticas();
      
      res.render('facturas/index', {
        title: 'Facturas - Sistema Integral',
        facturas: result.data.map(f => ({
          ...f,
          fecha_emision_formatted: formatDate(f.fecha_emision),
          total_formatted: formatCurrency(f.total),
          saldo_pendiente_formatted: formatCurrency(f.saldo_pendiente),
          cancelado_formatted: formatCurrency(f.cancelado || 0)
        })),
        pagination: result.pagination,
        estadisticas: {
          ...estadisticas,
          valor_total_formatted: formatCurrency(estadisticas.valor_total),
          valor_cobrado_formatted: formatCurrency(estadisticas.valor_cobrado),
          saldo_pendiente_formatted: formatCurrency(estadisticas.saldo_pendiente),
          ticket_promedio_formatted: formatCurrency(estadisticas.ticket_promedio)
        }
      });
    } catch (error) {
      console.error('Error al obtener facturas:', error);
      res.status(500).render('error', {
        title: 'Error',
        message: 'Error al obtener las facturas',
        error: error
      });
    }
  }
  
  /**
   * Búsqueda avanzada de facturas
   */
  static async search(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const sortBy = req.query.sortBy || 'fecha_emision';
      const sortOrder = req.query.sortOrder || 'DESC';
      
      // Obtener filtros del query string
      const filters = {
        numero_factura: req.query.numero_factura,
        cliente_id: req.query.cliente_id,
        cliente_nombre: req.query.cliente_nombre,
        estado: req.query.estado,
        fecha_desde: req.query.fecha_desde,
        fecha_hasta: req.query.fecha_hasta,
        monto_desde: req.query.monto_desde,
        monto_hasta: req.query.monto_hasta,
        tipo_factura: req.query.tipo_factura,
        punto_venta: req.query.punto_venta,
        texto_libre: req.query.texto_libre
      };
      
      // Limpiar filtros vacíos
      Object.keys(filters).forEach(key => {
        if (!filters[key] || filters[key] === '') {
          delete filters[key];
        }
      });
      
      const result = await FacturaModel.searchFacturas(filters, page, limit, sortBy, sortOrder);
      
      // Obtener lista de clientes para el selector
      const clientes = await ClienteModel.getClientes(1, 1000);
      
      res.render('facturas/search', {
        title: 'Búsqueda Avanzada de Facturas - Sistema Integral',
        facturas: result.data.map(f => ({
          ...f,
          fecha_emision_formatted: formatDate(f.fecha_emision),
          fecha_vto_pago_formatted: formatDate(f.fecha_vto_pago),
          fecha_cobro_formatted: formatDate(f.fecha_cobro),
          total_formatted: formatCurrency(f.total),
          saldo_pendiente_formatted: formatCurrency(f.saldo_pendiente),
          cancelado_formatted: formatCurrency(f.cancelado || 0)
        })),
        pagination: result.pagination,
        filters: req.query,
        sortBy,
        sortOrder,
        clientes: clientes.data,
        estados: [
          { value: '1', name: 'Pendiente' },
          { value: '2', name: 'Pagada Parcial' },
          { value: '3', name: 'Pagada' },
          { value: '4', name: 'En Proceso' },
          { value: '5', name: 'Anulada' }
        ],
        tipos_factura: [
          { value: 'A', name: 'Factura A' },
          { value: 'B', name: 'Factura B' },
          { value: 'C', name: 'Factura C' },
          { value: 'M', name: 'Factura M' }
        ]
      });
    } catch (error) {
      console.error('Error en búsqueda de facturas:', error);
      res.status(500).render('error', {
        title: 'Error',
        message: 'Error en la búsqueda de facturas',
        error: error
      });
    }
  }
  
  /**
   * Búsqueda avanzada de facturas (método de instancia)
   */
  async busquedaAvanzada(req, res) {
    return await FacturasController.search(req, res);
  }
  
  /**
   * Obtener facturas por ID
   */
  async obtenerFacturaPorId(id) {
    return await FacturaModel.getFacturaById(id);
  }
  
  /**
   * Obtener clientes para filtros
   */
  async obtenerClientesParaFiltros() {
    const result = await ClienteModel.getClientes(1, 1000);
    return result.data;
  }
  
  /**
   * Obtener proyectos para filtros
   */
  async obtenerProyectosParaFiltros() {
    // TODO: Implementar modelo de proyectos
    return [];
  }
  
  /**
   * Marcar factura como pagada
   */
  async marcarComoPagada(id) {
    try {
      const success = await FacturaModel.updateFacturaField(id, 'estado', 'pagada');
      if (success) {
        await FacturaModel.updateFacturaField(id, 'fecha_pagada', new Date());
      }
      return { success: success, message: success ? 'Factura marcada como pagada' : 'Error al actualizar' };
    } catch (error) {
      throw new Error(`Error al marcar como pagada: ${error.message}`);
    }
  }
  
  /**
   * Autorizar factura
   */
  async autorizarFactura(id) {
    try {
      const success = await FacturaModel.updateFacturaField(id, 'estado', 'pendiente');
      if (success) {
        await FacturaModel.updateFacturaField(id, 'fecha_autorizada', new Date());
      }
      return { success: success, message: success ? 'Factura autorizada' : 'Error al autorizar' };
    } catch (error) {
      throw new Error(`Error al autorizar factura: ${error.message}`);
    }
  }
  
  /**
   * Anular factura
   */
  async anularFactura(id, motivo) {
    try {
      const success = await FacturaModel.updateFacturaField(id, 'estado', 'anulada');
      if (success) {
        await FacturaModel.updateFacturaField(id, 'fecha_anulada', new Date());
        if (motivo) {
          await FacturaModel.updateFacturaField(id, 'motivo_anulacion', motivo);
        }
      }
      return { success: success, message: success ? 'Factura anulada' : 'Error al anular' };
    } catch (error) {
      throw new Error(`Error al anular factura: ${error.message}`);
    }
  }
  
  /**
   * Enviar recordatorio de pago
   */
  async enviarRecordatorio(id) {
    try {
      // TODO: Implementar lógica de envío de recordatorios
      return { success: true, message: 'Recordatorio enviado (funcionalidad pendiente de implementar)' };
    } catch (error) {
      throw new Error(`Error al enviar recordatorio: ${error.message}`);
    }
  }
  
  /**
   * Generar PDF de factura
   */
  async generarPDF(req, res) {
    try {
      // TODO: Implementar generación de PDF
      res.status(501).json({ success: false, message: 'Generación de PDF pendiente de implementar' });
    } catch (error) {
      throw new Error(`Error al generar PDF: ${error.message}`);
    }
  }
  
  /**
   * Ver detalle de una factura específica
   */
  static async show(req, res) {
    try {
      const { id } = req.params;
      const factura = await FacturaModel.getFacturaById(id);
      
      if (!factura) {
        return res.status(404).render('error', {
          title: 'Error 404',
          message: 'Factura no encontrada'
        });
      }
      
      res.render('facturas/detalle', {
        title: `Factura ${factura.numero_factura} - Sistema Integral`,
        factura: {
          ...factura,
          fecha_emision_formatted: formatDate(factura.fecha_emision),
          fecha_vto_pago_formatted: formatDate(factura.fecha_vto_pago),
          fecha_cobro_formatted: formatDate(factura.fecha_cobro),
          fecha_vto_cae_formatted: formatDate(factura.fecha_vto_cae),
          total_formatted: formatCurrency(factura.total),
          cancelado_formatted: formatCurrency(factura.cancelado || 0),
          saldo_pendiente_formatted: formatCurrency((factura.total || 0) - (factura.cancelado || 0)),
          total_iva_10_formatted: formatCurrency(factura.total_iva_10 || 0),
          total_iva_21_formatted: formatCurrency(factura.total_iva_21 || 0),
          total_iva_27_formatted: formatCurrency(factura.total_iva_27 || 0),
          neto_iibb_formatted: formatCurrency(factura.neto_iibb || 0),
          detalles: (factura.detalles || []).map(detalle => ({
            ...detalle,
            precio_unitario_formatted: formatCurrency(detalle.precio_unitario || 0),
            importe_formatted: formatCurrency(detalle.importe || 0)
          }))
        }
      });
    } catch (error) {
      console.error('Error al obtener factura:', error);
      res.status(500).render('error', {
        title: 'Error',
        message: 'Error al obtener los detalles de la factura',
        error: error
      });
    }
  }

  /**
   * Obtiene el listado de facturas emitidas con paginación
   */
  static async getFacturasEmitidas(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      
      const { data: facturas, pagination } = await FacturaModel.getFacturasEmitidas(page, limit);
      
      res.render('facturas/emitidas', {
        title: 'Facturas Emitidas',
        facturas,
        pagination,
        currentPage: page,
        layout: 'main',
        helpers: {
          formatDate: function(date) {
            return date ? new Date(date).toLocaleDateString('es-AR') : '';
          },
          formatCurrency: function(amount) {
            return new Intl.NumberFormat('es-AR', {
              style: 'currency',
              currency: 'ARS'
            }).format(amount || 0);
          },
          getEstadoBadge: function(estado) {
            const estados = {
              1: { class: 'bg-warning', text: 'Pendiente' },
              2: { class: 'bg-success', text: 'Pagada' },
              3: { class: 'bg-danger', text: 'Anulada' },
              4: { class: 'bg-info', text: 'En proceso' },
              5: { class: 'bg-secondary', text: 'Rechazada' }
            };
            
            const estadoInfo = estados[estado] || { class: 'bg-secondary', text: 'Desconocido' };
            return `<span class="badge ${estadoInfo.class}">${estadoInfo.text}</span>`;
          }
        }
      });
    } catch (error) {
      console.error('Error al obtener facturas emitidas:', error);
      res.status(500).render('error', {
        title: 'Error',
        message: 'Ocurrió un error al obtener el listado de facturas',
        layout: 'main'
      });
    }
  }

  /**
   * Obtiene el detalle de una factura por su ID
   */
  static async getFacturaById(req, res) {
    try {
      const { id } = req.params;
      const factura = await FacturaModel.getFacturaById(id);
      
      if (!factura) {
        return res.status(404).render('error', {
          title: 'Error',
          message: 'Factura no encontrada',
          layout: 'main'
        });
      }
      
      // Formatear fechas y montos
      factura.fecha_emision = factura.fecha_emision ? new Date(factura.fecha_emision).toLocaleDateString('es-AR') : '';
      factura.fecha_pago = factura.fecha_pago ? new Date(factura.fecha_pago).toLocaleDateString('es-AR') : '';
      
      res.render('facturas/detalle', {
        title: `Factura #${factura.numero_factura}`,
        factura,
        layout: 'main',
        helpers: {
          formatCurrency: function(amount) {
            return new Intl.NumberFormat('es-AR', {
              style: 'currency',
              currency: 'ARS'
            }).format(amount || 0);
          },
          formatDate: function(date) {
            return date ? new Date(date).toLocaleDateString('es-AR') : '';
          },
          getEstadoNombre: function(estado) {
            return FacturaModel.getEstadoNombre(estado);
          }
        }
      });
    } catch (error) {
      console.error('Error al obtener factura:', error);
      res.status(500).render('error', {
        title: 'Error',
        message: 'Ocurrió un error al obtener los detalles de la factura',
        layout: 'main'
      });
    }
  }

  /**
   * Actualiza un campo de una factura
   */
  static async updateFactura(req, res) {
    try {
      const { id } = req.params;
      const { campo, valor } = req.body;
      
      const success = await FacturaModel.updateFacturaField(id, campo, valor);
      
      if (!success) {
        return res.status(404).json({ 
          success: false,
          error: 'Factura no encontrada o sin cambios realizados'
        });
      }
      
      res.json({ 
        success: true,
        message: 'Factura actualizada correctamente'
      });
      
    } catch (error) {
      console.error('Error al actualizar factura:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Busca facturas según criterios de búsqueda
   */
  static async buscarFacturas(req, res) {
    try {
      const { 
        numero_factura, 
        cliente_nombre, 
        fecha_desde, 
        fecha_hasta, 
        estado,
        page = 1,
        limit = 20
      } = req.query;
      
      const filters = {
        numero_factura,
        cliente_nombre,
        fecha_desde,
        fecha_hasta,
        estado: estado ? parseInt(estado) : undefined
      };
      
      const { data: facturas, pagination } = await FacturaModel.searchFacturas(
        filters, 
        parseInt(page), 
        parseInt(limit)
      );
      
      // Si es una petición AJAX, devolver JSON
      if (req.xhr || req.get('Content-Type') === 'application/json') {
        return res.json({
          success: true,
          data: facturas,
          pagination
        });
      }
      
      // Si no es AJAX, renderizar la vista
      res.render('facturas/resultados-busqueda', {
        title: 'Resultados de Búsqueda',
        facturas,
        pagination,
        currentPage: parseInt(page),
        filters,
        layout: 'main',
        helpers: {
          formatDate: (date) => date ? new Date(date).toLocaleDateString('es-AR') : '',
          formatCurrency: (amount) => new Intl.NumberFormat('es-AR', { 
            style: 'currency', 
            currency: 'ARS' 
          }).format(amount || 0),
          getEstadoBadge: (estado) => {
            const estados = {
              1: { class: 'bg-warning', text: 'Pendiente' },
              2: { class: 'bg-success', text: 'Pagada' },
              3: { class: 'bg-danger', text: 'Anulada' },
              4: { class: 'bg-info', text: 'En proceso' },
              5: { class: 'bg-secondary', text: 'Rechazada' }
            };
            
            const estadoInfo = estados[estado] || { class: 'bg-secondary', text: 'Desconocido' };
            return `<span class="badge ${estadoInfo.class}">${estadoInfo.text}</span>`;
          }
        }
      });
      
    } catch (error) {
      console.error('Error al buscar facturas:', error);
      
      if (req.xhr || req.get('Content-Type') === 'application/json') {
        return res.status(500).json({
          success: false,
          error: 'Error al realizar la búsqueda de facturas'
        });
      }
      
      res.status(500).render('error', {
        title: 'Error',
        message: 'Ocurrió un error al realizar la búsqueda',
        layout: 'main'
      });
    }
  }

  /**
   * Dashboard de facturas con estadísticas y facturas recientes
   */
  static async dashboard(req, res) {
    try {
      const estadisticas = await FacturaModel.getFacturasEstadisticas();
      const ultimasFacturas = await FacturaModel.getUltimasFacturas(10);
      const facturasVencidas = await FacturaModel.getFacturasVencidas();
      
      // Resumen del último mes
      const fechaDesde = new Date();
      fechaDesde.setMonth(fechaDesde.getMonth() - 1);
      const fechaHasta = new Date();
      
      const resumenMes = await FacturaModel.getResumenFinanciero(
        fechaDesde.toISOString().split('T')[0],
        fechaHasta.toISOString().split('T')[0]
      );
      
      res.render('facturas/dashboard', {
        title: 'Dashboard Facturas - Sistema Integral',
        estadisticas: {
          ...estadisticas,
          valor_total_formatted: formatCurrency(estadisticas.valor_total),
          valor_cobrado_formatted: formatCurrency(estadisticas.valor_cobrado),
          saldo_pendiente_formatted: formatCurrency(estadisticas.saldo_pendiente),
          ticket_promedio_formatted: formatCurrency(estadisticas.ticket_promedio)
        },
        resumenMes: {
          ...resumenMes,
          monto_total_formatted: formatCurrency(resumenMes.monto_total),
          monto_cobrado_formatted: formatCurrency(resumenMes.monto_cobrado),
          saldo_pendiente_formatted: formatCurrency(resumenMes.saldo_pendiente),
          ticket_promedio_formatted: formatCurrency(resumenMes.ticket_promedio)
        },
        ultimasFacturas: ultimasFacturas.map(f => ({
          ...f,
          fecha_emision_formatted: formatDate(f.fecha_emision),
          total_formatted: formatCurrency(f.total)
        })),
        facturasVencidas: facturasVencidas.map(f => ({
          ...f,
          fecha_emision_formatted: formatDate(f.fecha_emision),
          fecha_vto_pago_formatted: formatDate(f.fecha_vto_pago),
          total_formatted: formatCurrency(f.total),
          saldo_pendiente_formatted: formatCurrency(f.saldo_pendiente)
        }))
      });
    } catch (error) {
      console.error('Error en dashboard de facturas:', error);
      res.status(500).render('error', {
        title: 'Error',
        message: 'Error al cargar el dashboard de facturas',
        error: error
      });
    }
  }
  
  /**
   * API JSON para búsqueda paginada de facturas emitidas
   */
  static async searchFacturasJSON(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const sortBy = req.query.sortBy || 'fecha_emision';
      const sortOrder = req.query.sortOrder || 'DESC';
      const searchTerm = req.query.search || '';
      
      // Obtener filtros del query string
      const filters = {
        numero_factura: req.query.numero_factura,
        cliente_id: req.query.cliente_id,
        cliente_nombre: req.query.cliente_nombre,
        estado: req.query.estado,
        fecha_desde: req.query.fecha_desde,
        fecha_hasta: req.query.fecha_hasta,
        monto_desde: req.query.monto_desde,
        monto_hasta: req.query.monto_hasta,
        tipo_factura: req.query.tipo_factura,
        punto_venta: req.query.punto_venta,
        texto_libre: searchTerm || req.query.texto_libre
      };
      
      // Limpiar filtros vacíos
      Object.keys(filters).forEach(key => {
        if (!filters[key] || filters[key] === '') {
          delete filters[key];
        }
      });
      
      const result = await FacturaModel.searchFacturas(filters, page, limit, sortBy, sortOrder);
      
      // Formatear datos para respuesta JSON
      const formattedData = result.data.map(f => ({
        ...f,
        fecha_emision_formatted: formatDate(f.fecha_emision),
        fecha_vto_pago_formatted: formatDate(f.fecha_vto_pago),
        fecha_cobro_formatted: formatDate(f.fecha_cobro),
        total_formatted: formatCurrency(f.total),
        saldo_pendiente_formatted: formatCurrency(f.saldo_pendiente),
        cancelado_formatted: formatCurrency(f.cancelado || 0),
        estado_badge: getEstadoBadge(f.estado),
        estado_nombre: getEstadoNombre(f.estado)
      }));
      
      res.json({
        success: true,
        data: formattedData,
        pagination: result.pagination,
        filters: filters,
        sortBy: sortBy,
        sortOrder: sortOrder
      });
    } catch (error) {
      console.error('Error en búsqueda JSON de facturas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al buscar facturas',
        error: error.message
      });
    }
  }

  /**
   * API para obtener facturas de un cliente específico
   */
  static async getFacturasByCliente(req, res) {
    try {
      const { clienteId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      
      const filters = { cliente_id: clienteId };
      const result = await FacturaModel.searchFacturas(filters, page, limit);
      
      res.json({
        success: true,
        data: result.data.map(f => ({
          ...f,
          fecha_emision_formatted: formatDate(f.fecha_emision),
          total_formatted: formatCurrency(f.total),
          saldo_pendiente_formatted: formatCurrency(f.saldo_pendiente)
        })),
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error al obtener facturas del cliente:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener las facturas del cliente'
      });
    }
  }
  
  /**
   * Actualizar estado de una factura
   */
  static async updateEstado(req, res) {
    try {
      const { id } = req.params;
      const { estado, cancelado, fecha_cobro } = req.body;
      
      const success = await FacturaModel.updateEstadoFactura(id, estado, cancelado, fecha_cobro);
      
      if (success) {
        res.json({
          success: true,
          message: 'Estado de factura actualizado correctamente'
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Factura no encontrada'
        });
      }
    } catch (error) {
      console.error('Error al actualizar estado de factura:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar el estado de la factura'
      });
    }
  }
  
  /**
   * Exportar facturas a Excel
   */
  static async exportExcel(req, res) {
    try {
      // Obtener filtros del query string
      const filters = {
        numero_factura: req.query.numero_factura,
        cliente_id: req.query.cliente_id,
        cliente_nombre: req.query.cliente_nombre,
        estado: req.query.estado,
        fecha_desde: req.query.fecha_desde,
        fecha_hasta: req.query.fecha_hasta,
        monto_desde: req.query.monto_desde,
        monto_hasta: req.query.monto_hasta,
        tipo_factura: req.query.tipo_factura,
        punto_venta: req.query.punto_venta,
        texto_libre: req.query.texto_libre
      };
      
      // Limpiar filtros vacíos
      Object.keys(filters).forEach(key => {
        if (!filters[key] || filters[key] === '') {
          delete filters[key];
        }
      });
      
      // Obtener todas las facturas que coinciden con los filtros
      const result = await FacturaModel.searchFacturas(filters, 1, 10000);
      
      // Crear workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Facturas');
      
      // Configurar columnas
      worksheet.columns = [
        { header: 'N° Factura', key: 'numero_factura', width: 15 },
        { header: 'Fecha Emisión', key: 'fecha_emision', width: 15 },
        { header: 'Cliente', key: 'cliente_nombre', width: 30 },
        { header: 'Tipo', key: 'tipo_factura_nombre', width: 15 },
        { header: 'Estado', key: 'estado_nombre', width: 15 },
        { header: 'Total', key: 'total', width: 15 },
        { header: 'Cancelado', key: 'cancelado', width: 15 },
        { header: 'Saldo Pendiente', key: 'saldo_pendiente', width: 15 },
        { header: 'Fecha Vto. Pago', key: 'fecha_vto_pago', width: 15 },
        { header: 'Observaciones', key: 'observaciones', width: 40 }
      ];
      
      // Agregar datos
      result.data.forEach(factura => {
        worksheet.addRow({
          numero_factura: factura.numero_factura,
          fecha_emision: factura.fecha_emision ? new Date(factura.fecha_emision) : '',
          cliente_nombre: factura.cliente_nombre,
          tipo_factura_nombre: factura.tipo_factura_nombre,
          estado_nombre: factura.estado_nombre,
          total: factura.total || 0,
          cancelado: factura.cancelado || 0,
          saldo_pendiente: factura.saldo_pendiente || 0,
          fecha_vto_pago: factura.fecha_vto_pago ? new Date(factura.fecha_vto_pago) : '',
          observaciones: factura.observaciones || ''
        });
      });
      
      // Formatear encabezados
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      
      // Configurar formato para columnas de números
      ['E', 'F', 'G', 'H'].forEach(col => {
        worksheet.getColumn(col).numFmt = '#,##0.00';
      });
      
      // Configurar formato para columnas de fechas
      ['B', 'I'].forEach(col => {
        worksheet.getColumn(col).numFmt = 'dd/mm/yyyy';
      });
      
      // Configurar respuesta HTTP
      const fileName = `facturas_${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      
      // Enviar archivo
      await workbook.xlsx.write(res);
      res.end();
      
    } catch (error) {
      console.error('Error al exportar facturas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al exportar las facturas'
      });
    }
  }

  /**
   * Lista de facturas recibidas
   */
  static async recibidas(req, res) {
    try {
      res.render('facturas/index', {
        title: 'Facturas Recibidas - Sistema Integral',
        tipo: 'recibidas',
        breadcrumb: [
          { name: 'Inicio', url: '/' },
          { name: 'Facturas', url: '/facturas' },
          { name: 'Facturas Recibidas', active: true }
        ]
      });
    } catch (error) {
      console.error('Error al mostrar facturas recibidas:', error);
      res.status(500).render('error', {
        title: 'Error 500',
        message: 'Error al cargar las facturas recibidas'
      });
    }
  }

  /**
   * Mostrar formulario para crear nueva factura recibida
   */
  static async mostrarCrearRecibida(req, res) {
    try {
      // Obtener clientes para el select
      const clientesResult = await ClienteModel.getClientes(1, 1000);
      const clientes = clientesResult.data || [];

      res.render('facturas/crear', {
        title: 'Nueva Factura Recibida - Sistema Integral',
        clientes: clientes,
        tipo: 'recibida',
        breadcrumb: [
          { name: 'Inicio', url: '/' },
          { name: 'Facturas', url: '/facturas' },
          { name: 'Facturas Recibidas', url: '/facturas/recibidas' },
          { name: 'Nueva Factura Recibida', active: true }
        ]
      });
    } catch (error) {
      console.error('Error al mostrar formulario de crear factura recibida:', error);
      res.status(500).render('error', {
        title: 'Error 500',
        message: 'Error al cargar el formulario de nueva factura recibida'
      });
    }
  }

  /**
   * Crear nueva factura recibida
   */
  static async crearRecibida(req, res) {
    try {
      // Aquí se procesaría la creación de la factura recibida
      // Por ahora redirigimos a la lista
      console.log('Datos recibidos para nueva factura recibida:', req.body);
      
      // Temporal: redirigir a la lista de facturas recibidas
      res.redirect('/facturas/recibidas');
    } catch (error) {
      console.error('Error al crear factura recibida:', error);
      res.status(500).render('error', {
        title: 'Error 500',
        message: 'Error al crear la factura recibida'
      });
    }
  }

  // Métodos stub temporales para que las rutas funcionen
  static async ver(req, res) {
    res.status(501).send("Método ver no implementado aún");
  }

  static async verRecibida(req, res) {
    res.status(501).send("Método verRecibida no implementado aún");
  }

  static async editarEmitida(req, res) {
    res.status(501).send("Método editarEmitida no implementado aún");
  }

  static async editarRecibida(req, res) {
    res.status(501).send("Método editarRecibida no implementado aún");
  }

  static async actualizarEmitida(req, res) {
    res.status(501).send("Método actualizarEmitida no implementado aún");
  }

  static async actualizarRecibida(req, res) {
    res.status(501).send("Método actualizarRecibida no implementado aún");
  }

  static async getFacturasEmitidasAPI(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const sort = req.query.sort || 'fecha_emision';
      const order = (req.query.order || 'desc').toUpperCase();
      
      console.log(`📝 API: Obteniendo facturas emitidas - Página ${page}, Límite ${limit}, Sort: ${sort} ${order}`);
      
      // Obtener filtros del query string
      const filters = {
        numero_factura: req.query.numero_factura,
        cliente_id: req.query.cliente_id,
        cliente_nombre: req.query.cliente || req.query.search,
        estado: req.query.estado,
        fecha_desde: req.query.fecha_desde,
        fecha_hasta: req.query.fecha_hasta,
        monto_desde: req.query.monto_desde,
        monto_hasta: req.query.monto_hasta,
        tipo_factura: req.query.tipo_factura,
        punto_venta: req.query.punto_venta,
        texto_libre: req.query.search
      };
      
      // Limpiar filtros vacíos
      Object.keys(filters).forEach(key => {
        if (!filters[key] || filters[key] === '') {
          delete filters[key];
        }
      });
      
      console.log(`📝 Filtros procesados:`, filters);
      console.log(`🔍 Llamando a FacturaModel.searchFacturas con:`, { filters, page, limit, sort, order });
      
      const resultado = await FacturaModel.searchFacturas(filters, page, limit, sort, order);
      
      console.log(`📊 Resultado de búsqueda: ${resultado.data.length} facturas, Total: ${resultado.pagination.total}`);
      console.log(`📦 Primeros datos:`, resultado.data.slice(0, 2));
      
      res.json({
        success: true,
        data: resultado.data,
        pagination: resultado.pagination,
        filters: filters,
        sort: sort,
        order: order
      });
      
    } catch (error) {
      console.error('❌ Error en API de facturas emitidas:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener facturas emitidas',
        message: error.message,
        data: []
      });
    }
  }

  static async getFacturasRecibidasAPI(req, res) {
    res.status(501).json({message: "Método getFacturasRecibidasAPI no implementado aún"});
  }

  static async generarFactura(req, res) {
    res.status(501).send("Método generarFactura no implementado aún");
  }

  static async anularFactura(req, res) {
    res.status(501).send("Método anularFactura no implementado aún");
  }

  static async getDetalleFactura(req, res) {
    res.status(501).json({message: "Método getDetalleFactura no implementado aún"});
  }

  static async mostrarCrear(req, res) {
    res.status(501).send("Método mostrarCrear no implementado aún");
  }

  static async crear(req, res) {
    try {
      console.log('📝 Creando nueva factura...');
      console.log('📦 Datos recibidos:', req.body);

      const {
        cliente_id,
        proyecto_id,
        tipo_factura,
        punto_venta,
        numero_factura,
        fecha_emision,
        fecha_vencimiento,
        observaciones,
        items
      } = req.body;

      // Validaciones
      if (!cliente_id) {
        return res.status(400).json({
          success: false,
          message: 'Debe seleccionar un cliente'
        });
      }

      if (!tipo_factura) {
        return res.status(400).json({
          success: false,
          message: 'Debe seleccionar un tipo de factura'
        });
      }

      if (!punto_venta) {
        return res.status(400).json({
          success: false,
          message: 'Punto de venta es obligatorio'
        });
      }

      if (!numero_factura) {
        return res.status(400).json({
          success: false,
          message: 'Número de factura es obligatorio'
        });
      }

      if (!fecha_emision) {
        return res.status(400).json({
          success: false,
          message: 'Fecha de emisión es obligatoria'
        });
      }

      // Validar items
      if (!items || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Debe agregar al menos un item'
        });
      }

      const pool = require('../config/database');
      const { v4: uuidv4 } = require('uuid');

      // Crear factura
      const facturaId = uuidv4();
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

      // Calcular totales
      let subtotal = 0;
      let totalIva = 0;

      const itemsArray = Array.isArray(items) ? items : Object.values(items || {});
      
      itemsArray.forEach(item => {
        const cantidad = parseFloat(item.cantidad) || 0;
        const precio = parseFloat(item.precio_unitario) || 0;
        const ivaPorc = parseFloat(item.iva_porcentaje) || 0;
        
        const subtotalItem = cantidad * precio;
        const ivaItem = subtotalItem * (ivaPorc / 100);
        
        subtotal += subtotalItem;
        totalIva += ivaItem;
      });

      const total = subtotal + totalIva;

      // Construir número de factura completo
      const numeroFacturaCompleto = `${String(punto_venta).padStart(5, '0')}-${String(numero_factura).padStart(8, '0')}`;

      console.log('💾 Insertando factura:', {
        id: facturaId,
        numeroFacturaCompleto,
        cliente_id,
        tipo_factura,
        subtotal,
        totalIva,
        total
      });

      // Insertar factura
      const [resultFactura] = await pool.query(
        `INSERT INTO factura_ventas (
          id, persona_tercero_id, numero_factura_completo, numero_factura,
          punto_venta, tipo_factura, fecha_emision, fecha_vencimiento,
          subtotal, iva, total, observaciones, estado, activo, created, modified
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [
          facturaId,
          cliente_id,
          numeroFacturaCompleto,
          numero_factura,
          punto_venta,
          tipo_factura,
          fecha_emision,
          fecha_vencimiento || null,
          subtotal,
          totalIva,
          total,
          observaciones || null,
          1, // Estado: 1 = Pendiente
          now,
          now
        ]
      );

      console.log('✅ Factura insertada:', resultFactura);

      // Insertar items
      let itemIndex = 0;
      for (const item of itemsArray) {
        const itemId = uuidv4();
        const cantidad = parseFloat(item.cantidad) || 0;
        const precio = parseFloat(item.precio_unitario) || 0;
        const ivaPorc = parseFloat(item.iva_porcentaje) || 0;
        
        const subtotalItem = cantidad * precio;
        const ivaItem = subtotalItem * (ivaPorc / 100);
        const totalItem = subtotalItem + ivaItem;

        await pool.query(
          `INSERT INTO factura_venta_items (
            id, factura_venta_id, descripcion, cantidad, precio_unitario,
            iva_porcentaje, subtotal, iva, total, orden, activo, created, modified
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
          [
            itemId,
            facturaId,
            item.descripcion || '',
            cantidad,
            precio,
            ivaPorc,
            subtotalItem,
            ivaItem,
            totalItem,
            itemIndex++,
            now,
            now
          ]
        );
      }

      console.log('✅ Items insertados correctamente');

      // SIEMPRE retornar JSON (el JavaScript manejará la redirección)
      console.log('✅ Retornando JSON con éxito');
      return res.json({
        success: true,
        message: 'Factura creada correctamente',
        data: {
          id: facturaId,
          numero_factura_completo: numeroFacturaCompleto,
          total: total.toFixed(2),
          redirect_url: `/facturas/ver/${facturaId}`
        }
      });

    } catch (error) {
      console.error('❌ Error al crear factura:', error);
      
      const isAjax = req.xhr || 
                     req.headers['content-type']?.includes('application/json') ||
                     req.headers['accept']?.includes('application/json');
      
      if (isAjax) {
        return res.status(500).json({
          success: false,
          message: 'Error al crear factura: ' + error.message
        });
      }

      res.status(500).render('error', {
        title: 'Error',
        message: 'Error al crear la factura: ' + error.message,
        layout: 'main',
        user: req.user
      });
    }
  }

  static async actualizarEstado(req, res) {
    res.status(501).send("Método actualizarEstado no implementado aún");
  }

  static async marcarComoPagada(req, res) {
    res.status(501).send("Método marcarComoPagada no implementado aún");
  }

  static async generarPDF(req, res) {
    res.status(501).send("Método generarPDF no implementado aún");
  }

  static async resumenFinanciero(req, res) {
    res.status(501).send("Método resumenFinanciero no implementado aún");
  }

  static async exportarFacturasEmitidasExcel(req, res) {
    res.status(501).send("Método exportarFacturasEmitidasExcel no implementado aún");
  }

  static async exportarFacturasRecibidasExcel(req, res) {
    res.status(501).send("Método exportarFacturasRecibidasExcel no implementado aún");
  }

  static async buscar(req, res) {
    res.status(501).send("Método buscar no implementado aún");
  }

  static async exportarExcel(req, res) {
    res.status(501).send("Método exportarExcel no implementado aún");
  }
}

module.exports = FacturasController;

// Optimización para nueva factura - evitar timeout
const nuevaFacturaOptimizada = async (req, res) => {
    try {
        // Timeout de 30 segundos
        res.setTimeout(30000, () => {
            return res.status(504).json({ 
                error: 'Timeout al crear factura',
                mensaje: 'La operación está tardando más de lo esperado. Intente nuevamente.'
            });
        });

        // Cargar datos necesarios de forma más eficiente
        const [clientes, productos] = await Promise.all([
            db.query('SELECT id, razon_social, cuit FROM clientes WHERE activo = 1 ORDER BY razon_social LIMIT 100'),
            db.query('SELECT id, nombre, precio FROM productos WHERE activo = 1 ORDER BY nombre LIMIT 50')
        ]);

        res.render('facturas/nueva', {
            title: 'Nueva Factura',
            clientes: clientes,
            productos: productos,
            layout: 'main'
        });

    } catch (error) {
        console.error('Error en nueva factura:', error);
        res.status(500).render('error', {
            message: 'Error al cargar formulario de nueva factura',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};

module.exports.nuevaFacturaOptimizada = nuevaFacturaOptimizada;
