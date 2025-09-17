const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * Modelo de Presupuestos
 * Maneja todas las operaciones relacionadas con presupuestos
 */
class PresupuestoModel {
  
  /**
   * Estados posibles de un presupuesto
   */
  static ESTADOS = {
    BORRADOR: '0',
    ENVIADO: '1', 
    APROBADO: '2',
    RECHAZADO: '3',
    VENCIDO: '4'
  };

  /**
   * Mapeo de estados a nombres legibles
   */
  static ESTADO_NOMBRES = {
    '0': 'Borrador',
    '1': 'Enviado',
    '2': 'Aprobado', 
    '3': 'Rechazado',
    '4': 'Vencido'
  };

  /**
   * Obtener lista de presupuestos con paginación y filtros
   * @param {Object} options - Opciones de consulta
   * @param {number} options.page - Página actual
   * @param {number} options.limit - Registros por página
   * @param {Object} options.filters - Filtros aplicados
   * @param {string} options.sortBy - Campo de ordenamiento
   * @param {string} options.sortOrder - Orden (ASC/DESC)
   * @returns {Object} Resultado con datos y paginación
   */
  static async getPresupuestos(options = {}) {
    const {
      page = 1,
      limit = 20,
      filters = {},
      sortBy = 'created',
      sortOrder = 'DESC'
    } = options;
    
    const offset = (page - 1) * limit;
    let whereConditions = ['p.activo = 1'];
    let queryParams = [];
    
    try {
      // Construir condiciones WHERE dinámicamente
      if (filters.numero) {
        whereConditions.push('p.numero LIKE ?');
        queryParams.push(`%${filters.numero}%`);
      }
      
      if (filters.cliente_nombre) {
        whereConditions.push('(pt.nombre LIKE ? OR pt.apellido LIKE ?)');
        queryParams.push(`%${filters.cliente_nombre}%`, `%${filters.cliente_nombre}%`);
      }
      
      if (filters.estado !== undefined && filters.estado !== '') {
        whereConditions.push('p.estado = ?');
        queryParams.push(filters.estado);
      }
      
      if (filters.fecha_desde) {
        whereConditions.push('DATE(p.created) >= ?');
        queryParams.push(filters.fecha_desde);
      }
      
      if (filters.fecha_hasta) {
        whereConditions.push('DATE(p.created) <= ?');
        queryParams.push(filters.fecha_hasta);
      }
      
      if (filters.importe_desde) {
        whereConditions.push('p.precio_venta >= ?');
        queryParams.push(parseFloat(filters.importe_desde));
      }
      
      if (filters.importe_hasta) {
        whereConditions.push('p.precio_venta <= ?');
        queryParams.push(parseFloat(filters.importe_hasta));
      }
      
      if (filters.texto_libre) {
        whereConditions.push('(p.descripcion LIKE ? OR p.alcance LIKE ? OR p.observacion LIKE ? OR pt.nombre LIKE ? OR CAST(p.numero AS CHAR) LIKE ?)');
        const searchTerm = `%${filters.texto_libre}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      }
      
      const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
      
      // Validar campo de ordenamiento
      const validSortFields = ['created', 'numero', 'precio_venta', 'estado', 'fecha_cierre', 'cliente_nombre'];
      const sortField = validSortFields.includes(sortBy) ? 
        (sortBy === 'cliente_nombre' ? 'pt.nombre' : `p.${sortBy}`) : 'p.created';
      
      const sortDirection = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
      
      // Consulta principal
      const query = `
        SELECT 
          p.id,
          p.numero,
          p.descripcion,
          p.alcance,
          p.precio_venta,
          p.estado,
          p.fecha_cierre,
          p.fecha_presentacion,
          p.created,
          p.modified,
          p.observacion,
          p.probabilidad,
          p.destacado,
          p.prioridad,
          p.cotizacion_dolar,
          p.comision_venta,
          p.costo_equipo,
          p.costo_servicio,
          p.costo_logistica,
          p.margen_contribucion,
          p.porcentaje_margen_contribucion,
          COALESCE(CONCAT(pt.nombre, ' ', COALESCE(pt.apellido, '')), 'Sin cliente') as cliente_nombre,
          COALESCE(ps.cuil_cuit, 'N/A') as cliente_cuit,
          COALESCE(ps.email, 'N/A') as cliente_email,
          COALESCE(ps.telefono, 'N/A') as cliente_telefono,
          CASE 
            WHEN p.fecha_cierre IS NOT NULL AND p.fecha_cierre < CURDATE() THEN DATEDIFF(CURDATE(), p.fecha_cierre)
            ELSE 0
          END as dias_vencimiento,
          CASE
            WHEN p.fecha_cierre IS NOT NULL AND p.fecha_cierre < CURDATE() AND p.estado IN ('0','1') THEN 1
            ELSE 0
          END as esta_vencido
        FROM presupuestos p
        LEFT JOIN persona_terceros pt ON p.cliente_id = pt.id
        LEFT JOIN personas ps ON pt.id = ps.id
        ${whereClause}
        ORDER BY ${sortField} ${sortDirection}
        LIMIT ? OFFSET ?
      `;
      
      const searchParams = [...queryParams, limit, offset];
      const [presupuestos] = await db.execute(query, searchParams);
      
      // Consulta para contar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM presupuestos p
        LEFT JOIN persona_terceros pt ON p.cliente_id = pt.id
        LEFT JOIN personas ps ON pt.id = ps.id
        ${whereClause}
      `;
      
      const [countResult] = await db.execute(countQuery, queryParams);
      const total = countResult[0].total;
      
      // Procesar resultados
      const processedData = presupuestos.map(item => ({
        ...item,
        estado_nombre: this.ESTADO_NOMBRES[item.estado] || 'Desconocido',
        precio_venta_formatted: this.formatCurrency(item.precio_venta),
        created_formatted: this.formatDate(item.created),
        fecha_cierre_formatted: this.formatDate(item.fecha_cierre),
        probabilidad_formatted: `${item.probabilidad || 0}%`
      }));
      
      return {
        success: true,
        data: processedData,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalRecords: total,
          limit: limit,
          offset: offset,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        },
        filters: filters
      };
      
    } catch (error) {
      console.error('Error al obtener presupuestos:', error);
      throw new Error(`Error en consulta de presupuestos: ${error.message}`);
    }
  }
  
