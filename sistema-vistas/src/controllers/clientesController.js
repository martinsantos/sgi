const pool = require('../config/database');
const { AppError } = require('../middleware/error-handler');
const { v4: uuidv4 } = require('uuid');
const XLSX = require('xlsx');
const ClienteModel = require('../models/ClienteModel');
const ProyectoModel = require('../models/ProyectoModel');
const FacturaModel = require('../models/FacturaModel');

class ClienteController {
  // ===== VISTA: Listado de clientes =====
  static async getClientes(req, res, next) {
    try {
      const { page = 1, limit = 20, sortBy = 'nombre', sortOrder = 'ASC' } = req.query;
      const { data: clientes, pagination } = await ClienteController.fetchClientesList(
        parseInt(page),
        parseInt(limit),
        {},
        sortBy,
        sortOrder
      );

      res.render('clientes/listar', {
        title: 'Clientes',
        clientes,
        pagination,
        layout: 'main',
        user: req.user
      });
    } catch (error) {
      console.error('Error al obtener clientes:', error);
      next(new AppError('Error al cargar el listado de clientes', 500));
    }
  }

  // ===== VISTA: Búsqueda de clientes =====
  static async buscarClientes(req, res, next) {
    try {
      const { q, page = 1, limit = 20, sortBy = 'nombre', sortOrder = 'ASC' } = req.query;
      const filters = {};
      
      if (q) filters.search = q;
      
      const { data: clientes, pagination } = await ClienteController.fetchClientesList(
        parseInt(page),
        parseInt(limit),
        filters,
        sortBy,
        sortOrder
      );

      res.render('clientes/listar', {
        title: 'Búsqueda de Clientes',
        clientes,
        pagination,
        searchQuery: q,
        layout: 'main',
        user: req.user
      });
    } catch (error) {
      console.error('Error al buscar clientes:', error);
      next(new AppError('Error al buscar clientes', 500));
    }
  }

  // ===== VISTA: Formulario nuevo cliente =====
  static async nuevoCliente(req, res, next) {
    try {
      res.render('clientes/nuevo', {
        title: 'Nuevo Cliente',
        layout: 'main',
        user: req.user,
        cliente: {}
      });
    } catch (error) {
      console.error('Error al cargar formulario de nuevo cliente:', error);
      next(new AppError('Error al cargar el formulario', 500));
    }
  }

