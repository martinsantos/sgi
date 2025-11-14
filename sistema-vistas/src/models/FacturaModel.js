// Importar mysql2/promise directamente para evitar problemas de caché
const mysql = require('mysql2/promise');
require('dotenv').config();

// Crear instancia específica del pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'ultimami_sgi',
  port: parseInt(process.env.DB_PORT) || 3306,
  socketPath: process.env.DB_SOCKET,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: '-03:00',
  multipleStatements: false,
  dateStrings: true
});

class FacturaModel {
  /**
   * Obtiene todas las facturas emitidas con paginación
   * @param {number} page - Número de página (comienza en 1)
   * @param {number} limit - Cantidad de registros por página
   * @returns {Promise<Array>} - Lista de facturas
   */
  static async getFacturasEmitidas(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [rows] = await pool.query(`
      SELECT 
        fv.id,
        fv.numero_operacion,
        fv.tipo_factura,
        fv.numero_factura,
        fv.fecha_emision,
        fv.total,
        fv.cancelado,
        fv.estado,
        fv.observaciones,
        -- Información del cliente mejorada
        CASE 
          WHEN pt.apellido IS NOT NULL AND pt.apellido != '' THEN CONCAT(pt.apellido, ', ', COALESCE(pt.nombre, ''))
          ELSE COALESCE(pt.nombre, pt.apellido, 'Sin nombre')
        END as cliente_nombre,
        pt.id as cliente_id,
        pt.codigo as cliente_codigo,
        -- Estado descriptivo
        CASE fv.estado
          WHEN 1 THEN 'Pendiente'
          WHEN 2 THEN 'Pagada Parcial'
          WHEN 3 THEN 'Pagada'
          WHEN 4 THEN 'En Proceso'
          WHEN 5 THEN 'Anulada'
          ELSE 'Desconocido'
        END as estado_nombre,
        -- Saldo pendiente
        (fv.total - COALESCE(fv.cancelado, 0)) as saldo_pendiente
      FROM factura_ventas fv
      INNER JOIN persona_terceros pt ON fv.persona_tercero_id = pt.id
      WHERE fv.activo = 1
      ORDER BY fv.fecha_emision DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);
    
    const [count] = await pool.query('SELECT COUNT(*) as total FROM factura_ventas WHERE activo = 1');
    
    return {
      data: rows,
      pagination: {
        total: count[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count[0].total / limit)
      }
    };
  }

  /**
   * Obtiene una factura por su ID
   * @param {string} id - ID de la factura
   * @returns {Promise<Object>} - Datos de la factura
   */
  static async getFacturaById(id) {
    const [rows] = await pool.query(`
      SELECT 
        fv.*,
        -- Información del cliente (solo campos existentes)
        CASE 
          WHEN pt.apellido IS NOT NULL AND pt.apellido != '' THEN CONCAT(pt.apellido, ', ', COALESCE(pt.nombre, ''))
          ELSE COALESCE(pt.nombre, pt.apellido, 'Sin nombre')
        END as cliente_nombre,
        pt.codigo as cliente_codigo,
        pt.condicion_iva as cliente_condicion_iva,
        pt.tipo as cliente_tipo,
        pt.tipo_persona as cliente_tipo_persona,
        -- Estado descriptivo
        CASE fv.estado
          WHEN 1 THEN 'Pendiente'
          WHEN 2 THEN 'Pagada Parcial'
          WHEN 3 THEN 'Pagada'
          WHEN 4 THEN 'En Proceso'
          WHEN 5 THEN 'Anulada'
          ELSE 'Desconocido'
        END as estado_nombre,
        -- Saldo pendiente
        (fv.total - COALESCE(fv.cancelado, 0)) as saldo_pendiente
      FROM factura_ventas fv
      LEFT JOIN persona_terceros pt ON fv.persona_tercero_id = pt.id
      WHERE fv.id = ?
    `, [id]);
    
    if (rows.length === 0) {
      return null;
    }
    
    const factura = rows[0];
    
    // Obtener los detalles de la factura (consulta simplificada)
    let detalles = [];
    try {
      const [detallesRows] = await pool.query(`
        SELECT * FROM factura_venta_detalles 
        WHERE factura_venta_id = ?
      `, [id]);
      detalles = detallesRows || [];
    } catch (detalleError) {
      console.warn('Advertencia: No se pudieron cargar los detalles de la factura:', detalleError.message);
    }
    
    factura.detalles = detalles;
    
    return factura;
  }

  /**
   * Actualizar múltiples campos de factura
   * @param {string} id - ID de la factura
   * @param {Object} updateData - Objeto con campos a actualizar
   * @returns {Promise<boolean>} - True si la actualización fue exitosa
   */
  static async updateFacturaField(id, updateData) {
    // Si es el formato antiguo (id, campo, valor)
    if (typeof updateData === 'string') {
      const campo = updateData;
      const valor = arguments[2];
      
      const camposPermitidos = [
        'observaciones',
        'estado',
        'fecha_pago',
        'numero_factura'
      ];
      
      if (!camposPermitidos.includes(campo)) {
        throw new Error(`El campo ${campo} no está permitido para actualización`);
      }
      
      const [result] = await pool.query(
        `UPDATE factura_ventas SET ${campo} = ?, modified = NOW() WHERE id = ?`,
        [valor, id]
      );
      
      return result.affectedRows > 0;
    }
    
    // Nuevo formato: objeto con múltiples campos
    const camposPermitidos = [
      'persona_tercero_id',
      'observaciones',
      'estado',
      'fecha_pago',
      'fecha_vto_pago',
      'numero_factura',
      'porcentaje_iibb',
      'neto_iibb',
      'total_iva_10',
      'total_iva_21',
      'total_iva_27',
      'cae',
      'fecha_vto_cae',
      'punto_venta',
      'periodo_desde',
      'periodo_hasta',
      'condicion_venta',
      'tipo_actividad_afip',
      'tipo_actividad_iibb',
      'cancelado',
      'total',
      'fecha_cobro'
    ];
    
    // Construir SET clause dinámicamente
    const setClauses = [];
    const values = [];
    
    for (const [campo, valor] of Object.entries(updateData)) {
      if (camposPermitidos.includes(campo) && valor !== undefined) {
        setClauses.push(`${campo} = ?`);
        values.push(valor);
      }
    }
    
    if (setClauses.length === 0) {
      return false;
    }
    
    values.push(id);
    
    const query = `UPDATE factura_ventas SET ${setClauses.join(', ')}, modified = NOW() WHERE id = ?`;
    
    const [result] = await pool.query(query, values);
    
    return result.affectedRows > 0;
  }

  /**
   * Busca facturas con filtros avanzados
   * @param {Object} filters - Filtros de búsqueda avanzados
   * @param {number} page - Número de página
   * @param {number} limit - Cantidad de registros por página
   * @param {string} sortBy - Campo de ordenamiento
   * @param {string} sortOrder - Dirección del ordenamiento (ASC/DESC)
   * @returns {Promise<Object>} - Resultado con datos y paginación
   */
  static async searchFacturas(filters = {}, page = 1, limit = 20, sortBy = 'fecha_emision', sortOrder = 'DESC') {
    const offset = (page - 1) * limit;
    const params = [];
    let whereClause = 'WHERE fv.activo = 1';
    
    // Filtro por número de factura
    if (filters.numero_factura) {
      whereClause += ' AND fv.numero_factura LIKE ?';
      params.push(`%${filters.numero_factura}%`);
    }
    
    // Filtro por cliente (ID o nombre)
    if (filters.cliente_id) {
      whereClause += ' AND fv.persona_tercero_id = ?';
      params.push(filters.cliente_id);
    }
    
    if (filters.cliente_nombre) {
      whereClause += ' AND (pt.nombre LIKE ? OR pt.apellido LIKE ?)';
      params.push(`%${filters.cliente_nombre}%`, `%${filters.cliente_nombre}%`);
    }
    
    // Filtro por estado
    if (filters.estado && filters.estado !== '') {
      whereClause += ' AND fv.estado = ?';
      params.push(parseInt(filters.estado));
    }
    
    // Filtro por rango de fechas
    if (filters.fecha_desde) {
      whereClause += ' AND fv.fecha_emision >= ?';
      params.push(filters.fecha_desde);
    }
    
    if (filters.fecha_hasta) {
      whereClause += ' AND fv.fecha_emision <= ?';
      params.push(filters.fecha_hasta);
    }
    
    // Filtro por rango de montos
    if (filters.monto_desde) {
      whereClause += ' AND fv.total >= ?';
      params.push(parseFloat(filters.monto_desde));
    }
    
    if (filters.monto_hasta) {
      whereClause += ' AND fv.total <= ?';
      params.push(parseFloat(filters.monto_hasta));
    }
    
    // Filtro por tipo de factura
    if (filters.tipo_factura) {
      whereClause += ' AND fv.tipo_factura = ?';
      params.push(filters.tipo_factura);
    }
    
    // Filtro por punto de venta
    if (filters.punto_venta) {
      whereClause += ' AND fv.punto_venta = ?';
      params.push(parseInt(filters.punto_venta));
    }
    
    // Búsqueda por texto libre (en observaciones)
    if (filters.texto_libre) {
      whereClause += ' AND (fv.observaciones LIKE ? OR pt.nombre LIKE ? OR pt.apellido LIKE ?)';
      const textoBusqueda = `%${filters.texto_libre}%`;
      params.push(textoBusqueda, textoBusqueda, textoBusqueda);
    }
    
    // Validar y sanitizar columna de ordenamiento
    const validSortColumns = ['fecha_emision', 'numero_factura', 'total', 'estado', 'cliente_nombre'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'fecha_emision';
    const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    // Construir el ORDER BY correctamente
    let orderByClause = 'fv.fecha_emision DESC';
    if (sortColumn === 'cliente_nombre') {
      orderByClause = `CASE WHEN pt.apellido IS NOT NULL AND pt.apellido != '' THEN CONCAT(pt.apellido, ', ', COALESCE(pt.nombre, '')) ELSE COALESCE(pt.nombre, pt.apellido, 'Sin nombre') END ${sortDirection}`;
    } else if (sortColumn === 'estado') {
      orderByClause = `fv.estado ${sortDirection}`;
    } else {
      orderByClause = `fv.${sortColumn} ${sortDirection}`;
    }
    
    const queryParams = [...params, limit, offset];
    
    const [rows] = await pool.query(`
      SELECT 
        fv.id,
        fv.numero_factura,
        fv.fecha_emision,
        fv.total,
        fv.cancelado,
        fv.estado,
        fv.tipo_factura,
        fv.punto_venta,
        fv.cae,
        fv.fecha_vto_cae,
        fv.fecha_vto_pago,
        fv.fecha_cobro,
        fv.observaciones,
        fv.enlace_factura,
        fv.created,
        fv.modified,
        -- Información del cliente
        pt.id as cliente_id,
        CASE 
          WHEN pt.apellido IS NOT NULL AND pt.apellido != '' THEN CONCAT(pt.apellido, ', ', COALESCE(pt.nombre, ''))
          ELSE COALESCE(pt.nombre, pt.apellido, 'Sin nombre')
        END as cliente_nombre,
        pt.codigo as cliente_codigo,
        pt.tipo_persona,
        -- Estado de la factura en texto
        CASE fv.estado
          WHEN 1 THEN 'Pendiente'
          WHEN 2 THEN 'Pagada Parcial'
          WHEN 3 THEN 'Pagada'
          WHEN 4 THEN 'En Proceso'
          WHEN 5 THEN 'Anulada'
          ELSE 'Desconocido'
        END as estado_nombre,
        -- Tipo de factura en texto
        CASE fv.tipo_factura
          WHEN 'A' THEN 'Factura A'
          WHEN 'B' THEN 'Factura B'
          WHEN 'C' THEN 'Factura C'
          WHEN 'M' THEN 'Factura M'
          ELSE CONCAT('Tipo ', fv.tipo_factura)
        END as tipo_factura_nombre,
        -- Saldo pendiente
        (fv.total - COALESCE(fv.cancelado, 0)) as saldo_pendiente
      FROM factura_ventas fv
      INNER JOIN persona_terceros pt ON fv.persona_tercero_id = pt.id
      ${whereClause}
      ORDER BY ${orderByClause}
      LIMIT ? OFFSET ?
    `, queryParams);
    
    // Contar total de resultados para paginación
    const [count] = await pool.query(`
      SELECT COUNT(*) as total 
      FROM factura_ventas fv
      INNER JOIN persona_terceros pt ON fv.persona_tercero_id = pt.id
      ${whereClause}
    `, params);
    
    return {
      data: rows,
      pagination: {
        total: count[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count[0].total / limit)
      }
    };
  }

  /**
   * Exporta facturas a formato Excel
   * @param {Object} filters - Filtros de búsqueda
   * @returns {Promise<Buffer>} - Buffer con el archivo Excel
   */
  static async exportToExcel(filters = {}) {
    const { data: facturas } = await this.searchFacturas(filters, 1, 10000);
    
    // Formatear datos para Excel
    const data = facturas.map(factura => ({
      'N° Factura': factura.numero_factura,
      'Fecha': factura.fecha_emision ? new Date(factura.fecha_emision).toLocaleDateString('es-AR') : '',
      'Cliente': factura.cliente_nombre,
      'Total': factura.total,
      'Estado': this.getEstadoNombre(factura.estado)
    }));
    
    return data;
  }
  
  /**
   * Obtiene estadísticas de facturas para dashboard
   */
  static async getFacturasEstadisticas() {
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total_facturas,
        COUNT(CASE WHEN estado = 1 THEN 1 END) as pendientes,
        COUNT(CASE WHEN estado = 2 THEN 1 END) as pagadas_parcial,
        COUNT(CASE WHEN estado = 3 THEN 1 END) as pagadas,
        COUNT(CASE WHEN estado = 4 THEN 1 END) as en_proceso,
        COUNT(CASE WHEN estado = 5 THEN 1 END) as anuladas,
        COALESCE(SUM(total), 0) as valor_total,
        COALESCE(SUM(cancelado), 0) as valor_cobrado,
        COALESCE(SUM(total - COALESCE(cancelado, 0)), 0) as saldo_pendiente,
        COALESCE(AVG(total), 0) as ticket_promedio
      FROM factura_ventas 
      WHERE activo = 1
    `);
    
    return stats[0];
  }
  
