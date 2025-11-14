const PresupuestoModel = require('../models/PresupuestoModel');
const ClienteModel = require('../models/ClienteModel');
const { formatCurrency, formatDate } = require('../helpers/formatters');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// Funciones helper para estados
function getEstadoBadgeClass(estado) {
  const clases = {
    0: 'bg-secondary',  // Borrador
    1: 'bg-primary',    // Enviado
    2: 'bg-success',    // Aprobado
    3: 'bg-danger',     // Rechazado
    4: 'bg-warning'     // Vencido
  };
  return clases[estado] || 'bg-secondary';
}

function getEstadoBadge(estado) {
  const estados = {
    0: 'Borrador',
    1: 'Enviado',
    2: 'Aprobado',
    3: 'Rechazado',
    4: 'Vencido'
  };
  // Forzar devolver solo texto, sin HTML
  return estados[parseInt(estado)] || 'Desconocido';
}

class PresupuestosController {
  /**
   * Lista principal de presupuestos
   */
  static async index(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const sort = req.query.sort || 'numero_presupuesto';
      const order = (req.query.order || 'desc').toUpperCase();
      
      // Filtros
      const filters = {
        estado: req.query.estado,
        cliente: req.query.cliente,
        fecha: req.query.fecha,
        search: req.query.search
      };
      
      // Limpiar filtros vacíos
      Object.keys(filters).forEach(key => {
        if (!filters[key] || filters[key] === '') {
          delete filters[key];
        }
      });
      
      const result = await PresupuestoModel.getPresupuestos(page, limit, filters, sort, order);
      const estadisticas = await PresupuestoModel.getEstadisticas();
      
      // DEBUG removido - usar template debug
      
      console.log('\n[DEBUG] Datos para la vista:', JSON.stringify({ estadisticas, pagination: result.pagination }, null, 2));

      res.render('presupuestos/index', {
        title: 'Presupuestos - Sistema Integral',
        presupuestos: result.data.map(p => {
          // Eliminar completamente estado_nombre del modelo
          const { estado_nombre, ...presupuestoLimpio } = p;
          return {
            ...presupuestoLimpio,
            fecha_emision_formatted: formatDate(p.fecha_emision),
            fecha_validez_formatted: formatDate(p.fecha_validez),
            importe_total_formatted: formatCurrency(p.importe_total),
            estado_badge_class: getEstadoBadgeClass(parseInt(p.estado) || 0),
            estado_nombre: getEstadoBadge(parseInt(p.estado) || 0)
          };
        }),
        pagination: result.pagination,
        stats: {
          total: parseInt(estadisticas.total_presupuestos) || 0,
          borrador: parseInt(estadisticas.total_borradores) || 0,
          enviado: parseInt(estadisticas.total_enviados) || 0,
          aprobado: parseInt(estadisticas.total_aprobados) || 0,
          rechazado: parseInt(estadisticas.total_rechazados) || 0,
          valor_promedio: parseFloat(estadisticas.importe_promedio) || 0
        },
        estadisticas: {
          ...estadisticas,
          importe_promedio_formatted: formatCurrency(estadisticas.importe_promedio),
          importe_total_todos_formatted: formatCurrency(estadisticas.importe_total_todos),
          importe_aprobados_formatted: formatCurrency(estadisticas.importe_aprobados)
        }
      });
    } catch (error) {
      console.error('Error al obtener presupuestos:', error);
      res.status(500).render('error', {
        title: 'Error',
        message: 'Error al obtener los presupuestos',
        error: error
      });
    }
  }
  
  /**
   * Vista de listado de presupuestos
   */
  static async listar(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const sortBy = req.query.sortBy || 'fecha_emision';
      const sortOrder = req.query.sortOrder || 'DESC';
      
      // Obtener filtros del query string
      const filters = {
        numero_presupuesto: req.query.numero_presupuesto,
        cliente_nombre: req.query.cliente_nombre,
        estado: req.query.estado,
        fecha_desde: req.query.fecha_desde,
        fecha_hasta: req.query.fecha_hasta,
        importe_desde: req.query.importe_desde,
        importe_hasta: req.query.importe_hasta,
        texto_libre: req.query.texto_libre
      };
      
      // Limpiar filtros vacíos
      Object.keys(filters).forEach(key => {
        if (!filters[key] || filters[key] === '') {
          delete filters[key];
        }
      });
      
      // Temporal: usar getPresupuestos hasta corregir searchPresupuestos
      const result = await PresupuestoModel.getPresupuestos(page, limit);
      
      res.render('presupuestos/listar', {
        title: 'Listado de Presupuestos - Sistema Integral',
        presupuestos: result.data.map(p => ({
          ...p,
          fecha_emision_formatted: formatDate(p.fecha_emision),
          fecha_validez_formatted: formatDate(p.fecha_validez),
          importe_total_formatted: formatCurrency(p.importe_total),
          estado_badge_class: getEstadoBadgeClass(p.estado)
        })),
        pagination: result.pagination,
        filters: req.query,
        sortBy,
        sortOrder,
        estados: [
          { value: '0', name: 'Borrador' },
          { value: '1', name: 'Enviado' },
          { value: '2', name: 'Aprobado' },
          { value: '3', name: 'Rechazado' },
          { value: '4', name: 'Vencido' }
        ]
      });
    } catch (error) {
      console.error('Error en listado de presupuestos:', error);
      res.status(500).render('error', {
        title: 'Error',
        message: 'Error al obtener el listado de presupuestos',
        error: error
      });
    }
  }
  
  /**
   * Ver detalle de un presupuesto
   */
  static async show(req, res) {
    try {
      const { id } = req.params;
      const presupuesto = await PresupuestoModel.getPresupuestoById(id);

      if (!presupuesto) {
        return res.status(404).render('error', {
          title: 'Error 404',
          message: 'Presupuesto no encontrado'
        });
      }

      const estadoKey = String(presupuesto.estado_normalizado ?? presupuesto.estado ?? '').trim();
      const estadoNombre = getEstadoBadge(estadoKey);
      const estadoClase = getEstadoBadgeClass(estadoKey);

      const resumenCliente = await PresupuestoModel.getResumenCliente(presupuesto.cliente_id, presupuesto.id);

      res.render('presupuestos/ver', {
        title: `Presupuesto ${presupuesto.numero_presupuesto} - Sistema Integral`,
        presupuesto: {
          ...presupuesto,
          estado: estadoKey,
          estado_nombre: estadoNombre,
          estado_badge_class: estadoClase,
          fecha_emision_formatted: formatDate(presupuesto.fecha_emision),
          fecha_validez_formatted: formatDate(presupuesto.fecha_validez),
          importe_total_formatted: formatCurrency(presupuesto.importe_total),
          tipo_nombre: presupuesto.tipo_nombre,
          tiene_tipo: presupuesto.tipo_nombre && presupuesto.tipo_nombre !== 'Sin tipo definido'
        },
        resumenCliente,
        otrosPresupuestos: resumenCliente.otros_presupuestos,
        proyectosCliente: resumenCliente.proyectos,
        facturasCliente: resumenCliente.facturas
      });
    } catch (error) {
      console.error('Error al obtener presupuesto:', error);
      res.status(500).render('error', {
        title: 'Error',
        message: 'Error al obtener los detalles del presupuesto',
        error: error
      });
    }
  }
  
  /**
   * Búsqueda JSON de presupuestos
   */
  static async searchJSON(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const sortBy = req.query.sortBy || 'fecha_emision';
      const sortOrder = req.query.sortOrder || 'DESC';
      const searchTerm = req.query.search || '';
      
      // Obtener filtros del query string
      const filters = {
        numero_presupuesto: req.query.numero_presupuesto,
        cliente_nombre: req.query.cliente_nombre,
        estado: req.query.estado,
        fecha_desde: req.query.fecha_desde,
        fecha_hasta: req.query.fecha_hasta,
        importe_desde: req.query.importe_desde,
        importe_hasta: req.query.importe_hasta,
        texto_libre: searchTerm || req.query.texto_libre
      };
      
      // Limpiar filtros vacíos
      Object.keys(filters).forEach(key => {
        if (!filters[key] || filters[key] === '') {
          delete filters[key];
        }
      });
      
      // Temporal: usar getPresupuestos hasta corregir searchPresupuestos
      const result = await PresupuestoModel.getPresupuestos(page, limit);
      
      // Formatear datos para respuesta JSON
      const formattedData = result.data.map(p => ({
        ...p,
        fecha_emision_formatted: formatDate(p.fecha_emision),
        fecha_validez_formatted: formatDate(p.fecha_validez),
        importe_total_formatted: formatCurrency(p.importe_total),
        estado_badge_class: getEstadoBadgeClass(p.estado),
        estado_badge: getEstadoBadge(p.estado)
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
      console.error('Error en búsqueda JSON de presupuestos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al buscar presupuestos',
        error: error.message
      });
    }
  }
  
  /**
   * Actualizar estado de presupuesto
   */
  static async updateEstado(req, res) {
    try {
      const { id } = req.params;
      const { estado } = req.body;
      
      const success = await PresupuestoModel.updateEstado(id, estado);
      
      if (success) {
        res.json({
          success: true,
          message: 'Estado del presupuesto actualizado correctamente'
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Presupuesto no encontrado'
        });
      }
    } catch (error) {
      console.error('Error al actualizar estado del presupuesto:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar el estado del presupuesto'
      });
    }
  }

  /**
   * Crear un nuevo presupuesto
   */
  static async crearPresupuesto(req, res) {
    try {
      const nuevoPresupuesto = await PresupuestoModel.createPresupuesto(req.body);
      res.status(201).json({ success: true, data: nuevoPresupuesto });
    } catch (error) {
      console.error('Error al crear presupuesto:', error);
      res.status(500).json({ success: false, message: 'Error al crear el presupuesto' });
    }
  }

  /**
   * Aprobar un presupuesto
   */
  static async aprobarPresupuesto(req, res) {
    try {
      const { id } = req.params;
      const success = await PresupuestoModel.updateEstado(id, 2); // 2: Aprobado
      if (success) {
        res.json({ success: true, message: 'Presupuesto aprobado' });
      } else {
        res.status(404).json({ success: false, message: 'Presupuesto no encontrado' });
      }
    } catch (error) {
      console.error('Error al aprobar presupuesto:', error);
      res.status(500).json({ success: false, message: 'Error al aprobar el presupuesto' });
    }
  }

  /**
   * Rechazar un presupuesto
   */
  static async rechazarPresupuesto(req, res) {
    try {
      const { id } = req.params;
      const success = await PresupuestoModel.updateEstado(id, 3); // 3: Rechazado
      if (success) {
        res.json({ success: true, message: 'Presupuesto rechazado' });
      } else {
        res.status(404).json({ success: false, message: 'Presupuesto no encontrado' });
      }
    } catch (error) {
      console.error('Error al rechazar presupuesto:', error);
      res.status(500).json({ success: false, message: 'Error al rechazar el presupuesto' });
    }
  }

  /**
   * Obtener un presupuesto por ID
   */
  static async getPresupuesto(req, res) {
    try {
      const { id } = req.params;
      const presupuesto = await PresupuestoModel.getPresupuestoById(id);
      if (presupuesto) {
        res.json({ success: true, data: presupuesto });
      } else {
        res.status(404).json({ success: false, message: 'Presupuesto no encontrado' });
      }
    } catch (error) {
      console.error('Error al obtener presupuesto:', error);
      res.status(500).json({ success: false, message: 'Error al obtener el presupuesto' });
    }
  }

  /**
   * Obtener lista de presupuestos para la API
   */
  static async getPresupuestos(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const result = await PresupuestoModel.getPresupuestos(page, limit);
      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Error al obtener presupuestos para API:', error);
      res.status(500).json({ success: false, message: 'Error al obtener presupuestos' });
    }
  }
  
  /**
   * Formulario para crear nuevo presupuesto
   */
  static async create(req, res) {
    try {
      // Obtener lista de clientes para el formulario
      const clientes = await ClienteModel.getClientesActivos();
      
      res.render('presupuestos/crear', {
        title: 'Nuevo Presupuesto - Sistema Integral',
        clientes: clientes
      });
    } catch (error) {
      console.error('Error al mostrar formulario de creación:', error);
      res.status(500).render('error', {
        title: 'Error',
        message: 'Error al mostrar el formulario de creación',
        error: error
      });
    }
  }
  
  /**
   * Guardar nuevo presupuesto
   */
  static async store(req, res) {
    try {
      const presupuestoData = {
        cliente_id: req.body.cliente_id,
        numero_presupuesto: req.body.numero_presupuesto || '',
        fecha_validez: req.body.fecha_validez,
        observaciones: req.body.observaciones || '',
        importe_total: parseFloat(req.body.importe_total) || 0,
        dias_vencimiento: parseInt(req.body.dias_vencimiento) || 30,
        estado: 0 // Borrador por defecto
      };
      
      const nuevoId = await PresupuestoModel.createPresupuesto(presupuestoData);
      
      if (nuevoId) {
        req.flash('success', 'Presupuesto creado exitosamente');
        res.redirect(`/presupuestos/${nuevoId}`);
      } else {
        req.flash('error', 'Error al crear el presupuesto');
        res.redirect('/presupuestos/crear');
      }
    } catch (error) {
      console.error('Error al crear presupuesto:', error);
      req.flash('error', 'Error al crear el presupuesto');
      res.redirect('/presupuestos/crear');
    }
  }
  
  /**
   * Formulario para editar presupuesto
   */
  static async edit(req, res) {
    try {
      const { id } = req.params;
      const presupuesto = await PresupuestoModel.getPresupuestoById(id);
      
      if (!presupuesto) {
        return res.status(404).render('error', {
          title: 'Error 404',
          message: 'Presupuesto no encontrado'
        });
      }
      
      const clientes = await ClienteModel.getClientesActivos();
      
      res.render('presupuestos/editar', {
        title: `Editar Presupuesto ${presupuesto.numero_presupuesto} - Sistema Integral`,
        presupuesto: presupuesto,
        clientes: clientes
      });
    } catch (error) {
      console.error('Error al mostrar formulario de edición:', error);
      res.status(500).render('error', {
        title: 'Error',
        message: 'Error al mostrar el formulario de edición',
        error: error
      });
    }
  }
  
  /**
   * Actualizar presupuesto
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const presupuestoData = {
        cliente_id: req.body.cliente_id,
        numero_presupuesto: req.body.numero_presupuesto,
        fecha_validez: req.body.fecha_validez,
        observaciones: req.body.observaciones || '',
        importe_total: parseFloat(req.body.importe_total) || 0,
        dias_vencimiento: parseInt(req.body.dias_vencimiento) || 30,
        estado: parseInt(req.body.estado) || 0
      };
      
      const success = await PresupuestoModel.updatePresupuesto(id, presupuestoData);
      
      if (success) {
        req.flash('success', 'Presupuesto actualizado exitosamente');
        res.redirect(`/presupuestos/${id}`);
      } else {
        req.flash('error', 'Error al actualizar el presupuesto');
        res.redirect(`/presupuestos/${id}/editar`);
      }
    } catch (error) {
      console.error('Error al actualizar presupuesto:', error);
      req.flash('error', 'Error al actualizar el presupuesto');
      res.redirect(`/presupuestos/${req.params.id}/editar`);
    }
  }
  
  /**
   * Eliminar presupuesto
   */
  static async destroy(req, res) {
    try {
      const { id } = req.params;
      const success = await PresupuestoModel.deletePresupuesto(id);
      
      if (success) {
        res.json({
          success: true,
          message: 'Presupuesto eliminado correctamente'
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Presupuesto no encontrado'
        });
      }
    } catch (error) {
      console.error('Error al eliminar presupuesto:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar el presupuesto'
      });
    }
  }
  
  /**
   * Duplicar presupuesto
   */
  static async duplicate(req, res) {
    try {
      const { id } = req.params;
      const nuevoId = await PresupuestoModel.duplicatePresupuesto(id);
      
      if (nuevoId) {
        res.json({
          success: true,
          message: 'Presupuesto duplicado correctamente',
          nuevo_id: nuevoId
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Presupuesto original no encontrado'
        });
      }
    } catch (error) {
      console.error('Error al duplicar presupuesto:', error);
      res.status(500).json({
        success: false,
        message: 'Error al duplicar el presupuesto'
      });
    }
  }
  
  /**
   * Obtener estadísticas de presupuestos
   */
  static async estadisticas(req, res) {
    try {
      const estadisticas = await PresupuestoModel.getEstadisticas();
      const estadisticasPorMes = await PresupuestoModel.getEstadisticasPorMes();
      const estadisticasPorEstado = await PresupuestoModel.getEstadisticasPorEstado();
      
      res.render('presupuestos/estadisticas', {
        title: 'Estadísticas de Presupuestos - Sistema Integral',
        estadisticas: {
          ...estadisticas,
          importe_promedio_formatted: formatCurrency(estadisticas.importe_promedio),
          importe_total_todos_formatted: formatCurrency(estadisticas.importe_total_todos),
          importe_aprobados_formatted: formatCurrency(estadisticas.importe_aprobados)
        },
        estadisticasPorMes: estadisticasPorMes.map(e => ({
          ...e,
          importe_total_formatted: formatCurrency(e.importe_total)
        })),
        estadisticasPorEstado: estadisticasPorEstado.map(e => ({
          ...e,
          importe_total_formatted: formatCurrency(e.importe_total)
        }))
      });
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      res.status(500).render('error', {
        title: 'Error',
        message: 'Error al obtener las estadísticas',
        error: error
      });
    }
  }
  
  /**
   * Exportar presupuesto a PDF
   */
  static async exportPDF(req, res) {
    try {
      const { id } = req.params;
      const presupuesto = await PresupuestoModel.getPresupuestoById(id);
      
      if (!presupuesto) {
        return res.status(404).json({
          success: false,
          message: 'Presupuesto no encontrado'
        });
      }
      
      // Crear documento PDF
      const doc = new PDFDocument();
      const fileName = `presupuesto_${presupuesto.numero_presupuesto}.pdf`;
      
      // Configurar respuesta HTTP
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      
      // Pipe del documento al response
      doc.pipe(res);
      
      // Agregar contenido al PDF
      doc.fontSize(20).text('PRESUPUESTO', 50, 50);
      doc.fontSize(16).text(`N° ${presupuesto.numero_presupuesto}`, 50, 80);
      
      doc.fontSize(12)
         .text(`Fecha de Emisión: ${formatDate(presupuesto.fecha_emision)}`, 50, 120)
         .text(`Cliente: ${presupuesto.cliente_nombre}`, 50, 140)
         .text(`CUIT: ${presupuesto.cliente_cuit || 'N/A'}`, 50, 160)
         .text(`Estado: ${presupuesto.estado_nombre}`, 50, 180)
         .text(`Importe Total: ${formatCurrency(presupuesto.importe_total)}`, 50, 200)
         .text(`Fecha de Validez: ${formatDate(presupuesto.fecha_validez)}`, 50, 220);
      
      if (presupuesto.observaciones) {
        doc.text(`Observaciones: ${presupuesto.observaciones}`, 50, 260);
      }
      
      // Finalizar documento
      doc.end();
      
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      res.status(500).json({
        success: false,
        message: 'Error al generar el PDF'
      });
    }
  }
  
  /**
   * Exportar presupuestos a Excel
   */
  static async exportExcel(req, res) {
    try {
      // Obtener filtros del query string
      const filters = {
        numero_presupuesto: req.query.numero_presupuesto,
        cliente_nombre: req.query.cliente_nombre,
        estado: req.query.estado,
        fecha_desde: req.query.fecha_desde,
        fecha_hasta: req.query.fecha_hasta,
        importe_desde: req.query.importe_desde,
        importe_hasta: req.query.importe_hasta,
        texto_libre: req.query.texto_libre
      };
      
      // Limpiar filtros vacíos
      Object.keys(filters).forEach(key => {
        if (!filters[key] || filters[key] === '') {
          delete filters[key];
        }
      });
      
      // Obtener todos los presupuestos que coinciden con los filtros
      const result = await PresupuestoModel.searchPresupuestos(filters, 1, 10000);
      
      // Crear workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Presupuestos');
      
      // Configurar columnas
      worksheet.columns = [
        { header: 'N° Presupuesto', key: 'numero_presupuesto', width: 20 },
        { header: 'Fecha Emisión', key: 'fecha_emision', width: 15 },
        { header: 'Cliente', key: 'cliente_nombre', width: 30 },
        { header: 'CUIT Cliente', key: 'cliente_cuit', width: 15 },
        { header: 'Estado', key: 'estado_nombre', width: 15 },
        { header: 'Importe Total', key: 'importe_total', width: 15 },
        { header: 'Fecha Validez', key: 'fecha_validez', width: 15 },
        { header: 'Días Vencimiento', key: 'dias_vencimiento', width: 15 },
        { header: 'Observaciones', key: 'observaciones', width: 40 }
      ];
      
      // Agregar datos
      result.data.forEach(presupuesto => {
        worksheet.addRow({
          numero_presupuesto: presupuesto.numero_presupuesto,
          fecha_emision: presupuesto.fecha_emision ? new Date(presupuesto.fecha_emision) : '',
          cliente_nombre: presupuesto.cliente_nombre,
          cliente_cuit: presupuesto.cliente_cuit,
          estado_nombre: presupuesto.estado_nombre,
          importe_total: presupuesto.importe_total || 0,
          fecha_validez: presupuesto.fecha_validez ? new Date(presupuesto.fecha_validez) : '',
          dias_vencimiento: presupuesto.dias_vencimiento || 0,
          observaciones: presupuesto.observaciones || ''
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
      worksheet.getColumn('F').numFmt = '#,##0.00';
      worksheet.getColumn('H').numFmt = '#,##0';
      
      // Configurar formato para columnas de fechas
      worksheet.getColumn('B').numFmt = 'dd/mm/yyyy';
      worksheet.getColumn('G').numFmt = 'dd/mm/yyyy';
      
      // Configurar respuesta HTTP
      const fileName = `presupuestos_${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      
      // Enviar archivo
      await workbook.xlsx.write(res);
      res.end();
      
    } catch (error) {
      console.error('Error al exportar presupuestos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al exportar los presupuestos'
      });
    }
  }
}

// Funciones ya definidas arriba, no duplicar aquí

module.exports = PresupuestosController;