  // ===== VISTA: Ver detalle de cliente =====
  static async getClienteDetalle(req, res, next) {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substr(2, 9);
    
    console.log(`[ClienteController][${requestId}] === INICIO getClienteDetalle ===`);
    console.log(`[ClienteController][${requestId}] Buscando cliente con ID: ${req.params.id}`);
    console.log(`[ClienteController][${requestId}] URL: ${req.protocol}://${req.get('host')}${req.originalUrl}`);
    
    try {
      const { id } = req.params;
      
      if (!id || id === 'undefined') {
        const errorMsg = `[ClienteController][${requestId}] ID de cliente no proporcionado`;
        console.error(errorMsg);
        return res.status(400).render('error', {
          title: 'Error',
          message: 'ID de cliente no proporcionado',
          layout: 'main',
          user: req.user
        });
      }

      console.log(`[ClienteController][${requestId}] Obteniendo datos del cliente...`);
      const cliente = await ClienteModel.getClienteById(id);
      
      if (!cliente) {
        const errorMsg = `[ClienteController][${requestId}] Cliente con ID ${id} no encontrado`;
        console.error(errorMsg);
        return res.status(404).render('error', {
          title: 'No encontrado',
          message: 'El cliente solicitado no existe',
          layout: 'main',
          user: req.user
        });
      }

      console.log(`[ClienteController][${requestId}] Cliente encontrado:`, {
        id: cliente.id,
        nombre: cliente.nombre,
        apellido: cliente.apellido,
        tipo: cliente.tipo
      });

      // Obtener datos relacionados
      console.log(`[ClienteController][${requestId}] Obteniendo datos relacionados...`);
      const [proyectos, facturas, certificados, resumenFinanciero] = await Promise.all([
        ClienteModel.getProyectosCliente(id).catch(err => {
          console.error(`[ClienteController][${requestId}] Error al obtener proyectos:`, err);
          return [];
        }),
        ClienteModel.getFacturasCliente(id).catch(err => {
          console.error(`[ClienteController][${requestId}] Error al obtener facturas:`, err);
          return [];
        }),
        ClienteModel.getCertificadosCliente(id).catch(err => {
          console.error(`[ClienteController][${requestId}] Error al obtener certificados:`, err);
          return [];
        }),
        ClienteModel.getResumenFinancieroCliente(id).catch(err => {
          console.error(`[ClienteController][${requestId}] Error al obtener resumen financiero:`, err);
          return {};
        })
      ]);

      // Log de depuración detallado
      console.log(`[ClienteController][${requestId}] Datos obtenidos:`, {
        cliente: {
          id: cliente.id,
          nombre: cliente.nombre,
          apellido: cliente.apellido,
          tipo: cliente.tipo,
          tipo_descripcion: cliente.tipo_descripcion
        },
        proyectos: {
          count: proyectos ? proyectos.length : 0,
          first: proyectos && proyectos[0] ? proyectos[0] : null
        },
        facturas: {
          count: facturas ? facturas.length : 0,
          first: facturas && facturas[0] ? facturas[0] : null
        },
        certificados: {
          count: certificados ? certificados.length : 0,
          first: certificados && certificados[0] ? certificados[0] : null
        },
        resumenFinanciero: resumenFinanciero || {}
      });

      const dataToRender = {
        title: `Cliente: ${cliente.nombre_completo || 'Sin nombre'}`,
        cliente: cliente || {},
        proyectos: Array.isArray(proyectos) ? proyectos : [],
        facturas: Array.isArray(facturas) ? facturas : [],
        certificados: Array.isArray(certificados) ? certificados : [],
        resumen: resumenFinanciero || {},
        layout: 'main',
        user: req.user || {},
        _debug: {
          requestId,
          queryTime: Date.now() - startTime,
          url: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
          cliente: !!cliente,
          clienteId: cliente ? cliente.id : 'no-id',
          proyectosCount: proyectos ? proyectos.length : 0,
          facturasCount: facturas ? facturas.length : 0,
          certificadosCount: certificados ? certificados.length : 0,
          hasResumenFinanciero: !!resumenFinanciero,
          timestamp: new Date().toISOString()
        }
      };

      console.log(`[ClienteController][${requestId}] Datos para renderizar:`, {
        cliente: !!dataToRender.cliente,
        proyectosCount: dataToRender.proyectos.length,
        facturasCount: dataToRender.facturas.length,
        hasUser: !!dataToRender.user,
        queryTime: dataToRender._debug.queryTime
      });

      res.render('clientes/detalle', dataToRender);
    } catch (error) {
      console.error('Error al obtener detalle del cliente:', error);
      next(new AppError('Error al cargar el detalle del cliente', 500));
    }
  }

  // ===== API: Obtener listado de clientes =====
  static async getClientesAPI(req, res, next) {
    try {
      const { page = 1, limit = 20, sortBy = 'nombre', sortOrder = 'ASC' } = req.query;
      const { data: clientes, pagination } = await ClienteController.fetchClientesList(
        parseInt(page),
        parseInt(limit),
        {},
        sortBy,
        sortOrder
      );

      res.json({
        success: true,
        data: clientes,
        pagination
      });
    } catch (error) {
      console.error('Error en getClientesAPI:', error);
      next(new AppError('Error al obtener el listado de clientes', 500));
    }
  }

  // ===== API: Búsqueda de clientes =====
  static async buscarClientesAPI(req, res, next) {
    try {
      const { q, page = 1, limit = 20, sortBy = 'nombre', sortOrder = 'ASC' } = req.query;
      const filters = {};
      
      if (q) filters.search = q;
      
      const { data: clientes, pagination } = await ClienteController.fetchClientesList(
        parseInt(page),
        parseInt(limit),
        filters,
        sortBy,
        sortOrder
      );

      res.json({
        success: true,
        data: clientes,
        pagination
      });
    } catch (error) {
      console.error('Error en buscarClientesAPI:', error);
      next(new AppError('Error al buscar clientes', 500));
    }
  }
  // ===== VISTAS =====
  
