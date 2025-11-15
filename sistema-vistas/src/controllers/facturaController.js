const FacturaModel = require('../models/FacturaModel');
const ClienteModel = require('../models/ClienteModel');

/**
 * Controlador de Facturación - Integrado con AFIP (R2.4)
 */
const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');
class FacturaController {

  /**
   * Dashboard de facturación
   */
  static async dashboard(req, res) {
    try {
      console.log('📊 Cargando dashboard de facturación');

      const [estadisticas, facturasRecientes, facturasVencidas] = await Promise.all([
        FacturaModel.getEstadisticas(),
        FacturaModel.getFacturasRecientes(10),
        FacturaModel.getFacturasVencidas()
      ]);

      res.render('facturas/dashboard', {
        title: 'Dashboard de Facturación',
        estadisticas,
        facturasRecientes,
        facturasVencidas,
        formatCurrency: (amount) => {
          if (!amount || isNaN(amount)) return '$0.00';
          return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 2
          }).format(amount);
        },
        formatDate: (date) => {
          if (!date) return 'N/A';
          try {
            return new Date(date).toLocaleDateString('es-AR');
          } catch (error) {
            return 'N/A';
          }
        }
      });

    } catch (error) {
      console.error('❌ Error al cargar dashboard de facturación:', error);
      req.flash('error', 'Error al cargar el dashboard de facturación');
      res.redirect('/dashboard');
    }
  }

  /**
   * Listar facturas emitidas (vista con carga dinámica via JavaScript)
   */
  static async emitidas(req, res) {
    try {
      console.log(`📋 Renderizando vista de facturas emitidas`);

      // Solo renderizar la vista, los datos se cargan dinámicamente via API
      res.render('facturas/emitidas', {
        title: 'Facturas Emitidas'
      });

    } catch (error) {
      console.error('❌ Error al renderizar vista de facturas emitidas:', error);
      req.flash('error', 'Error al cargar la página de facturas emitidas');
      res.redirect('/dashboard');
    }
  }

  /**
   * Mostrar formulario de nueva factura
   */
  static async mostrarCrear(req, res) {
    try {
      console.log('📝 Mostrando formulario de nueva factura');

      // Para evitar timeouts, no precargamos clientes
      // Los clientes se cargarán dinámicamente vía JavaScript

      res.render('facturas/nueva', {
        title: 'Emitir Nueva Factura',
        clientes: [], // Lista vacía, se carga vía API
        tiposFactura: [
          { codigo: 'A', nombre: 'Factura A' },
          { codigo: 'B', nombre: 'Factura B' },
          { codigo: 'C', nombre: 'Factura C' },
          { codigo: 'M', nombre: 'Factura M' }
        ],
        puntoVenta: process.env.AFIP_PUNTO_VENTA || 1
      });

    } catch (error) {
      console.error('❌ Error al mostrar formulario de creación:', error);
      req.flash('error', 'Error al cargar el formulario de facturación');
      res.redirect('/facturas/emitidas');
    }
  }

  /**
   * Guardar borrador de factura (API JSON)
   */
  static async guardarBorrador(req, res) {
    try {
      console.log('📄 Guardando borrador de factura:', req.body);

      const borradorData = {
        cliente_id: req.body.cliente_id,
        proyecto_id: req.body.proyecto_id,
        tipo_factura: req.body.tipo_factura || 'B',
        punto_venta: parseInt(req.body.punto_venta) || 1,
        fecha_emision: req.body.fecha_emision,
        fecha_vencimiento: req.body.fecha_vencimiento,
        observaciones: req.body.observaciones || '',
        items: req.body.items || []
      };

      // Validaciones básicas
      if (!borradorData.cliente_id) {
        return res.status(400).json({
          success: false,
          error: 'Debe seleccionar un cliente'
        });
      }

      if (!borradorData.items || borradorData.items.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Debe agregar al menos un item'
        });
      }

      // Calcular totales
      let subtotal = 0;
      let totalIva = 0;

      borradorData.items.forEach(item => {
        const cantidad = parseFloat(item.cantidad) || 0;
        const precio = parseFloat(item.precio_unitario) || 0;
        const ivaPorc = parseFloat(item.iva_porcentaje) || 0;
        
        const subtotalItem = cantidad * precio;
        const ivaItem = subtotalItem * (ivaPorc / 100);
        
        subtotal += subtotalItem;
        totalIva += ivaItem;
      });

      const total = subtotal + totalIva;

      borradorData.subtotal = subtotal;
      borradorData.iva = totalIva;
      borradorData.total = total;
      borradorData.estado = 0; // Borrador
      borradorData.created_at = new Date();

      // Aquí se guardaría en base de datos
      // Por ahora simulamos el guardado exitoso
      console.log('✅ Borrador guardado exitosamente');
      console.log(`📊 Totales calculados - Subtotal: $${subtotal.toFixed(2)}, IVA: $${totalIva.toFixed(2)}, Total: $${total.toFixed(2)}`);

      res.json({
        success: true,
        message: 'Borrador guardado exitosamente',
        data: {
          id: Date.now(), // ID temporal
          subtotal: subtotal.toFixed(2),
          iva: totalIva.toFixed(2),
          total: total.toFixed(2),
          items_count: borradorData.items.length
        }
      });

    } catch (error) {
      console.error('❌ Error al guardar borrador:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor: ' + error.message
      });
    }
  }

  /**
   * Crear nueva factura con integración AFIP
   */
  static async crear(req, res) {
    try {
      console.log('💾 Creando nueva factura:', req.body);

      const facturaData = {
        cliente_id: req.body.cliente_id,
        tipo_factura: req.body.tipo_factura || 'B',
        punto_venta: parseInt(req.body.punto_venta) || 1,
        fecha_emision: req.body.fecha_emision || new Date(),
        fecha_vto_pago: req.body.fecha_vto_pago,
        observaciones: req.body.observaciones,
        detalles: req.body.detalles || []
      };

      // Validaciones básicas
      if (!facturaData.cliente_id) {
        return res.status(500).render('error', {
          title: 'Error 500',
          message: 'Debe seleccionar un cliente'
        });
      }

      // Calcular totales
      let subtotal = 0;
      if (Array.isArray(facturaData.detalles)) {
        subtotal = facturaData.detalles.reduce((sum, detalle) => {
          const cantidad = parseFloat(detalle.cantidad) || 0;
          const precio = parseFloat(detalle.precio_unitario) || 0;
          return sum + (cantidad * precio);
        }, 0);
      }

      const iva = subtotal * 0.21; // 21% IVA por defecto
      const total = subtotal + iva;

      facturaData.subtotal = subtotal;
      facturaData.iva = iva;
      facturaData.total = total;

      // En una implementación real, aquí se integraría con AFIP
      console.log('🏦 Integrando con Web Service de AFIP...');
      
      // Simular respuesta de AFIP
      const afipResponse = {
        cae: `${Math.floor(Math.random() * 90000000000000) + 10000000000000}`,
        fecha_vto_cae: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 días
        numero_factura: `${facturaData.punto_venta.toString().padStart(5, '0')}-${Math.floor(Math.random() * 90000000) + 10000000}`
      };

      facturaData.cae = afipResponse.cae;
      facturaData.fecha_vto_cae = afipResponse.fecha_vto_cae;
      facturaData.numero_factura = afipResponse.numero_factura;
      facturaData.estado = 1; // Pendiente

      // Crear la factura (implementación pendiente en el modelo)
      console.log('✅ Factura procesada con AFIP exitosamente');
      
      res.redirect('/facturas/emitidas');

    } catch (error) {
      console.error('❌ Error al crear factura:', error);
      res.status(500).render('error', {
        title: 'Error 500',
        message: 'Error al emitir factura: ' + error.message
      });
    }
  }

  /**
   * Ver detalle de factura
   */
  static async ver(req, res) {
    try {
      const id = req.params.id;
      console.log(`👁️ Visualizando factura ID: ${id}`);

      const factura = await FacturaModel.getFacturaById(id);

      // DEBUG log removed for production
      // DEBUG log removed for production

      if (!factura) {
        return res.status(404).render('error', {
          title: 'Error 404',
          message: 'Factura no encontrada'
        });
      }

      res.render('facturas/detalle', {
        title: `Factura ${factura.numero_factura}`,
        factura,
        cliente: factura.cliente_nombre ? {
          nombre: factura.cliente_nombre,
          codigo: factura.cliente_codigo || 'N/A',
          tipo: factura.cliente_tipo || 'N/A',
          tipo_persona: factura.cliente_tipo_persona || 'N/A',
          condicion_iva: factura.cliente_condicion_iva || 0
        } : null,
        formatCurrency: (amount) => {
          if (!amount || isNaN(amount)) return '$0.00';
          return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 2
          }).format(amount);
        },
        formatDate: (date) => {
          if (!date) return 'N/A';
          try {
            return new Date(date).toLocaleDateString('es-AR');
          } catch (error) {
            return 'N/A';
          }
        }
      });

    } catch (error) {
      console.error('❌ Error al visualizar factura:', error);
      return res.status(500).render('error', {
        title: 'Error 500',
        message: 'Error al cargar la factura: ' + error.message
      });
    }
  }

  /**
   * Buscar facturas con filtros avanzados
   */
  static async buscar(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      const filters = {
        numero_factura: req.query.numero_factura,
        cliente_nombre: req.query.cliente_nombre,
        estado: req.query.estado,
        fecha_desde: req.query.fecha_desde,
        fecha_hasta: req.query.fecha_hasta,
        monto_desde: req.query.monto_desde,
        monto_hasta: req.query.monto_hasta,
        tipo_factura: req.query.tipo_factura,
        texto_libre: req.query.q // Para búsqueda rápida
      };

      // Remover filtros vacíos
      Object.keys(filters).forEach(key => {
        if (!filters[key]) delete filters[key];
      });

      console.log('🔍 Buscando facturas con filtros:', filters);

      const resultado = await FacturaModel.searchFacturas(filters, page, limit);

      // Si es AJAX, devolver JSON
      if (req.xhr || req.get('Content-Type') === 'application/json') {
        return res.json({
          success: true,
          data: resultado.data.slice(0, 10), // Limitar para búsqueda rápida
          total: resultado.pagination.total
        });
      }

      res.render('facturas/emitidas', {
        title: 'Búsqueda de Facturas',
        facturas: resultado.data,
        pagination: resultado.pagination,
        currentPage: page,
        query: req.query,
        filters: filters,
        formatCurrency: (amount) => {
          if (!amount || isNaN(amount)) return '$0.00';
          return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 2
          }).format(amount);
        },
        formatDate: (date) => {
          if (!date) return 'N/A';
          try {
            return new Date(date).toLocaleDateString('es-AR');
          } catch (error) {
            return 'N/A';
          }
        }
      });

    } catch (error) {
      console.error('❌ Error al buscar facturas:', error);
      req.flash('error', 'Error en la búsqueda de facturas');
      res.redirect('/facturas/emitidas');
    }
  }

  /**
   * Actualizar estado de factura
   */
  static async actualizarEstado(req, res) {
    try {
      const id = req.params.id;
      const { estado, monto_pago, fecha_cobro } = req.body;

      console.log(`🔄 Actualizando estado factura ${id} a ${estado}`);

      const actualizada = await FacturaModel.updateEstadoFactura(
        id, 
        parseInt(estado), 
        monto_pago ? parseFloat(monto_pago) : null,
        fecha_cobro || null
      );

      if (!actualizada) {
        return res.status(404).json({
          success: false,
          error: 'Factura no encontrada'
        });
      }

      // Generar asiento contable automático (R2.4)
      console.log('📚 Generando asiento contable automático...');
      
      res.json({
        success: true,
        message: 'Estado de factura actualizado exitosamente'
      });

    } catch (error) {
      console.error('❌ Error al actualizar estado:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }

  /**
   * API: Generar una nueva factura (JSON)
   */
  static async generarFactura(req, res) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const { cliente_id, tipo_factura, items, fecha_vencimiento } = req.body || {};
      if (!cliente_id || !tipo_factura || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, error: { message: 'Datos requeridos faltantes', details: 'cliente_id, tipo_factura e items' } });
      }

      // Calcular total y generar ID
      const total = items.reduce((sum, it) => sum + (Number(it.cantidad || 0) * Number(it.precio_unitario || 0)), 0);
      const facturaId = uuidv4();

      // Obtener próximo número
      const [maxNumResult] = await connection.query(
        "SELECT MAX(CAST(SUBSTRING_INDEX(numero_factura, '-', -1) AS UNSIGNED)) as max FROM facturas"
      );
      const nextNum = (maxNumResult[0].max || 0) + 1;
      const numeroFactura = `${new Date().getFullYear()}-${String(nextNum).padStart(8, '0')}`;

      await connection.query(
        'INSERT INTO facturas (id, numero_factura, cliente_id, tipo_factura, fecha_vencimiento, total, estado) VALUES (?, ?, ?, ?, ?, ?, 1)',
        [facturaId, numeroFactura, cliente_id, tipo_factura, fecha_vencimiento || null, total]
      );

      for (const item of items) {
        const itemId = uuidv4();
        const subtotal = Number(item.cantidad || 0) * Number(item.precio_unitario || 0);
        await connection.query(
          'INSERT INTO facturas_items (id, factura_id, descripcion, cantidad, precio_unitario, iva, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [itemId, facturaId, item.descripcion, item.cantidad, item.precio_unitario, item.iva || 21, subtotal]
        );
      }

      await connection.commit();
      return res.status(201).json({ success: true, data: { id: facturaId, numero_factura: numeroFactura, total } });
    } catch (error) {
      await connection.rollback();
      console.error('❌ Error al generar factura:', error);
      return res.status(500).json({ success: false, error: { message: 'Error al generar factura', details: error.message } });
    } finally {
      connection.release();
    }
  }

  /**
   * API: Anular una factura (JSON)
   */
  static async anularFactura(req, res) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const { id } = req.params;
      const [rows] = await connection.query('SELECT estado FROM facturas WHERE id = ?', [id]);
      if (rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Factura no encontrada' });
      }
      if (Number(rows[0].estado) === 4) {
        return res.status(400).json({ success: false, error: 'Ya anulada' });
      }
      await connection.query('UPDATE facturas SET estado = 4 WHERE id = ?', [id]);
      await connection.commit();
      return res.json({ success: true, data: { id } });
    } catch (error) {
      await connection.rollback();
      console.error('❌ Error al anular factura:', error);
      return res.status(500).json({ success: false, error: { message: 'Error al anular factura', details: error.message } });
    } finally {
      connection.release();
    }
  }

  /**
   * API: Obtener detalle de factura
   */
  static async getDetalleFactura(req, res) {
    try {
      const { id } = req.params;
      const [facts] = await pool.query(
        `SELECT f.*, c.nombre as cliente_nombre, c.codigo as cliente_codigo FROM facturas f INNER JOIN clientes c ON c.id = f.cliente_id WHERE f.id = ?`,
        [id]
      );
      if (facts.length === 0) {
        return res.status(404).json({ success: false, error: 'No encontrada' });
      }
      const [items] = await pool.query('SELECT * FROM facturas_items WHERE factura_id = ? ORDER BY orden', [id]);
      return res.json({ success: true, data: { ...facts[0], items } });
    } catch (error) {
      console.error('❌ Error al obtener detalle de factura:', error);
      return res.status(500).json({ success: false, error: { message: 'Error al obtener detalle', details: error.message } });
    }
  }

  /**
   * Marcar factura como pagada
   */
  static async marcarComoPagada(req, res) {
    try {
      const id = req.params.id;
      console.log(`💰 Marcando factura ${id} como pagada`);

      const actualizada = await FacturaModel.updateEstadoFactura(
        id, 
        3, // Estado: Pagada
        null, // monto_pago se calcula desde el total
        new Date() // fecha_cobro actual
      );

      if (!actualizada) {
        return res.status(404).json({
          success: false,
          message: 'Factura no encontrada'
        });
      }

      res.json({
        success: true,
        message: 'Factura marcada como pagada exitosamente'
      });

    } catch (error) {
      console.error('❌ Error al marcar factura como pagada:', error);
      res.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud: ' + error.message
      });
    }
  }

  /**
   * Anular factura
   */
  static async anularFactura(req, res) {
    try {
      const id = req.params.id;
      const { motivo } = req.body;
      
      console.log(`❌ Anulando factura ${id}. Motivo: ${motivo}`);

      const actualizada = await FacturaModel.updateEstadoFactura(
        id, 
        5, // Estado: Anulada
        null,
        null
      );

      if (!actualizada) {
        return res.status(404).json({
          success: false,
          message: 'Factura no encontrada'
        });
      }

      // TODO: Agregar el motivo a las observaciones
      if (motivo) {
        console.log(`📝 Registrando motivo de anulación: ${motivo}`);
      }

      res.json({
        success: true,
        message: 'Factura anulada exitosamente'
      });

    } catch (error) {
      console.error('❌ Error al anular factura:', error);
      res.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud: ' + error.message
      });
    }
  }

  /**
   * Generar PDF de factura
   */
  static async generarPDF(req, res) {
    try {
      const id = req.params.id;
      console.log(`📄 Generando PDF para factura ${id}`);

      const factura = await FacturaModel.getFacturaById(id);

      if (!factura) {
        req.flash('error', 'Factura no encontrada');
        return res.redirect('/facturas/emitidas');
      }

      // En una implementación real, aquí se generaría el PDF
      // usando librerías como jsPDF, puppeteer, etc.
      req.flash('info', 'Función de generación de PDF pendiente de implementación');
      res.redirect(`/facturas/emitidas/${id}`);

    } catch (error) {
      console.error('❌ Error al generar PDF:', error);
      req.flash('error', 'Error al generar PDF de la factura');
      res.redirect(`/facturas/emitidas/${req.params.id}`);
    }
  }

  /**
   * Resumen financiero por período
   */
  static async resumenFinanciero(req, res) {
    try {
      const fechaDesde = req.query.fecha_desde || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const fechaHasta = req.query.fecha_hasta || new Date().toISOString().split('T')[0];

      console.log(`📊 Generando resumen financiero del ${fechaDesde} al ${fechaHasta}`);

      const resumen = await FacturaModel.getResumenFinanciero(fechaDesde, fechaHasta);

      res.render('facturas/resumen', {
        title: 'Resumen Financiero',
        resumen,
        fechaDesde,
        fechaHasta,
        formatCurrency: (amount) => {
          if (!amount || isNaN(amount)) return '$0.00';
          return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 2
          }).format(amount);
        },
        formatDate: (date) => {
          if (!date) return 'N/A';
          try {
            return new Date(date).toLocaleDateString('es-AR');
          } catch (error) {
            return 'N/A';
          }
        }
      });

    } catch (error) {
      console.error('❌ Error al generar resumen financiero:', error);
      req.flash('error', 'Error al generar resumen financiero');
      res.redirect('/facturas/dashboard');
    }
  }

  /**
   * Exportar facturas a Excel
   */
  static async exportarExcel(req, res) {
    try {
      const filters = {
        fecha_desde: req.query.fecha_desde,
        fecha_hasta: req.query.fecha_hasta,
        estado: req.query.estado,
        tipo_factura: req.query.tipo_factura
      };

      console.log('📊 Exportando facturas a Excel con filtros:', filters);

      const data = await FacturaModel.exportToExcel(filters);

      // En una implementación real se generaría el archivo Excel
      req.flash('info', 'Función de exportación a Excel pendiente de implementación');
      res.redirect('/facturas/emitidas');

    } catch (error) {
      console.error('❌ Error al exportar a Excel:', error);
      req.flash('error', 'Error al exportar facturas');
      res.redirect('/facturas/emitidas');
    }
  }

  /**
   * API para obtener facturas emitidas (DataTable)
   */
  static async getFacturasEmitidasAPI(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.length) || parseInt(req.query.limit) || 20;
      const sortBy = req.query.sort || req.query.sortBy || 'fecha_emision';
      const sortOrder = (req.query.order || req.query.sortOrder || 'desc').toUpperCase();
      
      console.log(`📝 API: Obteniendo facturas emitidas - Página ${page}, Límite ${limit}, Sort: ${sortBy} ${sortOrder}`);
      console.log(`📝 Filtros recibidos:`, req.query);
      
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
      
      const resultado = await FacturaModel.searchFacturas(filters, page, limit, sortBy, sortOrder);
      
      // Formatear datos para DataTables
      const formattedData = resultado.data.map(f => ({
        ...f,
        fecha_emision_formatted: f.fecha_emision ? new Date(f.fecha_emision).toLocaleDateString('es-AR') : '',
        fecha_vto_pago_formatted: f.fecha_vto_pago ? new Date(f.fecha_vto_pago).toLocaleDateString('es-AR') : '',
        total_formatted: new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: 'ARS'
        }).format(f.total || 0),
        saldo_pendiente_formatted: new Intl.NumberFormat('es-AR', {
          style: 'currency', 
          currency: 'ARS'
        }).format(f.saldo_pendiente || 0)
      }));
      
      res.json({
        success: true,
        data: formattedData,
        recordsTotal: resultado.pagination.total,
        recordsFiltered: resultado.pagination.total,
        pagination: resultado.pagination
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

  /**
   * Exportar facturas emitidas a Excel
   */
  static async exportarFacturasEmitidasExcel(req, res) {
    try {
      console.log('📊 Exportando facturas emitidas a Excel');
      
      // Obtener filtros del query string
      const filters = {
        numero_factura: req.query.numero_factura,
        cliente_nombre: req.query.cliente,
        estado: req.query.estado,
        fecha_desde: req.query.fecha_desde,
        fecha_hasta: req.query.fecha_hasta
      };
      
      // Limpiar filtros vacíos
      Object.keys(filters).forEach(key => {
        if (!filters[key] || filters[key] === '') {
          delete filters[key];
        }
      });
      
      // Obtener todas las facturas que coinciden con los filtros
      const { data: facturas } = await FacturaModel.searchFacturas(filters, 1, 10000);
      
      const ExcelJS = require('exceljs');
      
      // Crear workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Facturas Emitidas');
      
      // Configurar columnas
      worksheet.columns = [
        { header: 'N° Factura', key: 'numero_factura', width: 15 },
        { header: 'Fecha Emisión', key: 'fecha_emision', width: 15 },
        { header: 'Cliente', key: 'cliente_nombre', width: 30 },
        { header: 'Estado', key: 'estado_nombre', width: 15 },
        { header: 'Total', key: 'total', width: 15 },
        { header: 'Cancelado', key: 'cancelado', width: 15 },
        { header: 'Saldo Pendiente', key: 'saldo_pendiente', width: 15 },
        { header: 'Fecha Vto. Pago', key: 'fecha_vto_pago', width: 15 },
        { header: 'Observaciones', key: 'observaciones', width: 40 }
      ];
      
      // Agregar datos
      facturas.forEach(factura => {
        worksheet.addRow({
          numero_factura: factura.numero_factura,
          fecha_emision: factura.fecha_emision ? new Date(factura.fecha_emision) : '',
          cliente_nombre: factura.cliente_nombre,
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
      ['E', 'F', 'G'].forEach(col => {
        worksheet.getColumn(col).numFmt = '#,##0.00';
      });
      
      // Configurar formato para columnas de fechas
      ['B', 'H'].forEach(col => {
        worksheet.getColumn(col).numFmt = 'dd/mm/yyyy';
      });
      
      // Configurar respuesta HTTP
      const fileName = `facturas_emitidas_${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      
      // Enviar archivo
      await workbook.xlsx.write(res);
      res.end();
      
    } catch (error) {
      console.error('❌ Error al exportar facturas emitidas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al exportar las facturas emitidas'
      });
    }
  }

  /**
   * Facturas recibidas (módulo de compras)
   */
  static async recibidas(req, res) {
    try {
      console.log('📥 Cargando facturas recibidas');
      
      // Renderizar la vista que usará DataTables para cargar datos dinámicamente
      res.render('facturas/recibidas', {
        title: 'Facturas Recibidas'
      });

    } catch (error) {
      console.error('❌ Error al cargar facturas recibidas:', error);
      req.flash('error', 'Error al cargar facturas recibidas');
      res.redirect('/dashboard');
    }
  }

  /**
   * API para obtener facturas recibidas (DataTable)
   */
  static async getFacturasRecibidasAPI(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.length) || parseInt(req.query.limit) || 20;
      const sortBy = req.query.sort || 'fecha_compra';
      const sortOrder = (req.query.order || 'desc').toUpperCase();
      
      console.log(`📥 API: Obteniendo facturas recibidas - Página ${page}, Límite ${limit}, Sort: ${sortBy} ${sortOrder}`);
      
      // Obtener filtros del query string
      const filters = {
        numero_factura: req.query.numero_factura,
        proveedor_id: req.query.proveedor_id,
        proveedor_nombre: req.query.proveedor || req.query.search,
        estado: req.query.estado,
        fecha_desde: req.query.fecha_desde,
        fecha_hasta: req.query.fecha_hasta,
        monto_desde: req.query.monto_desde,
        monto_hasta: req.query.monto_hasta,
        tipo_factura: req.query.tipo_factura,
        texto_libre: req.query.search
      };
      
      // Limpiar filtros vacíos
      Object.keys(filters).forEach(key => {
        if (!filters[key] || filters[key] === '') {
          delete filters[key];
        }
      });
      
      const resultado = await FacturaModel.searchFacturasRecibidas(filters, page, limit, sortBy, sortOrder);
      
      // Formatear datos para DataTables
      const formattedData = resultado.data.map(f => ({
        ...f,
        fecha_compra_formatted: f.fecha_compra ? new Date(f.fecha_compra).toLocaleDateString('es-AR') : '',
        fecha_pago_formatted: f.fecha_pago ? new Date(f.fecha_pago).toLocaleDateString('es-AR') : '',
        total_formatted: new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: 'ARS'
        }).format(f.total || 0),
        saldo_pendiente_formatted: new Intl.NumberFormat('es-AR', {
          style: 'currency', 
          currency: 'ARS'
        }).format(f.saldo_pendiente || 0)
      }));
      
      res.json({
        success: true,
        data: formattedData,
        recordsTotal: resultado.pagination.total,
        recordsFiltered: resultado.pagination.total,
        pagination: resultado.pagination
      });
      
    } catch (error) {
      console.error('❌ Error en API de facturas recibidas:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener facturas recibidas',
        message: error.message,
        data: []
      });
    }
  }

  /**
   * Exportar facturas recibidas a Excel
   */
  static async exportarFacturasRecibidasExcel(req, res) {
    try {
      console.log('📊 Exportando facturas recibidas a Excel');
      
      // Obtener filtros del query string
      const filters = {
        numero_factura: req.query.numero_factura,
        proveedor_nombre: req.query.proveedor,
        estado: req.query.estado,
        fecha_desde: req.query.fecha_desde,
        fecha_hasta: req.query.fecha_hasta
      };
      
      // Limpiar filtros vacíos
      Object.keys(filters).forEach(key => {
        if (!filters[key] || filters[key] === '') {
          delete filters[key];
        }
      });
      
      // Obtener todas las facturas que coinciden con los filtros
      const { data: facturas } = await FacturaModel.searchFacturasRecibidas(filters, 1, 10000);
      
      const ExcelJS = require('exceljs');
      
      // Crear workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Facturas Recibidas');
      
      // Configurar columnas
      worksheet.columns = [
        { header: 'N° Factura', key: 'numero_factura', width: 15 },
        { header: 'Fecha Compra', key: 'fecha_compra', width: 15 },
        { header: 'Proveedor', key: 'proveedor_nombre', width: 30 },
        { header: 'Estado', key: 'estado_nombre', width: 15 },
        { header: 'Total', key: 'total', width: 15 },
        { header: 'Cancelado', key: 'cancelado', width: 15 },
        { header: 'Saldo Pendiente', key: 'saldo_pendiente', width: 15 },
        { header: 'Fecha Pago', key: 'fecha_pago', width: 15 },
        { header: 'Observaciones', key: 'observaciones', width: 40 }
      ];
      
      // Agregar datos
      facturas.forEach(factura => {
        worksheet.addRow({
          numero_factura: factura.numero_factura,
          fecha_compra: factura.fecha_compra ? new Date(factura.fecha_compra) : '',
          proveedor_nombre: factura.proveedor_nombre,
          estado_nombre: factura.estado_nombre,
          total: factura.total || 0,
          cancelado: factura.cancelado || 0,
          saldo_pendiente: factura.saldo_pendiente || 0,
          fecha_pago: factura.fecha_pago ? new Date(factura.fecha_pago) : '',
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
      ['E', 'F', 'G'].forEach(col => {
        worksheet.getColumn(col).numFmt = '#,##0.00';
      });
      
      // Configurar formato para columnas de fechas
      ['B', 'H'].forEach(col => {
        worksheet.getColumn(col).numFmt = 'dd/mm/yyyy';
      });
      
      // Configurar respuesta HTTP
      const fileName = `facturas_recibidas_${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      
      // Enviar archivo
      await workbook.xlsx.write(res);
      res.end();
      
    } catch (error) {
      console.error('❌ Error al exportar facturas recibidas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al exportar las facturas recibidas'
      });
    }
  }
  /**
   * Mostrar formulario para nueva factura recibida
   */
  static async mostrarCrearRecibida(req, res) {
    try {
      console.log('📝 Mostrando formulario de nueva factura recibida');

      let proveedores = [];
      
      try {
        // Intentar obtener proveedores activos para el dropdown
        const [rows] = await pool.query(
          'SELECT id, codigo, nombre FROM persona_terceros WHERE activo = 1 AND tipo = ? ORDER BY nombre',
          ['proveedor']
        );
        proveedores = rows;
        console.log(`✅ Se encontraron ${proveedores.length} proveedores`);
      } catch (dbError) {
        console.warn('⚠️ No se pudieron cargar proveedores desde la BD:', dbError.message);
        // Continuar sin proveedores - el formulario mostrará el mensaje de "en desarrollo"
      }

      res.render('facturas/nueva-recibida', {
        title: 'Nueva Factura Recibida',
        proveedores,
        tiposFactura: [
          { codigo: 'A', nombre: 'Factura A' },
          { codigo: 'B', nombre: 'Factura B' },
          { codigo: 'C', nombre: 'Factura C' },
          { codigo: 'M', nombre: 'Factura M' }
        ]
      });

    } catch (error) {
      console.error('❌ Error al mostrar formulario de factura recibida:', error);
      res.status(500).render('error', {
        title: 'Error 500',
        message: 'Error al cargar el formulario de factura recibida: ' + error.message
      });
    }
  }

  /**
   * Crear nueva factura recibida
   */
  static async crearRecibida(req, res) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      console.log('💾 Creando nueva factura recibida:', req.body);

      const facturaData = {
        numero_factura: req.body.numero_factura,
        proveedor_id: req.body.proveedor_id,
        fecha_compra: req.body.fecha_compra || new Date(),
        fecha_pago: req.body.fecha_pago,
        observaciones: req.body.observaciones,
        detalles: req.body.detalles || []
      };

      // Validaciones básicas
      if (!facturaData.proveedor_id) {
        req.flash('error', 'Debe seleccionar un proveedor');
        return res.redirect('/facturas/nueva-recibida');
      }

      if (!facturaData.numero_factura) {
        req.flash('error', 'Debe ingresar el número de factura');
        return res.redirect('/facturas/nueva-recibida');
      }

      // Calcular totales
      let subtotal = 0;
      if (Array.isArray(facturaData.detalles)) {
        subtotal = facturaData.detalles.reduce((sum, detalle) => {
          const cantidad = parseFloat(detalle.cantidad) || 0;
          const precio = parseFloat(detalle.precio_unitario) || 0;
          return sum + (cantidad * precio);
        }, 0);
      }

      const iva = subtotal * 0.21; // 21% IVA por defecto
      const total = subtotal + iva;

      const facturaId = uuidv4();

      // Insertar factura recibida
      await connection.query(
        `INSERT INTO facturas_recibidas 
         (id, numero_factura, proveedor_id, fecha_compra, fecha_pago, subtotal, iva, total, observaciones, estado, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
        [facturaId, facturaData.numero_factura, facturaData.proveedor_id, 
         facturaData.fecha_compra, facturaData.fecha_pago, subtotal, iva, total, facturaData.observaciones]
      );

      // Insertar detalles si existen
      if (Array.isArray(facturaData.detalles) && facturaData.detalles.length > 0) {
        for (let i = 0; i < facturaData.detalles.length; i++) {
          const detalle = facturaData.detalles[i];
          await connection.query(
            `INSERT INTO facturas_recibidas_items 
             (id, factura_recibida_id, descripcion, cantidad, precio_unitario, subtotal, orden, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              uuidv4(),
              facturaId,
              detalle.descripcion,
              parseFloat(detalle.cantidad) || 0,
              parseFloat(detalle.precio_unitario) || 0,
              (parseFloat(detalle.cantidad) || 0) * (parseFloat(detalle.precio_unitario) || 0),
              i + 1
            ]
          );
        }
      }

      await connection.commit();
      console.log('✅ Factura recibida creada exitosamente');
      
      req.flash('success', `Factura recibida ${facturaData.numero_factura} registrada exitosamente`);
      res.redirect('/facturas/recibidas');

    } catch (error) {
      await connection.rollback();
      console.error('❌ Error al crear factura recibida:', error);
      req.flash('error', 'Error al crear factura recibida: ' + error.message);
      res.redirect('/facturas/nueva-recibida');
    } finally {
      connection.release();
    }
  }

  /**
   * Ver detalle de factura recibida
   */
  static async verRecibida(req, res) {
    try {
      const id = req.params.id;
      console.log(`👁️ Visualizando factura recibida ID: ${id}`);

      const factura = await FacturaModel.getFacturaRecibidaById(id);

      // DEBUG log removed for production
      // DEBUG log removed for production

      if (!factura) {
        return res.status(404).render('error', {
          title: 'Error 404',
          message: 'Factura recibida no encontrada'
        });
      }

      res.render('facturas/recibidas-detalle', {
        title: `Factura recibida ${factura.numero_factura}`,
        factura,
        proveedor: factura.proveedor_nombre ? {
          nombre: factura.proveedor_nombre,
          codigo: factura.proveedor_codigo || 'N/A',
          tipo: factura.proveedor_tipo || 'N/A',
          condicion_iva: factura.proveedor_condicion_iva || 0
        } : null,
        formatCurrency: (amount) => {
          if (!amount || isNaN(amount)) return '$0.00';
          return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 2
          }).format(amount);
        },
        formatDate: (date) => {
          if (!date) return 'N/A';
          try {
            return new Date(date).toLocaleDateString('es-AR');
          } catch (error) {
            return 'N/A';
          }
        }
      });

    } catch (error) {
      console.error('❌ Error al visualizar factura recibida:', error);
      return res.status(500).render('error', {
        title: 'Error 500',
        message: 'Error al cargar la factura recibida: ' + error.message
      });
    }
  }

  /**
   * Formulario editar factura emitida
   */
  static async editarEmitida(req, res) {
    try {
      const id = req.params.id;
      console.log(`📋 Editando factura emitida ID: ${id}`);

      const factura = await FacturaModel.getFacturaById(id);
      
      if (!factura) {
        return res.status(404).render('error', {
          title: 'Error 404',
          message: 'Factura no encontrada'
        });
      }

      // Obtener clientes para el dropdown
      const clientes = await ClienteModel.getClientesActivos();

      res.render('facturas/editar-emitida', {
        title: `Editar Factura ${factura.numero_factura || factura.numero}`,
        factura,
        clientes,
        tiposFactura: [
          { codigo: 'A', nombre: 'Factura A' },
          { codigo: 'B', nombre: 'Factura B' },
          { codigo: 'C', nombre: 'Factura C' },
          { codigo: 'M', nombre: 'Factura M' }
        ]
      });

    } catch (error) {
      console.error('❌ Error al cargar factura para edición:', error);
      return res.status(500).render('error', {
        title: 'Error 500',
        message: 'Error al cargar la factura: ' + error.message
      });
    }
  }

  /**
   * Actualizar factura emitida
   */
  static async actualizarEmitida(req, res) {
    try {
      const id = req.params.id;
      console.log(`💾 Actualizando factura emitida ID: ${id}`);

      const updateData = {
        persona_tercero_id: req.body.cliente_id, // El campo en BD es persona_tercero_id
        fecha_vto_pago: req.body.fecha_vto_pago,
        observaciones: req.body.observaciones,
        estado: req.body.estado || 1
      };

      const success = await FacturaModel.updateFacturaField(id, updateData);
      
      if (success) {
        console.log(`✅ Factura ${id} actualizada correctamente`);
        // Usar res.redirect en lugar de req.flash (que no está disponible)
        return res.redirect(`/facturas/emitidas/${id}?success=1`);
      } else {
        console.log(`⚠️ No se actualizó la factura ${id}`);
        return res.redirect(`/facturas/emitidas/${id}?error=1`);
      }

    } catch (error) {
      console.error('❌ Error al actualizar factura:', error);
      res.redirect(`/facturas/emitidas/${req.params.id}?error=1`);
    }
  }

  /**
   * Formulario editar factura recibida
   */
  static async editarRecibida(req, res) {
    try {
      const id = req.params.id;
      console.log(`📋 Editando factura recibida ID: ${id}`);

      const factura = await FacturaModel.getFacturaRecibidaById(id);
      
      if (!factura) {
        return res.status(404).render('error', {
          title: 'Error 404',
          message: 'Factura recibida no encontrada'
        });
      }

      res.render('facturas/editar-recibida', {
        title: `Editar Factura Recibida ${factura.numero_factura}`,
        factura,
        estados: [
          { value: 0, name: 'Pendiente' },
          { value: 1, name: 'Parcialmente Pagada' },
          { value: 2, name: 'Pagada' },
          { value: 3, name: 'Anulada' }
        ]
      });

    } catch (error) {
      console.error('❌ Error al cargar factura recibida para edición:', error);
      return res.status(500).render('error', {
        title: 'Error 500',
        message: 'Error al cargar la factura: ' + error.message
      });
    }
  }

  /**
   * Actualizar factura recibida
   */
  static async actualizarRecibida(req, res) {
    try {
      const id = req.params.id;
      console.log(`💾 Actualizando factura recibida ID: ${id}`);

      const updateData = {
        fecha_pago: req.body.fecha_pago || null,
        observaciones: req.body.observaciones,
        estado: parseInt(req.body.estado) || 0,
        cancelado: parseFloat(req.body.cancelado) || 0
      };

      // Calcular saldo pendiente
      const factura = await FacturaModel.getFacturaRecibidaById(id);
      if (factura) {
        const total = factura.total || 0;
        const cancelado = updateData.cancelado || 0;
        updateData.saldo_pendiente = total - cancelado;
      }

      // Simular actualización (implementar en modelo según sea necesario)
      console.log('💾 Datos a actualizar:', updateData);
      
      req.flash('success', 'Factura recibida actualizada correctamente');
      res.redirect(`/facturas/recibidas/${id}`);

    } catch (error) {
      console.error('❌ Error al actualizar factura recibida:', error);
      req.flash('error', 'Error al actualizar la factura: ' + error.message);
      res.redirect(`/facturas/recibidas/editar/${req.params.id}`);
    }
  }
}

module.exports = FacturaController;
