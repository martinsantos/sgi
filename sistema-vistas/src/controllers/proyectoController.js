const ProyectoModel = require('../models/ProyectoModel');
const ClienteModel = require('../models/ClienteModel');

/**
 * Controlador de Proyectos
 */
class ProyectoController {

  /**
   * Listar todos los proyectos con paginación y filtros
   */
  static async listar(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const sortBy = req.query.sortBy || 'fecha_inicio';
      const sortOrder = req.query.sortOrder || 'DESC';
      
      // Filtros de búsqueda
      const filtros = {
        id: req.query.id || '',
        descripcion: req.query.descripcion || '',
        cliente: req.query.cliente || '',
        estado: req.query.estado || ''
      };

      console.log(`📋 Listando proyectos - Página ${page}, Límite ${limit}, Ordenar por: ${sortBy} ${sortOrder}, Filtros:`, filtros);

      const resultado = await ProyectoModel.getProyectos(page, limit, filtros, sortBy, sortOrder);

      res.render('proyectos/listar-tabla', {
        title: 'Gestión de Proyectos',
        proyectos: resultado.data,
        pagination: resultado.pagination,
        currentPage: page,
        query: req.query,
        filtros: filtros,
        formatCurrency: ProyectoModel.formatCurrency,
        formatDate: ProyectoModel.formatDate
      });

    } catch (error) {
      console.error('❌ Error al listar proyectos:', error);
      
      res.redirect('/dashboard');
    }
  }

  /**
   * Mostrar formulario de creación de proyecto
   */
  static async mostrarCrear(req, res) {
    try {
      console.log('📝 Mostrando formulario de creación de proyecto');

      // Obtener clientes activos para el dropdown
      const clientesActivos = await ClienteModel.getClientesActivos();

      res.render('proyectos/crear', {
        title: 'Crear Nuevo Proyecto',
        clientes: clientesActivos,
        estados: ProyectoModel.ESTADO_NOMBRES || {
          1: 'Pendiente',
          2: 'En Progreso',
          3: 'Finalizado',
          4: 'Cancelado'
        }
      });

    } catch (error) {
      console.error('❌ Error al mostrar formulario de creación:', error);
      
      res.redirect('/proyectos');
    }
  }

  /**
   * Crear nuevo proyecto
   */
  static async crear(req, res) {
    try {
      console.log('💾 Creando nuevo proyecto:', req.body);

      const proyectoData = {
        codigo: req.body.codigo,
        descripcion: req.body.descripcion || req.body.nombre,
        cliente_id: req.body.cliente_id || req.body.personal_id,
        precio_venta: parseFloat(req.body.precio_venta) || 0,
        estado: parseInt(req.body.estado) || 1,
        fecha_inicio: req.body.fecha_inicio,
        fecha_cierre: req.body.fecha_cierre,
        observaciones: req.body.observaciones
      };

      // Validaciones básicas
      if (!proyectoData.descripcion || !proyectoData.cliente_id) {
        
        return res.redirect('/proyectos/crear');
      }

      const proyectoId = await ProyectoModel.createProyecto(proyectoData);

      
      res.redirect(`/proyectos/${proyectoId}`);

    } catch (error) {
      console.error('❌ Error al crear proyecto:', error);
      
      res.redirect('/proyectos/crear');
    }
  }

  /**
   * Ver detalles de un proyecto
   */
  static async ver(req, res) {
    try {
      const id = req.params.id;
      console.log(`👁️ Visualizando proyecto ID: ${id}`);

      const proyectoCompleto = await ProyectoModel.getProyectoCompleto(id);

      if (!proyectoCompleto) {
        console.log(`⚠️ Proyecto ${id} no encontrado`);
        return res.redirect('/proyectos');
      }

      console.log(`📋 Proyecto cargado: ${proyectoCompleto.descripcion}`);
      console.log(`🏆 Certificados: ${proyectoCompleto.certificados ? proyectoCompleto.certificados.total : 0} (${proyectoCompleto.certificados ? proyectoCompleto.certificados.total_activos : 0} activos, ${proyectoCompleto.certificados ? proyectoCompleto.certificados.total_inactivos : 0} inactivos)`);

      res.render('proyectos/ver', {
        title: `Proyecto: ${proyectoCompleto.descripcion}`,
        proyecto: proyectoCompleto,
        certificados: proyectoCompleto.certificados || { activos: [], inactivos: [], total: 0, total_activos: 0, total_inactivos: 0 },
        formatCurrency: ProyectoModel.formatCurrency,
        formatDate: ProyectoModel.formatDate
      });

    } catch (error) {
      console.error('❌ Error al visualizar proyecto:', error);
      console.error(error.stack);
      res.redirect('/proyectos');
    }
  }

  /**
   * Mostrar formulario de edición
   */
  static async mostrarEditar(req, res) {
    try {
      const id = req.params.id;
      console.log(`✏️ Mostrando formulario de edición para proyecto ID: ${id}`);

      const [proyecto, clientesActivos] = await Promise.all([
        ProyectoModel.getProyectoById(id),
        ClienteModel.getClientesActivos()
      ]);

      if (!proyecto) {
        
        return res.redirect('/proyectos');
      }

      res.render('proyectos/editar', {
        title: `Editar Proyecto: ${proyecto.descripcion}`,
        proyecto,
        clientes: clientesActivos,
        estados: ProyectoModel.ESTADO_NOMBRES || {
          1: 'Pendiente',
          2: 'En Progreso',
          3: 'Finalizado',
          4: 'Cancelado'
        }
      });

    } catch (error) {
      console.error('❌ Error al mostrar formulario de edición:', error);
      
      res.redirect('/proyectos');
    }
  }

  /**
   * Actualizar proyecto
   */
  static async actualizar(req, res) {
    try {
      const id = req.params.id;
      console.log(`💾 Actualizando proyecto ID: ${id}`, req.body);

      const proyectoData = {
        descripcion: req.body.descripcion || req.body.nombre,
        estado: parseInt(req.body.estado) || 1,
        fecha_inicio: req.body.fecha_inicio,
        fecha_cierre: req.body.fecha_cierre,
        precio_venta: parseFloat(req.body.precio_venta) || 0,
        observaciones: req.body.observaciones || '',
        cliente_id: req.body.cliente_id || req.body.personal_id
      };

      // Validaciones básicas
      if (!proyectoData.descripcion) {
        console.warn('⚠️ Descripción vacía');
        return res.redirect(`/proyectos/${id}/editar`);
      }

      const actualizado = await ProyectoModel.updateProyecto(id, proyectoData);

      if (!actualizado) {
        console.warn('⚠️ Proyecto no encontrado o no se pudo actualizar');
        return res.redirect(`/proyectos/${id}/editar`);
      }

      console.log(`✅ Proyecto ${id} actualizado exitosamente`);
      res.redirect(`/proyectos/${id}`);

    } catch (error) {
      console.error('❌ Error al actualizar proyecto:', error);
      
      res.redirect(`/proyectos/${req.params.id}/editar`);
    }
  }

  /**
   * Buscar proyectos con filtros
   */
  static async buscar(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      const filters = {
        descripcion: req.query.descripcion,
        estado: req.query.estado ? parseInt(req.query.estado) : null,
        cliente_nombre: req.query.cliente_nombre,
        fecha_inicio_desde: req.query.fecha_inicio_desde,
        fecha_inicio_hasta: req.query.fecha_inicio_hasta
      };

      // Remover filtros vacíos
      Object.keys(filters).forEach(key => {
        if (!filters[key]) delete filters[key];
      });

      console.log('🔍 Buscando proyectos con filtros:', filters);

      const resultado = await ProyectoModel.searchProyectos(filters, page, limit);

      res.render('proyectos/listar', {
        title: 'Búsqueda de Proyectos',
        proyectos: resultado.data,
        pagination: resultado.pagination,
        currentPage: page,
        query: req.query,
        filters: filters,
        estados: ProyectoModel.ESTADO_NOMBRES || {},
        formatCurrency: ProyectoModel.formatCurrency,
        formatDate: ProyectoModel.formatDate
      });

    } catch (error) {
      console.error('❌ Error al buscar proyectos:', error);
      
      res.redirect('/proyectos');
    }
  }

  /**
   * API: Obtener proyectos en formato JSON
   */
  static async searchJSON(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const filters = {
        descripcion: req.query.descripcion,
        estado: req.query.estado ? parseInt(req.query.estado) : null,
        cliente_nombre: req.query.cliente_nombre
      };

      Object.keys(filters).forEach(key => {
        if (!filters[key]) delete filters[key];
      });

      const resultado = await ProyectoModel.searchProyectos(filters, page, limit);

      res.json({
        success: true,
        data: resultado.data,
        pagination: resultado.pagination
      });

    } catch (error) {
      console.error('❌ Error en API de búsqueda de proyectos:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }

  /**
   * Cambiar estado de proyecto
   */
  static async cambiarEstado(req, res) {
    try {
      const id = req.params.id;
      const { estado, observaciones } = req.body;

      console.log(`🔄 Cambiando estado del proyecto ${id} a ${estado}`);

      const actualizado = await ProyectoModel.updateEstadoProyecto(id, parseInt(estado), observaciones);

      if (!actualizado) {
        return res.status(404).json({
          success: false,
          error: 'Proyecto no encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Estado del proyecto actualizado exitosamente'
      });

    } catch (error) {
      console.error('❌ Error al cambiar estado del proyecto:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }

  /**
   * Crear proyecto desde presupuesto aprobado
   */
  static async crearDesdePresupuesto(req, res) {
    try {
      const presupuestoId = req.params.presupuestoId;
      const proyectoData = req.body;

      console.log(`🔄 Creando proyecto desde presupuesto ${presupuestoId}`);

      const proyectoId = await ProyectoModel.createProyectoFromPresupuesto(presupuestoId, proyectoData);

      
      res.redirect(`/proyectos/${proyectoId}`);

    } catch (error) {
      console.error('❌ Error al crear proyecto desde presupuesto:', error);
      
      res.redirect('/presupuestos');
    }
  }

  /**
   * Dashboard de proyectos con estadísticas
   */
  static async dashboard(req, res) {
    try {
      console.log('📊 Cargando dashboard de proyectos');

      const [estadisticas, proyectosActivos] = await Promise.all([
        ProyectoModel.getEstadisticas(),
        ProyectoModel.getProyectosActivos(10)
      ]);

      res.render('proyectos/dashboard', {
        title: 'Dashboard de Proyectos',
        estadisticas,
        proyectosActivos,
        formatCurrency: ProyectoModel.formatCurrency,
        formatDate: ProyectoModel.formatDate
      });

    } catch (error) {
      console.error('❌ Error al cargar dashboard de proyectos:', error);
      
      res.redirect('/dashboard');
    }
  }

  /**
   * API: Obtener certificados disponibles para asociar
   */
  static async getCertificadosDisponibles(req, res) {
    try {
      const proyectoId = req.params.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const offset = (page - 1) * limit;

      console.log(`🔍 Obteniendo certificados disponibles para proyecto ${proyectoId}`);

      const resultado = await ProyectoModel.getCertificadosDisponibles(proyectoId, limit, offset);

      res.json({
        success: true,
        data: resultado.certificados,
        pagination: {
          total: resultado.total,
          page,
          limit,
          pages: Math.ceil(resultado.total / limit)
        }
      });

    } catch (error) {
      console.error('❌ Error al obtener certificados disponibles:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }

  /**
   * API: Asociar certificado a proyecto
   */
  static async asociarCertificado(req, res) {
    try {
      const proyectoId = req.params.id;
      const { certificadoId } = req.body;

      console.log(`🔗 Asociando certificado ${certificadoId} a proyecto ${proyectoId}`);

      if (!certificadoId) {
        return res.status(400).json({
          success: false,
          error: 'ID de certificado requerido'
        });
      }

      const asociado = await ProyectoModel.asociarCertificado(proyectoId, certificadoId);

      if (!asociado) {
        return res.status(404).json({
          success: false,
          error: 'No se pudo asociar el certificado'
        });
      }

      res.json({
        success: true,
        message: 'Certificado asociado exitosamente'
      });

    } catch (error) {
      console.error('❌ Error al asociar certificado:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }

  /**
   * API: Desasociar certificado de proyecto
   */
  static async desasociarCertificado(req, res) {
    try {
      const { certificadoId } = req.body;

      console.log(`🔓 Desasociando certificado ${certificadoId}`);

      if (!certificadoId) {
        return res.status(400).json({
          success: false,
          error: 'ID de certificado requerido'
        });
      }

      const desasociado = await ProyectoModel.desasociarCertificado(certificadoId);

      if (!desasociado) {
        return res.status(404).json({
          success: false,
          error: 'No se pudo desasociar el certificado'
        });
      }

      res.json({
        success: true,
        message: 'Certificado desasociado exitosamente'
      });

    } catch (error) {
      console.error('❌ Error al desasociar certificado:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }

  /**
   * Eliminar un proyecto
   */
  static async eliminar(req, res) {
    try {
      const id = req.params.id;
      const { confirmacion } = req.body;

      console.log(`🗑️ Eliminando proyecto ID: ${id}, Confirmación: ${confirmacion}`);

      // Validar que se ingresó "ELIMINAR" como confirmación
      if (confirmacion !== 'ELIMINAR') {
        return res.status(400).json({
          success: false,
          error: 'Confirmación inválida. Debe escribir "ELIMINAR"'
        });
      }

      // Verificar que el proyecto existe
      const proyecto = await ProyectoModel.getProyectoById(id);
      if (!proyecto) {
        return res.status(404).json({
          success: false,
          error: 'Proyecto no encontrado'
        });
      }

      // Eliminar el proyecto
      const eliminado = await ProyectoModel.deleteProyecto(id);

      if (!eliminado) {
        return res.status(500).json({
          success: false,
          error: 'No se pudo eliminar el proyecto'
        });
      }

      console.log(`✅ Proyecto ${id} (${proyecto.descripcion}) eliminado exitosamente`);

      res.json({
        success: true,
        message: `Proyecto "${proyecto.descripcion}" eliminado exitosamente`,
        redirect: '/proyectos'
      });

    } catch (error) {
      console.error('❌ Error al eliminar proyecto:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }
}

module.exports = ProyectoController;