  /**
   * Obtiene los proyectos de un cliente
   */
  static async getProyectosCliente(req, res, next) {
    try {
      const { id } = req.params;
      const proyectos = await ProyectoModel.getProyectosByCliente(id);
      
      res.json({
        success: true,
        data: proyectos
      });
    } catch (error) {
      console.error('Error al obtener proyectos del cliente:', error);
      next(new AppError('Error al obtener proyectos del cliente', 500));
    }
  }

  /**
   * Obtiene las facturas de un cliente
   */
  static async getFacturasCliente(req, res, next) {
    try {
      const { id } = req.params;
      const facturas = await FacturaModel.getByClienteId(id);
      
      res.json({
        success: true,
        data: facturas
      });
    } catch (error) {
      console.error('Error al obtener facturas del cliente:', error);
      next(new AppError('Error al obtener facturas del cliente', 500));
    }
  }

  /**
   * Busca clientes con filtros
   */
  static async buscarClientes(req, res, next) {
    try {
      const { q, page = 1, limit = 20, sortBy = 'nombre', sortOrder = 'ASC' } = req.query;
      
      const filters = {};
      if (q) filters.search = q;
      
      const { data: clientes, pagination } = await ClienteModel.getClientesCompletos(
        parseInt(page), 
        parseInt(limit), 
        filters, 
        sortBy, 
        sortOrder
      );
      
      res.render('clientes/listar', {
        title: 'Búsqueda de Clientes',
        clientes,
        pagination,
        searchQuery: q,
        layout: 'main',
        helpers: this.getTemplateHelpers()
      });
    } catch (error) {
      console.error('Error al buscar clientes:', error);
      res.status(500).render('error', {
        title: 'Error',
        message: 'Ocurrió un error al buscar clientes',
        layout: 'main'
      });
    }
  }

  /**
   * Busca clientes (API)
   */
  static async buscarClientesAPI(req, res, next) {
    try {
      const { q, page = 1, limit = 20, sortBy = 'nombre', sortOrder = 'ASC' } = req.query;
      
      const filters = {};
      if (q) filters.search = q;
      
      const { data: clientes, pagination } = await ClienteModel.getClientesCompletos(
        parseInt(page), 
        parseInt(limit), 
        filters, 
        sortBy, 
        sortOrder
      );
      
      res.json({
        success: true,
        data: clientes,
        pagination
      });
    } catch (error) {
      console.error('Error al buscar clientes:', error);
      res.status(500).render('error', {
        title: 'Error',
        message: 'Ocurrió un error al buscar clientes',
        layout: 'main'
      });
    }
  }
  
