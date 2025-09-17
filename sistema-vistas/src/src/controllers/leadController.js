const LeadModel = require('../models/LeadModel');
const ClienteModel = require('../models/ClienteModel');

/**
 * Controlador de Leads
 */
class LeadController {

  /**
   * Listar todos los leads con paginación
   */
  static async listar(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      console.log(`📋 Listando leads - Página ${page}, Límite ${limit}`);

      const resultado = await LeadModel.getLeads(page, limit);

      res.render('leads/listar', {
        title: 'Gestión de Leads',
        leads: resultado.data,
        pagination: resultado.pagination,
        currentPage: page,
        query: req.query,
        estados: LeadModel.ESTADO_NOMBRES,
        fuentes: LeadModel.FUENTES,
        formatCurrency: LeadModel.formatCurrency,
        formatDate: LeadModel.formatDate,
        calcularValorPonderado: LeadModel.calcularValorPonderado
      });

    } catch (error) {
      console.error('❌ Error al listar leads:', error);
      req.flash('error', 'Error al cargar la lista de leads');
      res.redirect('/dashboard');
    }
  }

  /**
   * Mostrar formulario de creación de lead
   */
  static async mostrarCrear(req, res) {
    try {
      console.log('📝 Mostrando formulario de creación de lead');

      // OPTIMIZADO: Cargar solo los clientes más recientes para evitar timeouts
      const clientesActivos = await ClienteModel.getClientesActivos(100); // Limitar a 100

      res.render('leads/nuevo', {
        title: 'Crear Nuevo Lead',
        clientes: clientesActivos || [],
        estados: LeadModel.ESTADO_NOMBRES,
        fuentes: LeadModel.FUENTES
      });

    } catch (error) {
      console.error('❌ Error al mostrar formulario de creación:', error);
      req.flash('error', 'Error al cargar el formulario de creación');
      res.redirect('/leads');
    }
  }

  /**
   * Crear nuevo lead
   */
  static async crear(req, res) {
    try {
      console.log('💾 Creando nuevo lead:', req.body);

      const leadData = {
        titulo: req.body.titulo || req.body.descripcion,
        cliente_id: req.body.cliente_id,
        valor_estimado: parseFloat(req.body.valor_estimado) || 0,
        probabilidad: parseInt(req.body.probabilidad) || 50,
        fuente: req.body.fuente || 'desconocida',
        fecha_seguimiento: req.body.fecha_seguimiento,
        notas: req.body.notas || req.body.observaciones
      };

      // Validaciones básicas
      if (!leadData.titulo || !leadData.cliente_id) {
        req.flash('error', 'El título y el cliente son campos obligatorios');
        return res.redirect('/leads/crear');
      }

      const leadId = await LeadModel.createLead(leadData);

      req.flash('success', 'Lead creado exitosamente');
      res.redirect(`/leads/${leadId}`);

    } catch (error) {
      console.error('❌ Error al crear lead:', error);
      req.flash('error', 'Error al crear el lead: ' + error.message);
      res.redirect('/leads/crear');
    }
  }

  /**
   * Ver detalles de un lead
   */
  static async ver(req, res) {
    try {
      const id = req.params.id;
      console.log(`👁️ Visualizando lead ID: ${id}`);

      const lead = await LeadModel.getLeadById(id);

      if (!lead) {
        req.flash('error', 'Lead no encontrado');
        return res.redirect('/leads');
      }

      res.render('leads/ver', {
        title: `Lead: ${lead.titulo}`,
        lead,
        estados: LeadModel.ESTADO_NOMBRES,
        fuentes: LeadModel.FUENTES,
        formatCurrency: LeadModel.formatCurrency,
        formatDate: LeadModel.formatDate,
        calcularValorPonderado: LeadModel.calcularValorPonderado
      });

    } catch (error) {
      console.error('❌ Error al visualizar lead:', error);
      req.flash('error', 'Error al cargar el lead');
      res.redirect('/leads');
    }
  }

  /**
   * Mostrar formulario de edición
   */
  static async mostrarEditar(req, res) {
    try {
      const id = req.params.id;
      console.log(`✏️ Mostrando formulario de edición para lead ID: ${id}`);

      const [lead, clientesActivos] = await Promise.all([
        LeadModel.getLeadById(id),
        ClienteModel.getClientesActivos()
      ]);

      if (!lead) {
        req.flash('error', 'Lead no encontrado');
        return res.redirect('/leads');
      }

      res.render('leads/editar', {
        title: `Editar Lead: ${lead.titulo}`,
        lead,
        clientes: clientesActivos,
        estados: LeadModel.ESTADO_NOMBRES,
        fuentes: LeadModel.FUENTES
      });

    } catch (error) {
      console.error('❌ Error al mostrar formulario de edición:', error);
      req.flash('error', 'Error al cargar el formulario de edición');
      res.redirect('/leads');
    }
  }

  /**
   * Actualizar lead
   */
  static async actualizar(req, res) {
    try {
      const id = req.params.id;
      console.log(`💾 Actualizando lead ID: ${id}`, req.body);

      // Por simplicidad, actualizando solo el estado
      const nuevoEstado = req.body.estado;
      const notas = req.body.notas || req.body.observaciones;

      const actualizado = await LeadModel.updateEstadoLead(id, nuevoEstado, notas);

      if (!actualizado) {
        req.flash('error', 'No se pudo actualizar el lead');
        return res.redirect(`/leads/${id}/editar`);
      }

      req.flash('success', 'Lead actualizado exitosamente');
      res.redirect(`/leads/${id}`);

    } catch (error) {
      console.error('❌ Error al actualizar lead:', error);
      req.flash('error', 'Error al actualizar el lead: ' + error.message);
      res.redirect(`/leads/${req.params.id}/editar`);
    }
  }

  /**
   * Buscar leads con filtros
   */
  static async buscar(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      const filters = {
        titulo: req.query.titulo,
        estado: req.query.estado,
        nombre_contacto: req.query.nombre_contacto,
        valor_minimo: req.query.valor_minimo ? parseFloat(req.query.valor_minimo) : null,
        valor_maximo: req.query.valor_maximo ? parseFloat(req.query.valor_maximo) : null,
        fecha_desde: req.query.fecha_desde,
        fecha_hasta: req.query.fecha_hasta
      };

      // Remover filtros vacíos
      Object.keys(filters).forEach(key => {
        if (!filters[key]) delete filters[key];
      });

      console.log('🔍 Buscando leads con filtros:', filters);

      const resultado = await LeadModel.searchLeads(filters, page, limit);

      res.render('leads/listar', {
        title: 'Búsqueda de Leads',
        leads: resultado.data,
        pagination: resultado.pagination,
        currentPage: page,
        query: req.query,
        filters: filters,
        estados: LeadModel.ESTADO_NOMBRES,
        fuentes: LeadModel.FUENTES,
        formatCurrency: LeadModel.formatCurrency,
        formatDate: LeadModel.formatDate,
        calcularValorPonderado: LeadModel.calcularValorPonderado
      });

    } catch (error) {
      console.error('❌ Error al buscar leads:', error);
      req.flash('error', 'Error en la búsqueda de leads');
      res.redirect('/leads');
    }
  }

  /**
   * API: Obtener leads en formato JSON
   */
  static async searchJSON(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const filters = {
        titulo: req.query.titulo,
        estado: req.query.estado,
        nombre_contacto: req.query.nombre_contacto
      };

      Object.keys(filters).forEach(key => {
        if (!filters[key]) delete filters[key];
      });

      const resultado = await LeadModel.searchLeads(filters, page, limit);

      res.json({
        success: true,
        data: resultado.data,
        pagination: resultado.pagination
      });

    } catch (error) {
      console.error('❌ Error en API de búsqueda de leads:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }

  /**
   * Cambiar estado de lead
   */
  static async cambiarEstado(req, res) {
    try {
      const id = req.params.id;
      const { estado, notas } = req.body;

      console.log(`🔄 Cambiando estado del lead ${id} a ${estado}`);

      const actualizado = await LeadModel.updateEstadoLead(id, estado, notas);

      if (!actualizado) {
        return res.status(404).json({
          success: false,
          error: 'Lead no encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Estado del lead actualizado exitosamente'
      });

    } catch (error) {
      console.error('❌ Error al cambiar estado del lead:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }

  /**
   * Convertir lead a presupuesto
   */
  static async convertirPresupuesto(req, res) {
    try {
      const id = req.params.id;
      const datosAdicionales = req.body;

      console.log(`🔄 Convirtiendo lead ${id} a presupuesto`);

      const convertido = await LeadModel.convertirAPresupuesto(id, datosAdicionales);

      if (!convertido) {
        return res.status(404).json({
          success: false,
          error: 'Lead no encontrado'
        });
      }

      // Si es una petición AJAX
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.json({
          success: true,
          message: 'Lead convertido a presupuesto exitosamente',
          redirect: `/presupuestos/${id}`
        });
      }

      req.flash('success', 'Lead convertido a presupuesto exitosamente');
      res.redirect(`/presupuestos/${id}`);

    } catch (error) {
      console.error('❌ Error al convertir lead a presupuesto:', error);
      
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(500).json({
          success: false,
          error: 'Error interno del servidor',
          message: error.message
        });
      }
      
      req.flash('error', 'Error al convertir lead a presupuesto: ' + error.message);
      res.redirect(`/leads/${id}`);
    }
  }

  /**
   * Dashboard de leads con estadísticas
   */
  static async dashboard(req, res) {
    try {
      console.log('📊 Cargando dashboard de leads');

      const [estadisticas, leadsRecientes] = await Promise.all([
        LeadModel.getEstadisticas(),
        LeadModel.getLeadsRecientes(10)
      ]);

      res.render('leads/dashboard', {
        title: 'Dashboard de Leads',
        estadisticas,
        leadsRecientes,
        estados: LeadModel.ESTADO_NOMBRES,
        formatCurrency: LeadModel.formatCurrency,
        formatDate: LeadModel.formatDate,
        calcularValorPonderado: LeadModel.calcularValorPonderado
      });

    } catch (error) {
      console.error('❌ Error al cargar dashboard de leads:', error);
      req.flash('error', 'Error al cargar el dashboard de leads');
      res.redirect('/dashboard');
    }
  }

  /**
   * Pipeline de ventas - Vista Kanban de leads
   */
  static async pipeline(req, res) {
    try {
      console.log('📊 Cargando pipeline de ventas');

      // Obtener leads agrupados por estado
      const [
        leadsNuevos,
        leadsContactados,
        leadsCalificados,
        leadsPropuesta,
        leadsNegociacion,
        leadsCerradosGanados,
        leadsCerradosPerdidos
      ] = await Promise.allSettled([
        LeadModel.searchLeads({ estado: 'nuevo' }, 1, 50),
        LeadModel.searchLeads({ estado: 'contactado' }, 1, 50),
        LeadModel.searchLeads({ estado: 'calificado' }, 1, 50),
        LeadModel.searchLeads({ estado: 'propuesta' }, 1, 50),
        LeadModel.searchLeads({ estado: 'negociacion' }, 1, 50),
        LeadModel.searchLeads({ estado: 'cerrado_ganado' }, 1, 50),
        LeadModel.searchLeads({ estado: 'cerrado_perdido' }, 1, 50)
      ]);

      const pipeline = {
        nuevo: leadsNuevos.status === 'fulfilled' ? leadsNuevos.value.data : [],
        contactado: leadsContactados.status === 'fulfilled' ? leadsContactados.value.data : [],
        calificado: leadsCalificados.status === 'fulfilled' ? leadsCalificados.value.data : [],
        propuesta: leadsPropuesta.status === 'fulfilled' ? leadsPropuesta.value.data : [],
        negociacion: leadsNegociacion.status === 'fulfilled' ? leadsNegociacion.value.data : [],
        cerrado_ganado: leadsCerradosGanados.status === 'fulfilled' ? leadsCerradosGanados.value.data : [],
        cerrado_perdido: leadsCerradosPerdidos.status === 'fulfilled' ? leadsCerradosPerdidos.value.data : []
      };

      // Calcular valores por columna
      const resumenPipeline = {
        nuevo: {
          cantidad: pipeline.nuevo.length,
          valor_total: pipeline.nuevo.reduce((sum, lead) => sum + (lead.valor_estimado || 0), 0)
        },
        contactado: {
          cantidad: pipeline.contactado.length,
          valor_total: pipeline.contactado.reduce((sum, lead) => sum + (lead.valor_estimado || 0), 0)
        },
        calificado: {
          cantidad: pipeline.calificado.length,
          valor_total: pipeline.calificado.reduce((sum, lead) => sum + (lead.valor_estimado || 0), 0)
        },
        propuesta: {
          cantidad: pipeline.propuesta.length,
          valor_total: pipeline.propuesta.reduce((sum, lead) => sum + (lead.valor_estimado || 0), 0)
        },
        negociacion: {
          cantidad: pipeline.negociacion.length,
          valor_total: pipeline.negociacion.reduce((sum, lead) => sum + (lead.valor_estimado || 0), 0)
        },
        cerrado_ganado: {
          cantidad: pipeline.cerrado_ganado.length,
          valor_total: pipeline.cerrado_ganado.reduce((sum, lead) => sum + (lead.valor_estimado || 0), 0)
        },
        cerrado_perdido: {
          cantidad: pipeline.cerrado_perdido.length,
          valor_total: pipeline.cerrado_perdido.reduce((sum, lead) => sum + (lead.valor_estimado || 0), 0)
        }
      };

      res.render('leads/pipeline', {
        title: 'Pipeline de Ventas',
        pipeline,
        resumenPipeline,
        estados: LeadModel.ESTADO_NOMBRES,
        formatCurrency: LeadModel.formatCurrency,
        formatDate: LeadModel.formatDate,
        calcularValorPonderado: LeadModel.calcularValorPonderado
      });

    } catch (error) {
      console.error('❌ Error al cargar pipeline de ventas:', error);
      req.flash('error', 'Error al cargar el pipeline de ventas');
      res.redirect('/leads');
    }
  }

  /**
   * Generar reporte de leads
   */
  static async reporte(req, res) {
    try {
      const { formato, fecha_desde, fecha_hasta, estado, fuente } = req.query;

      const filters = {
        fecha_desde,
        fecha_hasta,
        estado,
        fuente
      };

      // Remover filtros vacíos
      Object.keys(filters).forEach(key => {
        if (!filters[key]) delete filters[key];
      });

      console.log('📊 Generando reporte de leads:', { formato, filters });

      const resultado = await LeadModel.searchLeads(filters, 1, 1000);

      if (formato === 'json') {
        return res.json({
          success: true,
          data: resultado.data,
          resumen: {
            total_leads: resultado.data.length,
            valor_total_pipeline: resultado.data.reduce((sum, lead) => sum + (lead.valor_estimado || 0), 0),
            valor_ponderado_total: resultado.data.reduce((sum, lead) => 
              sum + LeadModel.calcularValorPonderado(lead.valor_estimado, lead.probabilidad), 0)
          }
        });
      }

      // Renderizar vista de reporte
      res.render('leads/reporte', {
        title: 'Reporte de Leads',
        leads: resultado.data,
        filters,
        resumen: {
          total_leads: resultado.data.length,
          valor_total_pipeline: resultado.data.reduce((sum, lead) => sum + (lead.valor_estimado || 0), 0),
          valor_ponderado_total: resultado.data.reduce((sum, lead) => 
            sum + LeadModel.calcularValorPonderado(lead.valor_estimado, lead.probabilidad), 0)
        },
        estados: LeadModel.ESTADO_NOMBRES,
        fuentes: LeadModel.FUENTES,
        formatCurrency: LeadModel.formatCurrency,
        formatDate: LeadModel.formatDate,
        calcularValorPonderado: LeadModel.calcularValorPonderado
      });

    } catch (error) {
      console.error('❌ Error al generar reporte de leads:', error);
      req.flash('error', 'Error al generar el reporte');
      res.redirect('/leads');
    }
  }
}

module.exports = LeadController;
