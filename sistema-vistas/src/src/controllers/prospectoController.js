const ProspectoModel = require('../models/ProspectoModel');
const ExcelJS = require('exceljs');

class ProspectoController {
  
  /**
   * Dashboard principal de prospectos
   */
  static async index(req, res) {
    try {
      const estadisticas = await ProspectoModel.getEstadisticas();
      const seguimiento = await ProspectoModel.getProspectosSeguimiento();
      const recientes = await ProspectoModel.getProspectos(1, 5, {}, 'created', 'DESC');
      
      res.render('prospectos/index', {
        title: 'Gestión de Prospectos',
        estadisticas,
        seguimiento,
        recientes: recientes.data,
        layout: 'main'
      });
      
    } catch (error) {
      console.error('Error en dashboard de prospectos:', error);
      res.status(500).render('error', {
        message: 'Error al cargar el dashboard de prospectos',
        error: process.env.NODE_ENV === 'development' ? error : {}
      });
    }
  }

  /**
   * Lista de prospectos con filtros
   */
  static async listar(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const search = req.query.search || '';
      const estado = req.query.estado;
      const origen = req.query.origen || '';
      const sortBy = req.query.sortBy || 'created';
      const sortOrder = req.query.sortOrder || 'DESC';
      
      const filters = {
        search,
        estado,
        origen,
        fecha_desde: req.query.fecha_desde,
        fecha_hasta: req.query.fecha_hasta
      };
      
      const result = await ProspectoModel.getProspectos(page, limit, filters, sortBy, sortOrder);
      
      // Estados para el filtro
      const estados = [
        { value: 0, label: 'Nuevo', class: 'secondary' },
        { value: 1, label: 'Contactado', class: 'info' },
        { value: 2, label: 'Calificado', class: 'warning' },
        { value: 3, label: 'Propuesta', class: 'primary' },
        { value: 4, label: 'No Interesado', class: 'danger' }
      ];
      
      res.render('prospectos/listar', {
        title: 'Lista de Prospectos',
        prospectos: result.data,
        pagination: result.pagination,
        filters: {
          search,
          estado: estado !== undefined ? parseInt(estado) : '',
          origen,
          fecha_desde: req.query.fecha_desde || '',
          fecha_hasta: req.query.fecha_hasta || ''
        },
        estados,
        sortBy,
        sortOrder,
        layout: 'main'
      });
      
    } catch (error) {
      console.error('Error al listar prospectos:', error);
      res.status(500).render('error', {
        message: 'Error al cargar la lista de prospectos',
        error: process.env.NODE_ENV === 'development' ? error : {}
      });
    }
  }

  /**
   * Mostrar formulario de creación
   */
  static async crear(req, res) {
    try {
      const origenes = ['Web', 'Referido', 'Cold Call', 'Networking', 'Publicidad', 'Otro'];
      
      res.render('prospectos/crear', {
        title: 'Nuevo Prospecto',
        origenes,
        layout: 'main'
      });
      
    } catch (error) {
      console.error('Error al mostrar formulario de creación:', error);
      res.status(500).render('error', {
        message: 'Error al cargar el formulario',
        error: process.env.NODE_ENV === 'development' ? error : {}
      });
    }
  }

  /**
   * Guardar nuevo prospecto
   */
  static async guardar(req, res) {
    try {
      const data = {
        nombre: req.body.nombre?.trim(),
        apellido: req.body.apellido?.trim(),
        empresa: req.body.empresa?.trim(),
        telefono: req.body.telefono?.trim(),
        email: req.body.email?.trim(),
        estado: parseInt(req.body.estado) || 0,
        origen: req.body.origen?.trim(),
        fecha_contacto: req.body.fecha_contacto || new Date(),
        observaciones: req.body.observaciones?.trim(),
        valor_estimado: parseFloat(req.body.valor_estimado) || null,
        probabilidad: parseInt(req.body.probabilidad) || null,
        fecha_seguimiento: req.body.fecha_seguimiento || null
      };
      
      // Validaciones básicas
      if (!data.nombre) {
        return res.status(400).json({
          success: false,
          message: 'El nombre es requerido'
        });
      }
      
      if (data.email && !data.email.includes('@')) {
        return res.status(400).json({
          success: false,
          message: 'Email inválido'
        });
      }
      
      const id = await ProspectoModel.createProspecto(data);
      
      res.json({
        success: true,
        message: 'Prospecto creado exitosamente',
        id: id
      });
      
    } catch (error) {
      console.error('Error al guardar prospecto:', error);
      res.status(500).json({
        success: false,
        message: 'Error al guardar el prospecto'
      });
    }
  }

  /**
   * Ver detalle de prospecto
   */
  static async ver(req, res) {
    try {
      const prospecto = await ProspectoModel.getProspectoById(req.params.id);
      
      if (!prospecto) {
        return res.status(404).render('error', {
          message: 'Prospecto no encontrado'
        });
      }
      
      // Estados para mostrar
      const estados = {
        0: { label: 'Nuevo', class: 'secondary' },
        1: { label: 'Contactado', class: 'info' },
        2: { label: 'Calificado', class: 'warning' },
        3: { label: 'Propuesta', class: 'primary' },
        4: { label: 'No Interesado', class: 'danger' }
      };
      
      res.render('prospectos/ver', {
        title: `Prospecto - ${prospecto.nombre} ${prospecto.apellido || ''}`,
        prospecto,
        estados,
        layout: 'main'
      });
      
    } catch (error) {
      console.error('Error al mostrar prospecto:', error);
      res.status(500).render('error', {
        message: 'Error al cargar el prospecto',
        error: process.env.NODE_ENV === 'development' ? error : {}
      });
    }
  }

  /**
   * Mostrar formulario de edición
   */
  static async editar(req, res) {
    try {
      const prospecto = await ProspectoModel.getProspectoById(req.params.id);
      
      if (!prospecto) {
        return res.status(404).render('error', {
          message: 'Prospecto no encontrado'
        });
      }
      
      const origenes = ['Web', 'Referido', 'Cold Call', 'Networking', 'Publicidad', 'Otro'];
      const estados = [
        { value: 0, label: 'Nuevo' },
        { value: 1, label: 'Contactado' },
        { value: 2, label: 'Calificado' },
        { value: 3, label: 'Propuesta' },
        { value: 4, label: 'No Interesado' }
      ];
      
      res.render('prospectos/editar', {
        title: `Editar Prospecto - ${prospecto.nombre}`,
        prospecto,
        origenes,
        estados,
        layout: 'main'
      });
      
    } catch (error) {
      console.error('Error al mostrar formulario de edición:', error);
      res.status(500).render('error', {
        message: 'Error al cargar el formulario de edición',
        error: process.env.NODE_ENV === 'development' ? error : {}
      });
    }
  }

  /**
   * Actualizar prospecto
   */
  static async actualizar(req, res) {
    try {
      const data = {
        nombre: req.body.nombre?.trim(),
        apellido: req.body.apellido?.trim(),
        empresa: req.body.empresa?.trim(),
        telefono: req.body.telefono?.trim(),
        email: req.body.email?.trim(),
        estado: parseInt(req.body.estado) || 0,
        origen: req.body.origen?.trim(),
        fecha_contacto: req.body.fecha_contacto,
        observaciones: req.body.observaciones?.trim(),
        valor_estimado: parseFloat(req.body.valor_estimado) || null,
        probabilidad: parseInt(req.body.probabilidad) || null,
        fecha_seguimiento: req.body.fecha_seguimiento || null
      };
      
      // Validaciones básicas
      if (!data.nombre) {
        return res.status(400).json({
          success: false,
          message: 'El nombre es requerido'
        });
      }
      
      const updated = await ProspectoModel.updateProspecto(req.params.id, data);
      
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Prospecto no encontrado'
        });
      }
      
      res.json({
        success: true,
        message: 'Prospecto actualizado exitosamente'
      });
      
    } catch (error) {
      console.error('Error al actualizar prospecto:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar el prospecto'
      });
    }
  }

  /**
   * Eliminar prospecto
   */
  static async eliminar(req, res) {
    try {
      const deleted = await ProspectoModel.deleteProspecto(req.params.id);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Prospecto no encontrado'
        });
      }
      
      res.json({
        success: true,
        message: 'Prospecto eliminado exitosamente'
      });
      
    } catch (error) {
      console.error('Error al eliminar prospecto:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar el prospecto'
      });
    }
  }

  // =============================================================================
  // API ENDPOINTS
  // =============================================================================

  /**
   * API: Búsqueda de prospectos (JSON)
   */
  static async apiSearch(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const search = req.query.search || '';
      const estado = req.query.estado;
      const origen = req.query.origen || '';
      
      const result = await ProspectoModel.searchProspectos({
        page,
        limit,
        search,
        estado,
        origen
      });
      
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
      
    } catch (error) {
      console.error('Error en API search prospectos:', error);
      res.status(500).json({
        success: false,
        message: 'Error en la búsqueda'
      });
    }
  }

  /**
   * API: Actualizar estado de prospecto
   */
  static async apiUpdateEstado(req, res) {
    try {
      const { estado, observaciones } = req.body;
      
      if (estado === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Estado es requerido'
        });
      }
      
      const updated = await ProspectoModel.updateEstado(
        req.params.id,
        parseInt(estado),
        observaciones
      );
      
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Prospecto no encontrado'
        });
      }
      
      res.json({
        success: true,
        message: 'Estado actualizado exitosamente'
      });
      
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar el estado'
      });
    }
  }

  /**
   * API: Convertir prospecto a cliente
   */
  static async apiConvertirCliente(req, res) {
    try {
      const clienteData = {
        nombre: req.body.nombre?.trim(),
        apellido: req.body.apellido?.trim(),
        codigo: req.body.codigo?.trim(),
        tipo_persona: req.body.tipo_persona || 'fisica',
        condicion_iva: parseInt(req.body.condicion_iva) || 1
      };
      
      const result = await ProspectoModel.convertirACliente(req.params.id, clienteData);
      
      res.json({
        success: true,
        message: 'Prospecto convertido a cliente exitosamente',
        clienteId: result.clienteId,
        prospectoId: result.prospectoId
      });
      
    } catch (error) {
      console.error('Error al convertir prospecto:', error);
      res.status(500).json({
        success: false,
        message: 'Error al convertir el prospecto a cliente'
      });
    }
  }

  /**
   * API: Estadísticas de prospectos
   */
  static async apiEstadisticas(req, res) {
    try {
      const estadisticas = await ProspectoModel.getEstadisticas();
      
      res.json({
        success: true,
        data: estadisticas
      });
      
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener las estadísticas'
      });
    }
  }

  /**
   * Exportar prospectos a Excel
   */
  static async exportarExcel(req, res) {
    try {
      // Obtener todos los prospectos sin paginación
      const filters = {
        search: req.query.search || '',
        estado: req.query.estado,
        origen: req.query.origen || '',
        fecha_desde: req.query.fecha_desde,
        fecha_hasta: req.query.fecha_hasta
      };
      
      const result = await ProspectoModel.getProspectos(1, 1000, filters);
      
      // Crear libro de Excel
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Prospectos');
      
      // Definir columnas
      worksheet.columns = [
        { header: 'Nombre', key: 'nombre', width: 20 },
        { header: 'Apellido', key: 'apellido', width: 20 },
        { header: 'Empresa', key: 'empresa', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Teléfono', key: 'telefono', width: 15 },
        { header: 'Estado', key: 'estado', width: 15 },
        { header: 'Origen', key: 'origen', width: 15 },
        { header: 'Valor Estimado', key: 'valor_estimado', width: 15 },
        { header: 'Probabilidad (%)', key: 'probabilidad', width: 12 },
        { header: 'Fecha Contacto', key: 'fecha_contacto', width: 15 },
        { header: 'Cliente Convertido', key: 'cliente_nombre', width: 25 },
        { header: 'Observaciones', key: 'observaciones', width: 40 }
      ];
      
      // Mapeo de estados
      const estadosMap = {
        0: 'Nuevo',
        1: 'Contactado', 
        2: 'Calificado',
        3: 'Propuesta',
        4: 'No Interesado'
      };
      
      // Agregar datos
      result.data.forEach(prospecto => {
        worksheet.addRow({
          nombre: prospecto.nombre,
          apellido: prospecto.apellido,
          empresa: prospecto.empresa,
          email: prospecto.email,
          telefono: prospecto.telefono,
          estado: estadosMap[prospecto.estado] || 'Desconocido',
          origen: prospecto.origen,
          valor_estimado: prospecto.valor_estimado,
          probabilidad: prospecto.probabilidad,
          fecha_contacto: prospecto.fecha_contacto ? new Date(prospecto.fecha_contacto).toLocaleDateString() : '',
          cliente_nombre: prospecto.cliente_nombre || '',
          observaciones: prospecto.observaciones
        });
      });
      
      // Aplicar estilos al header
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF366092' }
      };
      headerRow.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      
      // Configurar respuesta
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=prospectos-${new Date().toISOString().split('T')[0]}.xlsx`);
      
      await workbook.xlsx.write(res);
      res.end();
      
    } catch (error) {
      console.error('Error al exportar prospectos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al generar la exportación'
      });
    }
  }
}

module.exports = ProspectoController;