  /**
   * Muestra el listado de clientes
   */
  static async getClientes(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const search = req.query.search || '';
      const sortBy = req.query.sort_by || 'nombre';
      const sortOrder = req.query.sort_order || 'ASC';
      
      const filters = { search };
      
      const { data: clientes, pagination } = await ClienteController.fetchClientesList(
        page, limit, filters, sortBy, sortOrder
      );
      
      res.render('clientes/listar', {
        title: 'Clientes',
        clientes,
        pagination,
        currentPage: page,
        search,
        sort_by: sortBy,
        sort_order: sortOrder,
        layout: 'main',
        helpers: {
          formatDate: date => date ? new Date(date).toLocaleDateString('es-AR') : '',
          formatCurrency: amount => new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS'
          }).format(amount || 0),
          getBadgeClass: tipo_persona => tipo_persona === 'Física' ? 'bg-info' : 'bg-success'
        }
      });
    } catch (error) {
      console.error('Error al obtener clientes:', error);
      res.status(500).render('error', {
        title: 'Error',
        message: 'Ocurrió un error al obtener el listado de clientes',
        layout: 'main'
      });
    }
  }

  /**
   * Helper interno: obtiene listado de clientes con paginación, búsqueda y orden
   */
  static async fetchClientesList(page = 1, limit = 20, filters = {}, sortBy = 'nombre', sortOrder = 'ASC') {
    // Validar columnas permitidas para orden
    const allowedSort = new Set(['nombre', 'codigo', 'created', 'modified', 'monto_total', 'total_facturas', 'total_proyectos', 'ultima_actividad']);
    const sortSel = allowedSort.has(String(sortBy).toLowerCase()) ? String(sortBy).toLowerCase() : 'nombre';
    const order = String(sortOrder).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const offset = (page - 1) * limit;
    const search = (filters && filters.search) ? String(filters.search).trim() : '';

    // Filtros básicos sobre persona_terceros
    const whereParts = ['pt.activo = 1'];
    const params = [];
    if (search) {
      whereParts.push('(pt.nombre LIKE ? OR pt.apellido LIKE ? OR pt.codigo LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term);
    }
    const whereSql = whereParts.length ? ('WHERE ' + whereParts.join(' AND ')) : '';

    // Total
    const [countRows] = await pool.query(`
      SELECT COUNT(*) as total
      FROM persona_terceros pt
      ${whereSql}
    `, params);
    const total = countRows[0]?.total || 0;

    // Definir expresión de orden
    let orderExpr = 'pt.nombre';
    if (sortSel === 'nombre') orderExpr = 'display_nombre';
    else if (sortSel === 'codigo') orderExpr = 'pt.codigo';
    else if (sortSel === 'created') orderExpr = 'pt.created';
    else if (sortSel === 'modified') orderExpr = 'pt.modified';
    else if (sortSel === 'monto_total') orderExpr = 'monto_total';
    else if (sortSel === 'total_facturas') orderExpr = 'total_facturas';
    else if (sortSel === 'total_proyectos') orderExpr = 'total_proyectos';
    else if (sortSel === 'ultima_actividad') orderExpr = 'ultima_actividad';

    // Datos - con subconsultas para traer datos calculados
    const [rows] = await pool.query(`
      SELECT 
        pt.id,
        pt.nombre,
        pt.apellido,
        NULLIF(CONCAT_WS(' ', pt.nombre, pt.apellido), '') AS display_nombre,
        pt.codigo,
        pt.cbu,
        pt.tipo,
        pt.tipo_persona,
        pt.condicion_iva,
        pt.activo,
        pt.created,
        pt.modified,
        COALESCE((SELECT COUNT(*) FROM factura_ventas fv WHERE fv.persona_tercero_id = pt.id AND fv.activo = 1), 0) as total_facturas,
        COALESCE((SELECT SUM(fv.total) FROM factura_ventas fv WHERE fv.persona_tercero_id = pt.id AND fv.activo = 1), 0) as monto_total,
        COALESCE((SELECT SUM(CASE WHEN fv.estado IN (1,2) THEN fv.total ELSE 0 END) FROM factura_ventas fv WHERE fv.persona_tercero_id = pt.id AND fv.activo = 1), 0) as monto_pendiente,
        0 as total_proyectos,
        COALESCE((SELECT MAX(fv.fecha_emision) FROM factura_ventas fv WHERE fv.persona_tercero_id = pt.id AND fv.activo = 1), '1970-01-01') as ultima_actividad
      FROM persona_terceros pt
      ${whereSql}
      ORDER BY ${orderExpr} ${order}
      LIMIT ? OFFSET ?
    `, [...params, Number(limit), Number(offset)]);

    const totalPages = Math.max(1, Math.ceil(total / limit));
    const pagination = {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    };

    return { data: rows, pagination };
  }

  /**
   * Muestra el formulario para crear un nuevo cliente
   */
  static async nuevoCliente(req, res) {
    try {
      res.render('clientes/nuevo', {
        title: 'Nuevo Cliente',
        layout: 'main',
        cliente: {}
      });
    } catch (error) {
      console.error('Error al cargar formulario de cliente:', error);
      res.status(500).render('error', {
        title: 'Error',
        message: 'Error al cargar el formulario',
        layout: 'main'
      });
    }
  }

  /**
   * Muestra el detalle de un cliente
   */
  // ===== API ENDPOINTS =====

  /**
   * Obtiene el listado de clientes (JSON)
   */
  static async getClientesAPI(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const search = req.query.search || '';
      const sortBy = req.query.sortBy || req.query.sort_by || '';
      const sortOrder = req.query.sortOrder || req.query.sort_order || 'ASC';
      
      const filters = { search };
      
      const { data: clientes, pagination } = await ClienteModel.getClientesCompletos(
        page, limit, filters, sortBy, sortOrder
      );
      
      res.json({
        success: true,
        data: clientes,
        pagination
      });
    } catch (error) {
      console.error('❌ Error en getClientesAPI:', error);
      next(new AppError('Error al obtener clientes', 500));
    }
  }

  /**
   * Crea un nuevo cliente
   */
  static async createCliente(req, res, next) {
    try {
      const { 
        nombre, codigo, tipo_persona, cuil_cuit, 
        contacto_principal, email, telefono,
        condicion_iva, tipo_cliente 
      } = req.body;

      // Validaciones básicas - solo nombre es obligatorio
      if (!nombre || nombre.trim() === '') {
        const errorMsg = 'El nombre es obligatorio';
        console.warn('❌ Validación fallida:', errorMsg);
        
        if (req.xhr || req.headers.accept.includes('application/json')) {
          return res.status(400).json({
            success: false,
            message: errorMsg
          });
        }
        
        return res.status(400).render('clientes/nuevo', {
          title: 'Nuevo Cliente',
          layout: 'main',
          user: req.user,
          error: errorMsg,
          cliente: req.body
        });
      }

      const id = uuidv4();
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

      console.log('📝 Creando cliente:', {
        id,
        nombre,
        codigo: codigo || 'auto',
        tipo_cliente: tipo_cliente || 'N/A'
      });

      await pool.query(
        `INSERT INTO clientes (
          id, nombre, codigo, tipo_persona, cuil_cuit,
          contacto_principal, email, telefono,
          condicion_iva, tipo_cliente,
          created, modified, activo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [id, nombre, codigo || null, tipo_persona || null, cuil_cuit || null, 
         contacto_principal || null, email || null, telefono || null,
         condicion_iva || null, tipo_cliente || null,
         now, now]
      );

      console.log('✅ Cliente creado exitosamente:', id);

      // Si es una petición API, devolver JSON
      if (req.xhr || req.headers.accept.includes('application/json')) {
        const [cliente] = await pool.query(
          'SELECT * FROM clientes WHERE id = ?',
          [id]
        );
        
        return res.status(201).json({
          success: true,
          data: cliente[0]
        });
      }
      
      // Si es un formulario, redirigir
      res.redirect('/clientes');
    } catch (error) {
      console.error('❌ Error al crear cliente:', error);
      
      if (req.xhr || req.headers.accept.includes('application/json')) {
        return res.status(500).json({
          success: false,
          message: 'Error al crear cliente: ' + error.message
        });
      }
      
      res.status(500).render('clientes/nuevo', {
        title: 'Nuevo Cliente',
        layout: 'main',
        user: req.user,
        error: 'Error al crear el cliente: ' + error.message,
        cliente: req.body
      });
    }
  }

  /**
   * Actualiza un cliente existente
   */
  static async updateCliente(req, res, next) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

      // Verificar si existe
      const [existing] = await pool.query(
        'SELECT id FROM clientes WHERE id = ?',
        [id]
      );

      if (existing.length === 0) {
        return next(new AppError('Cliente no encontrado', 404));
      }

      // Construir query de update dinámicamente
      const allowedFields = [
        'nombre', 'codigo', 'tipo_persona', 'cuil_cuit',
        'contacto_principal', 'email', 'telefono',
        'condicion_iva', 'tipo_cliente', 'activo'
      ];

      const validUpdates = Object.keys(updates)
        .filter(key => allowedFields.includes(key))
        .reduce((obj, key) => (obj[key] = updates[key], obj), {});

      if (Object.keys(validUpdates).length === 0) {
        return next(new AppError('No hay campos válidos para actualizar', 400));
      }

      // Agregar modified
      validUpdates.modified = now;

      const fields = Object.keys(validUpdates).map(field => `${field} = ?`).join(', ');
      const values = [...Object.values(validUpdates), id];

      await pool.query(
        `UPDATE clientes SET ${fields} WHERE id = ?`,
        values
      );

      const [cliente] = await pool.query(
        'SELECT * FROM clientes WHERE id = ?',
        [id]
      );

      res.json({
        success: true,
        data: cliente[0]
      });
    } catch (error) {
      console.error('Error al actualizar cliente:', error);
      next(new AppError('Error al actualizar cliente', 500));
    }
  }

  /**
   * Obtiene el detalle de un cliente (API)
   */
  static async getClienteDetalleAPI(req, res, next) {
    try {
      const { id } = req.params;

      // Datos básicos del cliente
      const [cliente] = await pool.query(
        'SELECT * FROM clientes WHERE id = ?',
        [id]
      );

      if (cliente.length === 0) {
        return next(new AppError('Cliente no encontrado', 404));
      }

      // Obtener estadísticas y datos relacionados usando el modelo
      const clienteCompleto = await ClienteModel.getClienteById(id);
      
      if (!clienteCompleto) {
        return next(new AppError('Cliente no encontrado', 404));
      }

      res.json({
        success: true,
        data: clienteCompleto
      });
    } catch (error) {
      console.error('Error al obtener detalle del cliente:', error);
      next(new AppError('Error al obtener detalle del cliente', 500));
    }
  }

  // ===== MÉTODOS AUXILIARES =====

  /**
   * Obtiene los helpers para las plantillas
   */
  static getTemplateHelpers() {
    return {
      formatDate: function(date) {
        if (!date) return '';
        try {
          return new Date(date).toLocaleDateString('es-AR');
        } catch (e) {
          return date;
        }
      },
      formatCurrency: function(amount) {
        return new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: 'ARS'
        }).format(amount || 0);
      },
      formatNumber: function(number) {
        return new Intl.NumberFormat('es-AR').format(number || 0);
      },
      getEstadoBadge: function(estado, tipo = 'factura') {
        const badges = {
          factura: {
            1: { class: 'bg-warning text-dark', text: 'Pendiente' },
            2: { class: 'bg-info', text: 'Pagada Parcial' },
            3: { class: 'bg-success', text: 'Pagada' },
            4: { class: 'bg-primary', text: 'En Proceso' },
            5: { class: 'bg-danger', text: 'Anulada' }
          },
          proyecto: {
            1: { class: 'bg-secondary', text: 'Pendiente' },
            2: { class: 'bg-primary', text: 'En Progreso' },
            3: { class: 'bg-success', text: 'Finalizado' },
            4: { class: 'bg-danger', text: 'Cancelado' }
          },
          certificado: {
            0: { class: 'bg-warning text-dark', text: 'Pendiente' },
            1: { class: 'bg-success', text: 'Aprobado' },
            2: { class: 'bg-info', text: 'Facturado' }
          }
        };
        
        const badge = (badges[tipo] && badges[tipo][estado]) || 
                     { class: 'bg-secondary', text: 'Desconocido' };
        
        return `<span class="badge ${badge.class}">${badge.text}</span>`;
      },
      getCondicionIva: function(condicion) {
        const condiciones = {
          1: 'IVA Responsable Inscripto',
          2: 'IVA Responsable No Inscripto', 
          3: 'IVA Exento',
          4: 'No Responsable',
          5: 'Consumidor Final',
          6: 'Responsable Monotributo',
          7: 'Sujeto No Categorizado'
        };
        return condiciones[condicion] || 'No definida';
      },
      calcularPorcentaje: function(parte, total) {
        if (!total || total === 0) return 0;
        return Math.round((parte / total) * 100);
      },
      eq: function(a, b) {
        return a == b;
      }
    };
  }
}

module.exports = ClienteController;