  /**
   * Obtiene las últimas facturas emitidas
   */
  static async getUltimasFacturas(limit = 10) {
    const [rows] = await pool.query(`
      SELECT 
        fv.id,
        fv.numero_factura,
        fv.fecha_emision,
        fv.total,
        fv.estado,
        CASE 
          WHEN pt.apellido IS NOT NULL AND pt.apellido != '' THEN CONCAT(pt.apellido, ', ', COALESCE(pt.nombre, ''))
          ELSE COALESCE(pt.nombre, pt.apellido, 'Sin nombre')
        END as cliente_nombre,
        CASE fv.estado
          WHEN 1 THEN 'Pendiente'
          WHEN 2 THEN 'Pagada Parcial'
          WHEN 3 THEN 'Pagada'
          WHEN 4 THEN 'En Proceso'
          WHEN 5 THEN 'Anulada'
          ELSE 'Desconocido'
        END as estado_nombre
      FROM factura_ventas fv
      INNER JOIN persona_terceros pt ON fv.persona_tercero_id = pt.id
      WHERE fv.activo = 1
      ORDER BY fv.fecha_emision DESC, fv.created DESC
      LIMIT ?
    `, [limit]);
    
    return rows;
  }
  
  /**
   * Obtiene facturas vencidas sin cobrar
   */
  static async getFacturasVencidas() {
    const [rows] = await pool.query(`
      SELECT 
        fv.id,
        fv.numero_factura,
        fv.fecha_emision,
        fv.fecha_vto_pago,
        fv.total,
        (fv.total - COALESCE(fv.cancelado, 0)) as saldo_pendiente,
        DATEDIFF(CURDATE(), fv.fecha_vto_pago) as dias_vencidos,
        CASE 
          WHEN pt.apellido IS NOT NULL AND pt.apellido != '' THEN CONCAT(pt.apellido, ', ', COALESCE(pt.nombre, ''))
          ELSE COALESCE(pt.nombre, pt.apellido, 'Sin nombre')
        END as cliente_nombre,
        pt.id as cliente_id
      FROM factura_ventas fv
      INNER JOIN persona_terceros pt ON fv.persona_tercero_id = pt.id
      WHERE fv.activo = 1 
        AND fv.estado IN (1, 2, 4) -- Pendiente, Pagada Parcial, En Proceso
        AND fv.fecha_vto_pago IS NOT NULL
        AND fv.fecha_vto_pago < CURDATE()
        AND (fv.total - COALESCE(fv.cancelado, 0)) > 0
      ORDER BY fv.fecha_vto_pago ASC
    `);
    
    return rows;
  }
  
