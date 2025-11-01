const CertificadoModel = require('../models/CertificadoModel');
const ProyectoModel = require('../models/ProyectoModel');

/**
 * Controlador de Certificados
 */
class CertificadoController {

  /**
   * Listar todos los certificados con paginación
   */
  static async listar(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const sort = req.query.sort || 'numero';  // Campo por el que ordenar
      const order = req.query.order || 'desc';  // Dirección: asc o desc

      console.log(`📋 Listando certificados - Página ${page}, Límite ${limit}, Sort: ${sort} ${order}`);

      const { certificados, total } = await CertificadoModel.getCertificados(page, limit, sort, order);
      
      console.log(`✅ Certificados obtenidos: ${certificados?.length || 0}, Total: ${total}`);

      const totalPages = Math.ceil(total / limit);
      const from = (page - 1) * limit + 1;
      const to = Math.min(page * limit, total);

      // Generar páginas para mostrar (máximo 5 páginas visibles)
      const pages = [];
      const range = 2; // Páginas antes y después de la actual
      for (let i = Math.max(1, page - range); i <= Math.min(totalPages, page + range); i++) {
        pages.push({
          number: i,
          active: i === page
        });
      }

      const pagination = {
        currentPage: page,
        totalPages,
        total,
        from,
        to,
        previousPage: Math.max(1, page - 1),
        nextPage: Math.min(totalPages, page + 1),
        isFirstPage: page === 1,
        isLastPage: page === totalPages,
        showStartDots: page > range + 1,
        showEndDots: page < totalPages - range,
        pages
      };

      res.render('certificados/listar', {
        title: 'Gestión de Certificados',
        certificados,
        pagination,
        currentPage: page,
        query: req.query,
        estados: CertificadoModel.ESTADO_NOMBRES,
        formatCurrency: CertificadoModel.formatCurrency,
        formatDate: CertificadoModel.formatDate
      });

    } catch (error) {
      console.error('❌ Error al listar certificados:', error);
      console.log('error', 'Error al cargar la lista de certificados');
      res.render('certificados/listar', {
        title: 'Gestión de Certificados',
        certificados: [],
        pagination: null,
        error: 'Error al cargar certificados'
      });
    }
  }

  /**
   * Mostrar formulario de creación de certificado
   */
  static async mostrarCrear(req, res) {
    try {
      console.log('📝 Mostrando formulario de creación de certificado');

      // OPTIMIZADO: Limitar cantidad de proyectos para evitar timeouts
      const proyectosActivos = await ProyectoModel.getProyectosActivos(50); // Reducido a 50

      res.render('certificados/nuevo', {
        title: 'Crear Nuevo Certificado',
        proyectos: proyectosActivos || [],
        estados: CertificadoModel.ESTADO_NOMBRES,
        proyecto_id: req.query.proyecto_id || null
      });

    } catch (error) {
      console.error('❌ Error al mostrar formulario de creación:', error);
      console.log('error', 'Error al cargar el formulario de creación');
      res.redirect('/certificados');
    }
  }

  /**
   * Crear nuevo certificado
   */
  static async crear(req, res) {
    try {
      console.log('💾 Creando nuevo certificado:', req.body);

      const certificadoData = {
        numero: req.body.numero ? parseInt(req.body.numero) : null,
        fecha: req.body.fecha || new Date(),
        alcance: req.body.alcance,
        cantidad: parseFloat(req.body.cantidad) || 1,
        precio_unitario: parseFloat(req.body.precio_unitario) || 0,
        importe: parseFloat(req.body.importe) || 0,
        estado: parseInt(req.body.estado) || 0,
        condiciones: req.body.condiciones || req.body.observacion,
        proyecto_id: req.body.proyecto_id
      };

      // Validaciones básicas
      if (!certificadoData.alcance || !certificadoData.proyecto_id) {
        console.log('error', 'El alcance y el proyecto son campos obligatorios');
        return res.redirect('/certificados/crear');
      }

      // Calcular importe si no se proporcionó
      if (!certificadoData.importe && certificadoData.cantidad && certificadoData.precio_unitario) {
        certificadoData.importe = certificadoData.cantidad * certificadoData.precio_unitario;
      }

      const certificadoId = await CertificadoModel.createCertificado(certificadoData);

      console.log('success', 'Certificado creado exitosamente');
      res.redirect(`/certificados/${certificadoId}`);

    } catch (error) {
      console.error('❌ Error al crear certificado:', error);
      console.log('error', 'Error al crear el certificado: ' + error.message);
      res.redirect('/certificados/crear');
    }
  }

  /**
   * Ver detalles de un certificado
   */
  static async ver(req, res) {
    try {
      const id = req.params.id;
      console.log(`👁️ Visualizando certificado ID: ${id}`);

      const certificado = await CertificadoModel.getCertificadoById(id);

      if (!certificado) {
        console.log('error', 'Certificado no encontrado');
        return res.redirect('/certificados');
      }

      // Obtener información del proyecto si existe
      let proyecto = null;
      let otrosCertificadosProyecto = [];
      let otrosProyectosCliente = [];
      let totalCertificadosCliente = 0;
      let montoTotalCliente = 0;
      
      if (certificado.proyecto_id) {
        proyecto = await ProyectoModel.getProyectoById(certificado.proyecto_id);
        
        // Obtener otros certificados del mismo proyecto
        otrosCertificadosProyecto = await CertificadoModel.getCertificadosByProyecto(certificado.proyecto_id);
        // Excluir el certificado actual
        otrosCertificadosProyecto = otrosCertificadosProyecto.filter(c => c.id !== id);
      }
      
      // Si hay cliente, obtener sus otros proyectos y estadísticas
      if (certificado.cliente_id) {
        try {
          otrosProyectosCliente = await ProyectoModel.getProyectosByCliente(certificado.cliente_id);
          // Excluir el proyecto actual si existe
          if (certificado.proyecto_id) {
            otrosProyectosCliente = otrosProyectosCliente.filter(p => p.id !== certificado.proyecto_id);
          }
          
          // Obtener total de certificados y monto del cliente
          const statsCliente = await CertificadoModel.getStatsCliente(certificado.cliente_id);
          totalCertificadosCliente = statsCliente.totalCertificados;
          montoTotalCliente = statsCliente.montoTotal;
        } catch (error) {
          console.error('Error al obtener datos del cliente:', error);
          // Continuar sin datos de cliente relacionados
        }
      }

      res.render('certificados/ver', {
        title: `Certificado N° ${certificado.numero}`,
        certificado,
        proyecto,
        otrosCertificadosProyecto,
        otrosProyectosCliente,
        totalCertificadosCliente,
        montoTotalCliente,
        returnUrl: req.query.return || '/certificados',
        formatCurrency: CertificadoModel.formatCurrency,
        formatDate: CertificadoModel.formatDate
      });

    } catch (error) {
      console.error('❌ Error al visualizar certificado:', error);
      console.log('error', 'Error al cargar el certificado');
      res.redirect('/certificados');
    }
  }

  /**
   * Mostrar formulario de edición
   */
  static async mostrarEditar(req, res) {
    try {
      const id = req.params.id;
      console.log(`✏️ Mostrando formulario de edición para certificado ID: ${id}`);

      const [certificado, proyectosActivos] = await Promise.all([
        CertificadoModel.getCertificadoById(id),
        ProyectoModel.getProyectosActivos(500) // Incrementado a 500 para incluir más proyectos
      ]);

      if (!certificado) {
        console.log('error', 'Certificado no encontrado');
        return res.redirect('/certificados');
      }

      // Asegurar que el proyecto del certificado esté en la lista
      let proyectos = proyectosActivos;
      if (certificado.proyecto_id && !proyectos.find(p => p.id === certificado.proyecto_id)) {
        // Si el proyecto del certificado no está en la lista, agregarlo
        const proyectoActual = await ProyectoModel.getProyectoById(certificado.proyecto_id);
        if (proyectoActual) {
          proyectos = [proyectoActual, ...proyectos];
        }
      }

      res.render('certificados/editar', {
        title: `Editar Certificado N° ${certificado.numero}`,
        certificado,
        proyectos: proyectos,
        estados: CertificadoModel.ESTADO_NOMBRES,
        returnUrl: req.query.return || '/certificados'
      });

    } catch (error) {
      console.error('❌ Error al mostrar formulario de edición:', error);
      console.log('error', 'Error al cargar el formulario de edición');
      res.redirect('/certificados');
    }
  }

  /**
   * Actualizar certificado
   */
  static async actualizar(req, res) {
    try {
      const id = req.params.id;
      console.log(`💾 Actualizando certificado ID: ${id}`, req.body);

      // Por simplicidad, actualizando solo el estado
      const nuevoEstado = parseInt(req.body.estado);
      const observaciones = req.body.condiciones || req.body.observacion;

      const actualizado = await CertificadoModel.updateEstadoCertificado(id, nuevoEstado, observaciones);

      if (!actualizado) {
        console.log('error', 'No se pudo actualizar el certificado');
        return res.redirect(`/certificados/${id}/editar`);
      }

      console.log('success', 'Certificado actualizado exitosamente');
      res.redirect(`/certificados/${id}`);

    } catch (error) {
      console.error('❌ Error al actualizar certificado:', error);
      console.log('error', 'Error al actualizar el certificado: ' + error.message);
      res.redirect(`/certificados/${req.params.id}/editar`);
    }
  }

  /**
   * Buscar certificados con filtros
   */
  static async buscar(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      console.log('🔍 Búsqueda con filtros:', req.query);

      const filters = {
        numero: req.query.numero ? parseInt(req.query.numero) : null,
        cliente_id: req.query.cliente_id || null,  // ✅ NUEVO: Filtro por ID de cliente
        cliente_nombre: req.query.cliente_nombre || null,
        alcance: req.query.alcance || null,
        estado: req.query.estado !== '' && req.query.estado !== undefined ? parseInt(req.query.estado) : null,
        proyecto_id: req.query.proyecto_id || null,
        fecha: req.query.fecha || null,
        fecha_desde: req.query.fecha_desde || null,
        fecha_hasta: req.query.fecha_hasta || null
      };

      // Remover filtros vacíos
      Object.keys(filters).forEach(key => {
        if (filters[key] === null || filters[key] === undefined || filters[key] === '') {
          delete filters[key];
        }
      });

      const { certificados, total } = await CertificadoModel.buscarCertificados(filters, page, limit);
      
      const totalPages = Math.ceil(total / limit);
      const from = (page - 1) * limit + 1;
      const to = Math.min(page * limit, total);

      // Generar páginas para mostrar
      const pages = [];
      const range = 2;
      for (let i = Math.max(1, page - range); i <= Math.min(totalPages, page + range); i++) {
        pages.push({
          number: i,
          active: i === page
        });
      }

      const pagination = {
        currentPage: page,
        totalPages,
        total,
        from,
        to,
        previousPage: Math.max(1, page - 1),
        nextPage: Math.min(totalPages, page + 1),
        isFirstPage: page === 1,
        isLastPage: page === totalPages,
        showStartDots: page > range + 1,
        showEndDots: page < totalPages - range,
        pages
      };

      // Obtener nombre del cliente si se filtró por cliente_id
      let cliente_display = req.query.cliente_display || '';
      if (req.query.cliente_id && !cliente_display && certificados.length > 0) {
        cliente_display = certificados[0].cliente_nombre;
      }

      res.render('certificados/listar', {
        title: total > 0 ? `Búsqueda: ${total} certificados encontrados` : 'Sin resultados',
        certificados,
        pagination,
        query: {
          ...req.query,
          cliente_display
        }
      });

    } catch (error) {
      console.error('❌ Error al buscar certificados:', error);
      console.log('error', 'Error en la búsqueda de certificados');
      res.redirect('/certificados');
    }
  }

  /**
   * API: Obtener certificados en formato JSON
   */
  static async searchJSON(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const filters = {
        numero: req.query.numero ? parseInt(req.query.numero) : null,
        alcance: req.query.alcance,
        estado: req.query.estado !== undefined ? parseInt(req.query.estado) : null
      };

      Object.keys(filters).forEach(key => {
        if (filters[key] === null || filters[key] === undefined || filters[key] === '') {
          delete filters[key];
        }
      });

      const resultado = await CertificadoModel.searchCertificados(filters, page, limit);

      res.json({
        success: true,
        data: resultado.data,
        pagination: resultado.pagination
      });

    } catch (error) {
      console.error('❌ Error en API de búsqueda de certificados:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }

  /**
   * Cambiar estado de certificado
   */
  static async cambiarEstado(req, res) {
    try {
      const id = req.params.id;
      const { estado, observaciones } = req.body;

      console.log(`🔄 Cambiando estado del certificado ${id} a ${estado}`);

      const actualizado = await CertificadoModel.updateEstadoCertificado(id, parseInt(estado), observaciones);

      if (!actualizado) {
        return res.status(404).json({
          success: false,
          error: 'Certificado no encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Estado del certificado actualizado exitosamente'
      });

    } catch (error) {
      console.error('❌ Error al cambiar estado del certificado:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }

  /**
   * Marcar certificado como facturado
   */
  static async marcarFacturado(req, res) {
    try {
      const id = req.params.id;
      const { fecha_factura } = req.body;

      console.log(`💰 Marcando certificado ${id} como facturado`);

      const actualizado = await CertificadoModel.marcarComoFacturado(id, fecha_factura);

      if (!actualizado) {
        return res.status(404).json({
          success: false,
          error: 'Certificado no encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Certificado marcado como facturado exitosamente'
      });

    } catch (error) {
      console.error('❌ Error al marcar certificado como facturado:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }

  /**
   * Obtener certificados por proyecto (para AJAX)
   */
  static async porProyecto(req, res) {
    try {
      const proyectoId = req.params.proyectoId;
      console.log(`📋 Obteniendo certificados del proyecto ${proyectoId}`);

      const certificados = await CertificadoModel.getCertificadosByProyecto(proyectoId);

      res.json({
        success: true,
        data: certificados
      });

    } catch (error) {
      console.error('❌ Error al obtener certificados por proyecto:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }

  /**
   * Dashboard de certificados con estadísticas
   */
  static async dashboard(req, res) {
    try {
      console.log('📊 Cargando dashboard de certificados');

      const [estadisticas, certificadosRecientes] = await Promise.all([
        CertificadoModel.getEstadisticas(),
        CertificadoModel.getCertificadosRecientes(10)
      ]);

      res.render('certificados/dashboard', {
        title: 'Dashboard de Certificados',
        estadisticas,
        certificadosRecientes,
        estados: CertificadoModel.ESTADO_NOMBRES,
        formatCurrency: CertificadoModel.formatCurrency,
        formatDate: CertificadoModel.formatDate
      });

    } catch (error) {
      console.error('❌ Error al cargar dashboard de certificados:', error);
      console.log('error', 'Error al cargar el dashboard de certificados');
      res.redirect('/dashboard');
    }
  }

  /**
   * Generar reporte de certificados
   */
  static async reporte(req, res) {
    try {
      const { formato, fecha_desde, fecha_hasta, estado, proyecto_id } = req.query;

      const filters = {
        fecha_desde,
        fecha_hasta,
        estado: estado !== undefined ? parseInt(estado) : null,
        proyecto_id
      };

      // Remover filtros vacíos
      Object.keys(filters).forEach(key => {
        if (filters[key] === null || filters[key] === undefined || filters[key] === '') {
          delete filters[key];
        }
      });

      console.log('📊 Generando reporte de certificados:', { formato, filters });

      const resultado = await CertificadoModel.searchCertificados(filters, 1, 1000);

      if (formato === 'json') {
        return res.json({
          success: true,
          data: resultado.data,
          resumen: {
            total_certificados: resultado.data.length,
            valor_total: resultado.data.reduce((sum, cert) => sum + (cert.importe || 0), 0)
          }
        });
      }

      // Renderizar vista de reporte
      res.render('certificados/reporte', {
        title: 'Reporte de Certificados',
        certificados: resultado.data,
        filters,
        resumen: {
          total_certificados: resultado.data.length,
          valor_total: resultado.data.reduce((sum, cert) => sum + (cert.importe || 0), 0)
        },
        formatCurrency: CertificadoModel.formatCurrency,
        formatDate: CertificadoModel.formatDate
      });

    } catch (error) {
      console.error('❌ Error al generar reporte de certificados:', error);
      console.log('error', 'Error al generar el reporte');
      res.redirect('/certificados');
    }
  }
}

module.exports = CertificadoController;