  /**
   * Obtener presupuesto completo por ID
   * @param {string} id - ID del presupuesto
   * @returns {Object|null} Presupuesto completo o null si no existe
   */
  static async getPresupuestoById(id) {
    try {
      const query = `
        SELECT 
          p.*,
          COALESCE(CONCAT(pt.nombre, ' ', COALESCE(pt.apellido, '')), 'Sin cliente') as cliente_nombre,
          COALESCE(ps.cuil_cuit, 'N/A') as cliente_cuit,
          COALESCE(ps.email, 'N/A') as cliente_email,
          COALESCE(ps.telefono, 'N/A') as cliente_telefono,
          CASE 
            WHEN p.fecha_cierre IS NOT NULL AND p.fecha_cierre < CURDATE() THEN DATEDIFF(CURDATE(), p.fecha_cierre)
            ELSE 0
          END as dias_vencimiento,
          CASE
            WHEN p.fecha_cierre IS NOT NULL AND p.fecha_cierre < CURDATE() AND p.estado IN ('0','1') THEN 1
            ELSE 0
          END as esta_vencido
        FROM presupuestos p
        LEFT JOIN persona_terceros pt ON p.cliente_id = pt.id
        LEFT JOIN personas ps ON pt.id = ps.id
        WHERE p.id = ? AND p.activo = 1
      `;
      
      const [rows] = await db.execute(query, [id]);
      
      if (rows.length === 0) {
        return null;
      }
      
      const presupuesto = rows[0];
      presupuesto.estado_nombre = this.ESTADO_NOMBRES[presupuesto.estado] || 'Desconocido';
      presupuesto.precio_venta_formatted = this.formatCurrency(presupuesto.precio_venta);
      presupuesto.created_formatted = this.formatDate(presupuesto.created);
      presupuesto.fecha_cierre_formatted = this.formatDate(presupuesto.fecha_cierre);
      
      return presupuesto;
      
    } catch (error) {
      console.error('Error al obtener presupuesto por ID:', error);
      throw new Error(`Error al obtener presupuesto: ${error.message}`);
    }
  }

  /**
   * Crear nuevo presupuesto
   * @param {Object} data - Datos del presupuesto
   * @returns {string} ID del presupuesto creado
   */
  static async create(data) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Generar ID único
      const id = uuidv4();
      