  /**
   * Actualiza el estado de una factura
   */
  static async updateEstadoFactura(id, nuevoEstado, montoCapitalizado = null, fechaCobro = null) {
    const params = [nuevoEstado, id];
    let setClause = 'estado = ?, modified = NOW()';
    
    if (montoCapitalizado !== null) {
      setClause += ', cancelado = ?';
      params.splice(1, 0, montoCapitalizado);
    }
    
    if (fechaCobro) {
      setClause += ', fecha_cobro = ?';
      params.splice(-1, 0, fechaCobro);
    }
    
    const [result] = await pool.query(`
      UPDATE factura_ventas 
      SET ${setClause}
      WHERE id = ? AND activo = 1
    `, params);
    
    return result.affectedRows > 0;
  }
  
  /**
   * Obtiene resumen financiero por rango de fechas
   */
  static async getResumenFinanciero(fechaDesde, fechaHasta) {
    const [rows] = await pool.query(`
      SELECT 
        COUNT(*) as total_facturas,
        COALESCE(SUM(total), 0) as monto_total,
        COALESCE(SUM(cancelado), 0) as monto_cobrado,
        COALESCE(SUM(total - COALESCE(cancelado, 0)), 0) as saldo_pendiente,
        COUNT(CASE WHEN estado = 3 THEN 1 END) as facturas_pagadas,
        COUNT(CASE WHEN estado IN (1,2,4) THEN 1 END) as facturas_pendientes,
        COALESCE(AVG(total), 0) as ticket_promedio
      FROM factura_ventas
      WHERE activo = 1 
        AND fecha_emision >= ? 
        AND fecha_emision <= ?
    `, [fechaDesde, fechaHasta]);
    
    return rows[0];
  }

