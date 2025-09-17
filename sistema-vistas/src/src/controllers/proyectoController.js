const ProyectoModel = require('../models/ProyectoModel');
const ClienteModel = require('../models/ClienteModel');

/**
 * Controlador de Proyectos
 */
class ProyectoController {

  /**
   * Listar todos los proyectos con paginación
   */
  static async listar(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      console.log(`📋 Listando proyectos - Página ${page}, Límite ${limit}`);

      const resultado = await ProyectoModel.getProyectos(page, limit);

      res.render('proyectos/listar', {
        title: 'Gestión de Proyectos',
        proyectos: resultado.data,
        pagination: resultado.pagination,
        currentPage: page,
        query: req.query,
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

      const proyecto = await ProyectoModel.getProyectoById(id);

      if (!proyecto) {
        
        return res.redirect('/proyectos');
      }

      res.render('proyectos/ver', {
        title: `Proyecto: ${proyecto.descripcion}`,
        proyecto,
        formatCurrency: ProyectoModel.formatCurrency,
        formatDate: ProyectoModel.formatDate
      });

    } catch (error) {
      console.error('❌ Error al visualizar proyecto:', error);
      
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

      // Por simplicidad, usando updateEstadoProyecto como método base
      // En un escenario real, se implementaría un método updateProyecto completo
      const nuevoEstado = parseInt(req.body.estado);
      const observaciones = req.body.observaciones;

      const actualizado = await ProyectoModel.updateEstadoProyecto(id, nuevoEstado, observaciones);

      if (!actualizado) {
        
        return res.redirect(`/proyectos/${id}/editar`);
      }

      
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
}

module.exports = ProyectoController;