      // Obtener próximo número de presupuesto
      const [maxNumero] = await connection.execute(
        'SELECT COALESCE(MAX(numero), 0) + 1 as next_numero FROM presupuestos'
      );
      const numeroPresupuesto = maxNumero[0].next_numero;
      
      const query = `
        INSERT INTO presupuestos (
          id, numero, personal_id, descripcion, alcance, precio_venta,
          cliente_id, moneda_id, fecha_cierre, estado, observacion,
          probabilidad, prioridad, destacado, cotizacion_dolar,
          comision_venta, costo_equipo, costo_servicio, costo_logistica,
          margen_contribucion, porcentaje_margen_contribucion,
          fecha_presentacion, activo, created, modified
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW()
        )
      `;
      
      const params = [
        id,
        numeroPresupuesto,
        data.personal_id || null,
        data.descripcion || '',
        data.alcance || '',
        parseFloat(data.precio_venta) || 0,
        data.cliente_id || null,
        data.moneda_id || 2, // Default peso argentino
        data.fecha_cierre || null,
        data.estado || this.ESTADOS.BORRADOR,
        data.observacion || '',
        parseInt(data.probabilidad) || 0,
        parseInt(data.prioridad) || 1,
        data.destacado ? 1 : 0,
        parseFloat(data.cotizacion_dolar) || 0,
        parseFloat(data.comision_venta) || 0,
        parseFloat(data.costo_equipo) || 0,
        parseFloat(data.costo_servicio) || 0,
        parseFloat(data.costo_logistica) || 0,
        parseFloat(data.margen_contribucion) || 0,
        parseFloat(data.porcentaje_margen_contribucion) || 0,
        data.fecha_presentacion || null
      ];
      
      await connection.execute(query, params);
      await connection.commit();
      