  /**
   * Obtiene estadísticas generales de facturas (alias para dashboard)
   */
  static async getEstadisticas() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_facturas,
          COUNT(CASE WHEN estado = 1 THEN 1 END) as facturas_pendientes,
          COUNT(CASE WHEN estado = 2 THEN 1 END) as facturas_pagadas_parcial,
          COUNT(CASE WHEN estado = 3 THEN 1 END) as facturas_pagadas,
          COUNT(CASE WHEN estado = 4 THEN 1 END) as facturas_en_proceso,
          COUNT(CASE WHEN estado = 5 THEN 1 END) as facturas_anuladas,
          COALESCE(SUM(total), 0) as valor_total_facturas,
          COALESCE(SUM(cancelado), 0) as valor_cobrado,
          COALESCE(SUM(total - COALESCE(cancelado, 0)), 0) as valor_pendiente,
          COALESCE(AVG(total), 0) as valor_promedio,
          COUNT(CASE WHEN fecha_emision >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as facturas_ultimo_mes
        FROM factura_ventas 
        WHERE activo = 1
      `;
      
      const [rows] = await pool.query(query);
      return rows[0];
      
    } catch (error) {
      console.error('Error al obtener estadísticas de facturas:', error);
      return {
        total_facturas: 0,
        facturas_pendientes: 0,
        facturas_pagadas_parcial: 0,
        facturas_pagadas: 0,
        facturas_en_proceso: 0,
        facturas_anuladas: 0,
        valor_total_facturas: 0,
        valor_cobrado: 0,
        valor_pendiente: 0,
        valor_promedio: 0,
        facturas_ultimo_mes: 0
      };
    }
  }

  /**
   * Obtiene facturas recientes para el dashboard
   */
  static async getFacturasRecientes(limit = 10) {
    try {
      const query = `
        SELECT 
          fv.id,
          fv.numero_factura,
          fv.fecha_emision,
          fv.total,
          fv.estado,
          CASE 
            WHEN pt.apellido IS NOT NULL AND pt.apellido != '' THEN CONCAT(pt.apellido, ', ', COALESCE(pt.nombre, ''))
            ELSE COALESCE(pt.nombre, pt.apellido, 'Sin nombre')
          END as cliente_nombre,
          CASE fv.estado
            WHEN 1 THEN 'Pendiente'
            WHEN 2 THEN 'Pagada Parcial'
            WHEN 3 THEN 'Pagada'
            WHEN 4 THEN 'En Proceso'
            WHEN 5 THEN 'Anulada'
            ELSE 'Desconocido'
          END as estado_nombre
        FROM factura_ventas fv
        INNER JOIN persona_terceros pt ON fv.persona_tercero_id = pt.id
        WHERE fv.activo = 1
        ORDER BY fv.created DESC
        LIMIT ${limit}
      `;
      
      const [facturas] = await pool.query(query);
      return facturas;
      
    } catch (error) {
      console.error('Error al obtener facturas recientes:', error);
      return [];
    }
  }

  /**
   * Obtiene el nombre del estado de la factura
   * @param {number} estado - Código de estado
   * @returns {string} - Nombre del estado
   */
  static getEstadoNombre(estado) {
    const estados = {
      1: 'Pendiente',
      2: 'Pagada Parcial',
      3: 'Pagada',
      4: 'En Proceso',
      5: 'Anulada'
    };
    
    return estados[estado] || 'Desconocido';
  }

  // ===== MÉTODOS PARA FACTURAS RECIBIDAS (COMPRAS) =====

  /**
   * Obtiene todas las facturas recibidas con paginación
   * @param {number} page - Número de página (comienza en 1)
   * @param {number} limit - Cantidad de registros por página
   * @returns {Promise<Object>} - Lista de facturas recibidas
   */
  static async getFacturasRecibidas(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    
    try {
      const [rows] = await pool.query(`
        SELECT 
          fc.id,
          fc.numero_operacion,
          fc.tipo_factura,
          fc.numero_factura,
          fc.fecha_compra,
          fc.fecha_pago,
          fc.mes_anio_imputacion,
          fc.conceptos_no_gravados,
          fc.operaciones_excentas,
          fc.impuestos_internos,
          fc.total,
          fc.cancelado,
          fc.estado,
          fc.observaciones,
          fc.created,
          fc.modified,
          -- Información del proveedor
          CASE 
            WHEN pt.apellido IS NOT NULL AND pt.apellido != '' THEN CONCAT(pt.apellido, ', ', COALESCE(pt.nombre, ''))
            ELSE COALESCE(pt.nombre, pt.apellido, 'Sin nombre')
          END as proveedor_nombre,
          pt.id as proveedor_id,
          pt.codigo as proveedor_codigo,
          -- Estado descriptivo
          CASE fc.estado
            WHEN 1 THEN 'Pendiente'
            WHEN 2 THEN 'Parcialmente Pagada'
            WHEN 3 THEN 'Pagada'
            WHEN 4 THEN 'Anulada'
            ELSE 'Desconocido'
          END as estado_nombre,
          -- Saldo pendiente
          (fc.total - COALESCE(fc.cancelado, 0)) as saldo_pendiente
        FROM factura_compras fc
        INNER JOIN persona_terceros pt ON fc.persona_tercero_id = pt.id
        WHERE fc.activo = 1
        ORDER BY fc.fecha_compra DESC, fc.created DESC
        LIMIT ? OFFSET ?
      `, [limit, offset]);
      
      const [count] = await pool.query(
        'SELECT COUNT(*) as total FROM factura_compras WHERE activo = 1'
      );
      
      return {
        data: rows,
        pagination: {
          total: count[0].total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count[0].total / limit)
        }
      };
      
    } catch (error) {
      console.error('Error al obtener facturas recibidas:', error);
      throw error;
    }
  }

  /**
   * Busca facturas recibidas con filtros
   * @param {Object} filters - Filtros de búsqueda
   * @param {number} page - Número de página
   * @param {number} limit - Cantidad de registros por página
   * @param {string} sortBy - Campo de ordenamiento
   * @param {string} sortOrder - Dirección del ordenamiento (ASC/DESC)
   * @returns {Promise<Object>} - Resultado con datos y paginación
   */
  static async searchFacturasRecibidas(filters = {}, page = 1, limit = 20, sortBy = 'fecha_compra', sortOrder = 'DESC') {
    const offset = (page - 1) * limit;
    const params = [];
    let whereClause = 'WHERE fc.activo = 1';
    
    try {
      // Filtro por número de factura
      if (filters.numero_factura) {
        whereClause += ' AND fc.numero_factura LIKE ?';
        params.push(`%${filters.numero_factura}%`);
      }
      
      // Filtro por proveedor (ID o nombre)
      if (filters.proveedor_id) {
        whereClause += ' AND fc.persona_tercero_id = ?';
        params.push(filters.proveedor_id);
      }
      
      if (filters.proveedor || filters.proveedor_nombre) {
        const nombreBusqueda = filters.proveedor || filters.proveedor_nombre;
        whereClause += ' AND (pt.nombre LIKE ? OR pt.apellido LIKE ?)';
        params.push(`%${nombreBusqueda}%`, `%${nombreBusqueda}%`);
      }
      
      // Filtro por estado
      if (filters.estado && filters.estado !== '') {
        whereClause += ' AND fc.estado = ?';
        params.push(parseInt(filters.estado));
      }
      
      // Filtro por rango de fechas (usando fecha_compra)
      if (filters.fecha_desde) {
        whereClause += ' AND fc.fecha_compra >= ?';
        params.push(filters.fecha_desde);
      }
      
      if (filters.fecha_hasta) {
        whereClause += ' AND fc.fecha_compra <= ?';
        params.push(filters.fecha_hasta);
      }
      
      // Filtro por rango de montos
      if (filters.monto_desde) {
        whereClause += ' AND fc.total >= ?';
        params.push(parseFloat(filters.monto_desde));
      }
      
      if (filters.monto_hasta) {
        whereClause += ' AND fc.total <= ?';
        params.push(parseFloat(filters.monto_hasta));
      }
      
      // Validar y sanitizar columna de ordenamiento
      const validSortColumns = ['fecha_compra', 'fecha_pago', 'numero_factura', 'total', 'estado', 'proveedor_nombre'];
      const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'fecha_compra';
      const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      
      // Construir el ORDER BY correctamente
      let orderByClause = 'fc.fecha_compra DESC';
      if (sortColumn === 'proveedor_nombre') {
        orderByClause = `CASE WHEN pt.apellido IS NOT NULL AND pt.apellido != '' THEN CONCAT(pt.apellido, ', ', COALESCE(pt.nombre, '')) ELSE COALESCE(pt.nombre, pt.apellido, 'Sin nombre') END ${sortDirection}`;
      } else if (sortColumn === 'estado') {
        orderByClause = `fc.estado ${sortDirection}`;
      } else {
        orderByClause = `fc.${sortColumn} ${sortDirection}`;
      }
      
      const queryParams = [...params, limit, offset];
      
      const [rows] = await pool.query(`
        SELECT 
          fc.id,
          fc.numero_operacion,
          fc.tipo_factura,
          fc.numero_factura,
          fc.fecha_compra,
          fc.fecha_pago,
          fc.mes_anio_imputacion,
          fc.conceptos_no_gravados,
          fc.operaciones_excentas,
          fc.impuestos_internos,
          fc.total,
          fc.cancelado,
          fc.estado,
          fc.observaciones,
          fc.created,
          fc.modified,
          -- Información del proveedor
          pt.id as proveedor_id,
          CASE 
            WHEN pt.apellido IS NOT NULL AND pt.apellido != '' THEN CONCAT(pt.apellido, ', ', COALESCE(pt.nombre, ''))
            ELSE COALESCE(pt.nombre, pt.apellido, 'Sin nombre')
          END as proveedor_nombre,
          pt.codigo as proveedor_codigo,
          pt.tipo_persona,
          -- Estado de la factura en texto
          CASE fc.estado
            WHEN 1 THEN 'Pendiente'
            WHEN 2 THEN 'Parcialmente Pagada'
            WHEN 3 THEN 'Pagada'
            WHEN 4 THEN 'Anulada'
            ELSE 'Desconocido'
          END as estado_nombre,
          -- Saldo pendiente
          (fc.total - COALESCE(fc.cancelado, 0)) as saldo_pendiente
        FROM factura_compras fc
        INNER JOIN persona_terceros pt ON fc.persona_tercero_id = pt.id
        ${whereClause}
        ORDER BY ${orderByClause}
        LIMIT ? OFFSET ?
      `, queryParams);
      
      // Contar total de resultados para paginación
      const [count] = await pool.query(`
        SELECT COUNT(*) as total 
        FROM factura_compras fc
        INNER JOIN persona_terceros pt ON fc.persona_tercero_id = pt.id
        ${whereClause}
      `, params);
      
      return {
        data: rows,
        pagination: {
          total: count[0].total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count[0].total / limit)
        }
      };
      
    } catch (error) {
      console.error('Error al buscar facturas recibidas:', error);
      throw error;
    }
  }

  /**
   * Obtiene una factura recibida por su ID
   * @param {string} id - ID de la factura recibida
   * @returns {Promise<Object>} - Datos de la factura recibida
   */
  static async getFacturaRecibidaById(id) {
    try {
      const [rows] = await pool.query(`
        SELECT 
          fc.*,
          -- Información del proveedor
          CASE 
            WHEN pt.apellido IS NOT NULL AND pt.apellido != '' THEN CONCAT(pt.apellido, ', ', COALESCE(pt.nombre, ''))
            ELSE COALESCE(pt.nombre, pt.apellido, 'Sin nombre')
          END as proveedor_nombre,
          pt.codigo as proveedor_codigo,
          pt.condicion_iva as proveedor_condicion_iva,
          pt.tipo as proveedor_tipo,
          pt.tipo_persona as proveedor_tipo_persona,
          -- Estado descriptivo
          CASE fc.estado
            WHEN 1 THEN 'Pendiente'
            WHEN 2 THEN 'Parcialmente Pagada'
            WHEN 3 THEN 'Pagada'
            WHEN 4 THEN 'Anulada'
            ELSE 'Desconocido'
          END as estado_nombre,
          -- Saldo pendiente
          (fc.total - COALESCE(fc.cancelado, 0)) as saldo_pendiente
        FROM factura_compras fc
        LEFT JOIN persona_terceros pt ON fc.persona_tercero_id = pt.id
        WHERE fc.id = ? AND fc.activo = 1
      `, [id]);
      
      if (rows.length === 0) {
        return null;
      }
      
      const factura = rows[0];
      
      // Obtener los detalles de la factura recibida si existe la tabla
      let detalles = [];
      try {
        const [detallesRows] = await pool.query(`
          SELECT * FROM factura_compra_detalles 
          WHERE factura_compra_id = ?
        `, [id]);
        detalles = detallesRows || [];
      } catch (detalleError) {
        console.warn('Advertencia: No se pudieron cargar los detalles de la factura recibida:', detalleError.message);
      }
      
      factura.detalles = detalles;
      
      return factura;
      
    } catch (error) {
      console.error('Error al obtener factura recibida por ID:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de facturas recibidas
   */
  static async getFacturasRecibidasEstadisticas() {
    try {
      const [stats] = await pool.query(`
        SELECT 
          COUNT(*) as total_facturas,
          COUNT(CASE WHEN estado = 1 THEN 1 END) as pendientes,
          COUNT(CASE WHEN estado = 2 THEN 1 END) as parcialmente_pagadas,
          COUNT(CASE WHEN estado = 3 THEN 1 END) as pagadas,
          COUNT(CASE WHEN estado = 4 THEN 1 END) as anuladas,
          COALESCE(SUM(total), 0) as valor_total,
          COALESCE(SUM(cancelado), 0) as valor_pagado,
          COALESCE(SUM(total - COALESCE(cancelado, 0)), 0) as saldo_pendiente,
          COALESCE(AVG(total), 0) as promedio
        FROM factura_compras 
        WHERE activo = 1
      `);
      
      return stats[0];
      
    } catch (error) {
      console.error('Error al obtener estadísticas de facturas recibidas:', error);
      return {
        total_facturas: 0,
        pendientes: 0,
        parcialmente_pagadas: 0,
        pagadas: 0,
        anuladas: 0,
        valor_total: 0,
        valor_pagado: 0,
        saldo_pendiente: 0,
        promedio: 0
      };
    }
  }
}

module.exports = FacturaModel;