      return id;
      
    } catch (error) {
      await connection.rollback();
      console.error('Error al crear presupuesto:', error);
      throw new Error(`Error al crear presupuesto: ${error.message}`);
    } finally {
      connection.release();
    }
  }

  /**
   * Actualizar presupuesto existente
   * @param {string} id - ID del presupuesto
   * @param {Object} data - Datos a actualizar
   * @returns {boolean} True si se actualizó correctamente
   */
  static async update(id, data) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Verificar que el presupuesto existe
      const [existing] = await connection.execute(
        'SELECT id FROM presupuestos WHERE id = ? AND activo = 1',
        [id]
      );
      
      if (existing.length === 0) {
        throw new Error('Presupuesto no encontrado');
      }
      
      const query = `
        UPDATE presupuestos SET
          descripcion = ?,
          alcance = ?,
          precio_venta = ?,
          cliente_id = ?,
          fecha_cierre = ?,
          estado = ?,
          observacion = ?,
          probabilidad = ?,
          prioridad = ?,
          destacado = ?,
          cotizacion_dolar = ?,
          comision_venta = ?,
          costo_equipo = ?,
          costo_servicio = ?,
          costo_logistica = ?,
          margen_contribucion = ?,
          porcentaje_margen_contribucion = ?,
          fecha_presentacion = ?,
          modified = NOW()
        WHERE id = ?
      `;
      
      const params = [
        data.descripcion || '',
        data.alcance || '',
        parseFloat(data.precio_venta) || 0,
        data.cliente_id || null,
        data.fecha_cierre || null,
        data.estado || this.ESTADOS.BORRADOR,
        data.observacion || '',
        parseInt(data.probabilidad) || 0,
        parseInt(data.prioridad) || 1,
        data.destacado ? 1 : 0,
        parseFloat(data.cotizacion_dolar) || 0,
        parseFloat(data.comision_venta) || 0,
        parseFloat(data.costo_equipo) || 0,
        parseFloat(data.costo_servicio) || 0,
        parseFloat(data.costo_logistica) || 0,
        parseFloat(data.margen_contribucion) || 0,
        parseFloat(data.porcentaje_margen_contribucion) || 0,
        data.fecha_presentacion || null,
        id
      ];
      
      const [result] = await connection.execute(query, params);
      await connection.commit();
      
      return result.affectedRows > 0;
      
    } catch (error) {
      await connection.rollback();
      console.error('Error al actualizar presupuesto:', error);
      throw new Error(`Error al actualizar presupuesto: ${error.message}`);
    } finally {
      connection.release();
    }
  }

  /**
   * Eliminar presupuesto (soft delete)
   * @param {string} id - ID del presupuesto
   * @returns {boolean} True si se eliminó correctamente
   */
  static async delete(id) {
    try {
      const query = 'UPDATE presupuestos SET activo = 0, modified = NOW() WHERE id = ?';
      const [result] = await db.execute(query, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error al eliminar presupuesto:', error);
      throw new Error(`Error al eliminar presupuesto: ${error.message}`);
    }
  }

  /**
   * Actualizar estado de un presupuesto
   * @param {string} id - ID del presupuesto
   * @param {string} estado - Nuevo estado
   * @returns {boolean} True si se actualizó correctamente
   */
  static async updateEstado(id, estado) {
    try {
      // Validar que el estado sea válido
      if (!Object.values(this.ESTADOS).includes(estado)) {
        throw new Error('Estado inválido');
      }
      
      const query = `
        UPDATE presupuestos 
        SET estado = ?, modified = NOW() 
        WHERE id = ? AND activo = 1
      `;
      
      const [result] = await db.execute(query, [estado, id]);
      return result.affectedRows > 0;
      
    } catch (error) {
      console.error('Error al actualizar estado del presupuesto:', error);
      throw new Error(`Error al actualizar estado: ${error.message}`);
    }
  }

  /**
   * Obtener estadísticas completas de presupuestos
   * @returns {Object} Estadísticas detalladas
   */
  static async getEstadisticas() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_presupuestos,
          SUM(CASE WHEN estado = '0' THEN 1 ELSE 0 END) as borradores,
          SUM(CASE WHEN estado = '1' THEN 1 ELSE 0 END) as enviados,
          SUM(CASE WHEN estado = '2' THEN 1 ELSE 0 END) as aprobados,
          SUM(CASE WHEN estado = '3' THEN 1 ELSE 0 END) as rechazados,
          SUM(CASE WHEN estado = '4' THEN 1 ELSE 0 END) as vencidos,
          AVG(COALESCE(precio_venta, 0)) as importe_promedio,
          SUM(COALESCE(precio_venta, 0)) as importe_total_todos,
          SUM(CASE WHEN estado = '2' THEN COALESCE(precio_venta, 0) ELSE 0 END) as importe_aprobados,
          SUM(CASE WHEN destacado = 1 THEN 1 ELSE 0 END) as destacados,
          COUNT(CASE WHEN fecha_cierre < CURDATE() AND estado IN ('0','1') THEN 1 END) as vencidos_pendientes
        FROM presupuestos
        WHERE activo = 1
      `;
      
      const [rows] = await db.execute(query);
      const stats = rows[0];
      
      // Agregar tasas de conversión
      const totalActivos = stats.enviados + stats.aprobados + stats.rechazados;
      stats.tasa_aprobacion = totalActivos > 0 ? (stats.aprobados / totalActivos * 100) : 0;
      stats.tasa_rechazo = totalActivos > 0 ? (stats.rechazados / totalActivos * 100) : 0;
      
      return stats;
      
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      throw new Error(`Error al obtener estadísticas: ${error.message}`);
    }
  }
  
  /**
   * Buscar presupuestos con filtros
   */
  static async searchPresupuestos(filters = {}, page = 1, limit = 20, sortBy = 'fecha_emision', sortOrder = 'DESC') {
    const offset = (page - 1) * limit;
    let whereConditions = [];
    let queryParams = [];
    
    try {
      // Construir condiciones WHERE
      if (filters.numero_presupuesto) {
        whereConditions.push('p.numero LIKE ?');
        queryParams.push(`%${filters.numero_presupuesto}%`);
      }
      
      if (filters.cliente_nombre) {
        whereConditions.push('pt.nombre LIKE ?');
        queryParams.push(`%${filters.cliente_nombre}%`);
      }
      
      if (filters.estado) {
        whereConditions.push('p.estado = ?');
        queryParams.push(filters.estado);
      }
      
      if (filters.fecha_desde) {
        whereConditions.push('p.created >= ?');
        queryParams.push(filters.fecha_desde);
      }
      
      if (filters.fecha_hasta) {
        whereConditions.push('p.created <= ?');
        queryParams.push(filters.fecha_hasta);
      }
      
      if (filters.importe_desde) {
        whereConditions.push('p.precio_venta >= ?');
        queryParams.push(filters.importe_desde);
      }
      
      if (filters.importe_hasta) {
        whereConditions.push('p.precio_venta <= ?');
        queryParams.push(filters.importe_hasta);
      }
      
      if (filters.texto_libre) {
        whereConditions.push('(p.observacion LIKE ? OR pt.nombre LIKE ? OR p.numero LIKE ?)');
        const searchTerm = `%${filters.texto_libre}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm);
      }
      
      // Validar sortBy
      const validSortColumns = ['fecha_emision', 'numero', 'cliente_nombre', 'importe_total', 'estado', 'fecha_validez'];
      if (!validSortColumns.includes(sortBy)) {
        sortBy = 'fecha_emision';
      }
      
      // Validar sortOrder
      if (!['ASC', 'DESC'].includes(sortOrder.toUpperCase())) {
        sortOrder = 'DESC';
      }
      
      const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
      
      // Consulta principal
      const query = `
        SELECT 
          p.id,
          p.numero as numero_presupuesto,
          p.created as fecha_emision,
          p.fecha_cierre as fecha_validez,
          p.precio_venta as importe_total,
          p.estado,
          p.observacion as observaciones,
          pt.nombre as cliente_nombre,
          ps.cuil_cuit as cliente_cuit,
          CASE 
            WHEN p.estado = 0 THEN 'Borrador'
            WHEN p.estado = 1 THEN 'Enviado'  
            WHEN p.estado = 2 THEN 'Aprobado'
            WHEN p.estado = 3 THEN 'Rechazado'
            WHEN p.estado = 4 THEN 'Vencido'
            ELSE 'Desconocido'
          END as estado_nombre,
          DATEDIFF(CURDATE(), p.fecha_cierre) as dias_vencimiento
        FROM presupuestos p
        LEFT JOIN persona_terceros pt ON p.cliente_id = pt.id
        LEFT JOIN personas ps ON pt.id = ps.id
        ${whereClause}
        ORDER BY ${sortBy === 'cliente_nombre' ? 'pt.nombre' : (sortBy === 'fecha_emision' ? 'p.created' : (sortBy === 'importe_total' ? 'p.precio_venta' : 'p.' + sortBy))} ${sortOrder}
        LIMIT ? OFFSET ?
      `;
      
      const searchParams = [...queryParams, limit, offset];
      const [presupuestos] = await db.execute(query, searchParams);
      
      // Consulta para contar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM presupuestos p
        LEFT JOIN persona_terceros pt ON p.cliente_id = pt.id
        ${whereClause}
      `;
      
      const [countResult] = await db.execute(countQuery, queryParams);
      const total = countResult[0].total;
      
      return {
        data: presupuestos,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalRecords: total,
          limit: limit,
          offset: offset
        }
      };
      
    } catch (error) {
      console.error('Error en búsqueda de presupuestos:', error);
      throw error;
    }
  }
  
  /**
   * Obtener estadísticas de presupuestos
   */
  static async getEstadisticas() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_presupuestos,
          SUM(CASE WHEN estado = 0 THEN 1 ELSE 0 END) as borradores,
          SUM(CASE WHEN estado = 1 THEN 1 ELSE 0 END) as enviados,
          SUM(CASE WHEN estado = 2 THEN 1 ELSE 0 END) as aprobados,
          SUM(CASE WHEN estado = 3 THEN 1 ELSE 0 END) as rechazados,
          SUM(CASE WHEN estado = 4 THEN 1 ELSE 0 END) as vencidos,
          AVG(precio_venta) as importe_promedio,
          SUM(precio_venta) as importe_total_todos,
          SUM(CASE WHEN estado = 2 THEN precio_venta ELSE 0 END) as importe_aprobados
        FROM presupuestos
      `;
      
      const [rows] = await db.execute(query);
      return rows[0];
      
    } catch (error) {
      console.error('Error al obtener estadísticas de presupuestos:', error);
      throw error;
    }
  }
  
  /**
   * Actualizar estado de presupuesto
   */
  static async updateEstado(id, nuevoEstado) {
    try {
      const query = `
        UPDATE presupuestos 
        SET estado = ?,
            fecha_modificacion = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      
      const [result] = await db.execute(query, [nuevoEstado, id]);
      return result.affectedRows > 0;
      
    } catch (error) {
      console.error('Error al actualizar estado del presupuesto:', error);
      throw error;
    }
  }
  
  /**
   * Crear nuevo presupuesto
   */
  static async create(presupuestoData) {
    try {
      const query = `
        INSERT INTO presupuestos (
          numero, cliente_id, fecha_emision, fecha_validez, 
          importe_total, estado, observaciones, fecha_creacion
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;
      
      const params = [
        presupuestoData.numero,
        presupuestoData.cliente_id,
        presupuestoData.fecha_emision,
        presupuestoData.fecha_validez,
        presupuestoData.importe_total,
        presupuestoData.estado || 1,
        presupuestoData.observaciones
      ];
      
      const [result] = await db.execute(query, params);
      return result.insertId;
      
    } catch (error) {
      console.error('Error al crear presupuesto:', error);
      throw error;
    }
  }
  
  /**
   * Obtener lista de clientes para dropdown
   * @returns {Array} Lista de clientes
   */
  static async getClientes() {
    try {
      const query = `
        SELECT 
          pt.id,
          COALESCE(CONCAT(pt.nombre, ' ', COALESCE(pt.apellido, '')), pt.nombre) as nombre,
          COALESCE(ps.cuil_cuit, 'N/A') as cuil_cuit
        FROM persona_terceros pt
        LEFT JOIN personas ps ON pt.id = ps.id
        WHERE pt.activo = 1
        ORDER BY pt.nombre
      `;
      
      const [clientes] = await db.execute(query);
      return clientes;
      
    } catch (error) {
      console.error('Error al obtener clientes:', error);
      throw new Error(`Error al obtener clientes: ${error.message}`);
    }
  }

  /**
   * Formatear moneda
   * @param {number} amount - Cantidad a formatear
   * @returns {string} Cantidad formateada
   */
  static formatCurrency(amount) {
    if (!amount || isNaN(amount)) return '$0.00';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Formatear fecha
   * @param {string|Date} date - Fecha a formatear
   * @returns {string} Fecha formateada
   */
  static formatDate(date) {
    if (!date) return 'N/A';
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return 'N/A';
      
      return dateObj.toLocaleDateString('es-AR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      return 'N/A';
    }
  }

  /**
   * Validar datos de presupuesto
   * @param {Object} data - Datos a validar
   * @returns {Object} Resultado de validación
   */
  static validate(data) {
    const errors = [];
    
    if (!data.descripcion || data.descripcion.trim() === '') {
      errors.push('La descripción es obligatoria');
    }
    
    if (data.precio_venta && (isNaN(data.precio_venta) || parseFloat(data.precio_venta) < 0)) {
      errors.push('El precio de venta debe ser un número válido y positivo');
    }
    
    if (data.probabilidad && (isNaN(data.probabilidad) || parseInt(data.probabilidad) < 0 || parseInt(data.probabilidad) > 100)) {
      errors.push('La probabilidad debe ser un número entre 0 y 100');
    }
    
    if (data.estado && !Object.values(this.ESTADOS).includes(data.estado)) {
      errors.push('El estado especificado no es válido');
    }
    
    if (data.fecha_cierre) {
      const fechaCierre = new Date(data.fecha_cierre);
      if (isNaN(fechaCierre.getTime())) {
        errors.push('La fecha de cierre no es válida');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Obtener presupuestos próximos a vencer
   * @param {number} days - Días de anticipación
   * @returns {Array} Presupuestos próximos a vencer
   */
  static async getProximosAVencer(days = 7) {
    try {
      const query = `
        SELECT 
          p.id,
          p.numero,
          p.descripcion,
          p.fecha_cierre,
          p.precio_venta,
          COALESCE(CONCAT(pt.nombre, ' ', COALESCE(pt.apellido, '')), 'Sin cliente') as cliente_nombre,
          DATEDIFF(p.fecha_cierre, CURDATE()) as dias_restantes
        FROM presupuestos p
        LEFT JOIN persona_terceros pt ON p.cliente_id = pt.id
        WHERE p.activo = 1 
          AND p.estado IN ('0', '1') 
          AND p.fecha_cierre IS NOT NULL
          AND p.fecha_cierre >= CURDATE()
          AND p.fecha_cierre <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
        ORDER BY p.fecha_cierre ASC
      `;
      
      const [presupuestos] = await db.execute(query, [days]);
      return presupuestos.map(item => ({
        ...item,
        precio_venta_formatted: this.formatCurrency(item.precio_venta),
        fecha_cierre_formatted: this.formatDate(item.fecha_cierre)
      }));
      
    } catch (error) {
      console.error('Error al obtener presupuestos próximos a vencer:', error);
      throw new Error(`Error al obtener presupuestos próximos a vencer: ${error.message}`);
    }
  }

  /**
   * Duplicar presupuesto
   * @param {string} id - ID del presupuesto a duplicar
   * @returns {string} ID del nuevo presupuesto
   */
  static async duplicate(id) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Obtener presupuesto original
      const [original] = await connection.execute(
        'SELECT * FROM presupuestos WHERE id = ? AND activo = 1',
        [id]
      );
      
      if (original.length === 0) {
        throw new Error('Presupuesto no encontrado');
      }
      
      const presupuestoOriginal = original[0];
      
      // Crear nueva copia
      const nuevoId = uuidv4();
      
      // Obtener próximo número
      const [maxNumero] = await connection.execute(
        'SELECT COALESCE(MAX(numero), 0) + 1 as next_numero FROM presupuestos'
      );
      const numeroPresupuesto = maxNumero[0].next_numero;
      
      const query = `
        INSERT INTO presupuestos (
          id, numero, personal_id, descripcion, alcance, precio_venta,
          cliente_id, moneda_id, fecha_cierre, estado, observacion,
          probabilidad, prioridad, destacado, cotizacion_dolar,
          comision_venta, costo_equipo, costo_servicio, costo_logistica,
          margen_contribucion, porcentaje_margen_contribucion,
          fecha_presentacion, activo, created, modified
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW()
        )
      `;
      
      const params = [
        nuevoId,
        numeroPresupuesto,
        presupuestoOriginal.personal_id,
        `[COPIA] ${presupuestoOriginal.descripcion}`,
        presupuestoOriginal.alcance,
        presupuestoOriginal.precio_venta,
        presupuestoOriginal.cliente_id,
        presupuestoOriginal.moneda_id,
        null, // Nueva fecha de cierre vacía
        this.ESTADOS.BORRADOR, // Resetear a borrador
        presupuestoOriginal.observacion,
        presupuestoOriginal.probabilidad,
        presupuestoOriginal.prioridad,
        0, // No destacado por defecto
        presupuestoOriginal.cotizacion_dolar,
        presupuestoOriginal.comision_venta,
        presupuestoOriginal.costo_equipo,
        presupuestoOriginal.costo_servicio,
        presupuestoOriginal.costo_logistica,
        presupuestoOriginal.margen_contribucion,
        presupuestoOriginal.porcentaje_margen_contribucion,
        null // Nueva fecha de presentación vacía
      ];
      
      await connection.execute(query, params);
      await connection.commit();
      
      return nuevoId;
      
    } catch (error) {
      await connection.rollback();
      console.error('Error al duplicar presupuesto:', error);
      throw new Error(`Error al duplicar presupuesto: ${error.message}`);
    } finally {
      connection.release();
    }
  }
  };

  /**
   * Crear un nuevo presupuesto
   * @param {Object} presupuestoData - Datos del presupuesto
   * @returns {string|null} ID del presupuesto creado o null si falló
   */
  static async createPresupuesto(presupuestoData) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      // Generar UUID para el nuevo presupuesto
      const id = uuidv4();
      
      // Generar número de presupuesto automáticamente
      const numeroPresupuesto = await this.generateNumeroPresupuesto();
      
      const query = `
        INSERT INTO presupuestos (
          id, numero_presupuesto, cliente_id, fecha_validez, observaciones,
          importe_total, dias_vencimiento, estado, created, updated, activo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 1)
      `;
      
      const valores = [
        id,
        numeroPresupuesto,
        presupuestoData.cliente_id,
        presupuestoData.fecha_validez,
        presupuestoData.observaciones || '',
        presupuestoData.importe_total || 0,
        presupuestoData.dias_vencimiento || 30,
        presupuestoData.estado || 0
      ];
      
      console.log('📝 Creando presupuesto:', { query, valores });
      
      await connection.execute(query, valores);
      
      console.log('✅ Presupuesto creado exitosamente:', id);
      return id;
      
    } catch (error) {
      console.error('❌ Error al crear presupuesto:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Actualizar un presupuesto existente
   * @param {string} id - ID del presupuesto
   * @param {Object} presupuestoData - Datos del presupuesto
   * @returns {boolean} true si se actualizó correctamente
   */
  static async updatePresupuesto(id, presupuestoData) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      const query = `
        UPDATE presupuestos 
        SET cliente_id = ?, numero_presupuesto = ?, fecha_validez = ?, 
            observaciones = ?, importe_total = ?, dias_vencimiento = ?, 
            estado = ?, updated = NOW()
        WHERE id = ? AND activo = 1
      `;
      
      const valores = [
        presupuestoData.cliente_id,
        presupuestoData.numero_presupuesto,
        presupuestoData.fecha_validez,
        presupuestoData.observaciones || '',
        presupuestoData.importe_total || 0,
        presupuestoData.dias_vencimiento || 30,
        presupuestoData.estado || 0,
        id
      ];
      
      console.log('📝 Actualizando presupuesto:', { id, query, valores });
      
      const [result] = await connection.execute(query, valores);
      
      const success = result.affectedRows > 0;
      console.log(success ? '✅ Presupuesto actualizado exitosamente' : '⚠️ No se encontró el presupuesto');
      
      return success;
      
    } catch (error) {
      console.error('❌ Error al actualizar presupuesto:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Eliminar un presupuesto (soft delete)
   * @param {string} id - ID del presupuesto
   * @returns {boolean} true si se eliminó correctamente
   */
  static async deletePresupuesto(id) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      const query = `
        UPDATE presupuestos 
        SET activo = 0, updated = NOW()
        WHERE id = ? AND activo = 1
      `;
      
      console.log('🗑️ Eliminando presupuesto:', id);
      
      const [result] = await connection.execute(query, [id]);
      
      const success = result.affectedRows > 0;
      console.log(success ? '✅ Presupuesto eliminado exitosamente' : '⚠️ No se encontró el presupuesto');
      
      return success;
      
    } catch (error) {
      console.error('❌ Error al eliminar presupuesto:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Duplicar un presupuesto existente
   * @param {string} id - ID del presupuesto a duplicar
   * @returns {string|null} ID del nuevo presupuesto o null si falló
   */
  static async duplicatePresupuesto(id) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      // Obtener el presupuesto original
      const presupuestoOriginal = await this.getPresupuestoById(id);
      if (!presupuestoOriginal) {
        console.log('⚠️ No se encontró el presupuesto original para duplicar');
        return null;
      }
      
      // Crear datos para el nuevo presupuesto
      const nuevoPresupuestoData = {
        cliente_id: presupuestoOriginal.cliente_id,
        fecha_validez: presupuestoOriginal.fecha_validez,
        observaciones: `Copia de: ${presupuestoOriginal.observaciones || 'Sin observaciones'}`,
        importe_total: presupuestoOriginal.importe_total,
        dias_vencimiento: presupuestoOriginal.dias_vencimiento,
        estado: 0 // Siempre como borrador
      };
      
      console.log('🔄 Duplicando presupuesto:', id);
      
      // Crear el nuevo presupuesto
      const nuevoId = await this.createPresupuesto(nuevoPresupuestoData);
      
      console.log('✅ Presupuesto duplicado exitosamente:', nuevoId);
      return nuevoId;
      
    } catch (error) {
      console.error('❌ Error al duplicar presupuesto:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Generar número de presupuesto automáticamente
   * @returns {string} Número de presupuesto
   */
  static async generateNumeroPresupuesto() {
    let connection;
    try {
      connection = await pool.getConnection();
      
      // Obtener el último número de presupuesto del año actual
      const year = new Date().getFullYear();
      const query = `
        SELECT numero_presupuesto 
        FROM presupuestos 
        WHERE YEAR(created) = ? AND activo = 1
        ORDER BY created DESC 
        LIMIT 1
      `;
      
      const [rows] = await connection.execute(query, [year]);
      
      let nextNumber = 1;
      if (rows.length > 0 && rows[0].numero_presupuesto) {
        const lastNumber = rows[0].numero_presupuesto;
        // Extraer el número del formato YYYY-NNNN
        const numberPart = lastNumber.split('-').pop();
        nextNumber = parseInt(numberPart) + 1;
      }
      
      // Generar el nuevo número con formato YYYY-NNNN
      const numeroPresupuesto = `${year}-${nextNumber.toString().padStart(4, '0')}`;
      
      console.log('🔢 Número de presupuesto generado:', numeroPresupuesto);
      return numeroPresupuesto;
      
    } catch (error) {
      console.error('❌ Error al generar número de presupuesto:', error);
      // Fallback: usar timestamp
      return `${new Date().getFullYear()}-${Date.now()}`;
    } finally {
      if (connection) connection.release();
    }
  }

  module.exports = PresupuestoModel;
