const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class ProspectoModel {
  
  /**
   * Obtener lista de prospectos con paginación y filtros
   */
  static async getProspectos(page = 1, limit = 20, filters = {}, sortBy = 'created', sortOrder = 'DESC') {
    try {
      const offset = (page - 1) * limit;
      
      // Construir condiciones WHERE
      let whereConditions = ['p.activo = 1'];
      const params = [];
      
      if (filters.search && filters.search.trim()) {
        const searchTerm = `%${filters.search.trim()}%`;
        whereConditions.push('(p.nombre LIKE ? OR p.apellido LIKE ? OR p.empresa LIKE ? OR p.email LIKE ?)');
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }
      
      if (filters.estado !== undefined && filters.estado !== '') {
        whereConditions.push('p.estado = ?');
        params.push(parseInt(filters.estado));
      }
      
      if (filters.origen && filters.origen.trim()) {
        whereConditions.push('p.origen LIKE ?');
        params.push(`%${filters.origen.trim()}%`);
      }
      
      if (filters.fecha_desde) {
        whereConditions.push('DATE(p.fecha_contacto) >= ?');
        params.push(filters.fecha_desde);
      }
      
      if (filters.fecha_hasta) {
        whereConditions.push('DATE(p.fecha_contacto) <= ?');
        params.push(filters.fecha_hasta);
      }
      
      const whereClause = 'WHERE ' + whereConditions.join(' AND ');
      
      // Construir ORDER BY
      const validSortFields = ['nombre', 'apellido', 'empresa', 'estado', 'fecha_contacto', 'valor_estimado', 'created'];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'created';
      const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      const orderClause = `ORDER BY p.${sortField} ${sortDirection}`;
      
      // Consulta principal
      const query = `
        SELECT 
          p.id,
          p.nombre,
          p.apellido,
          CASE 
            WHEN p.apellido IS NOT NULL AND p.apellido != '' THEN CONCAT(p.apellido, ', ', p.nombre)
            ELSE p.nombre
          END as nombre_completo,
          p.empresa,
          p.telefono,
          p.email,
          p.estado,
          p.origen,
          p.fecha_contacto,
          p.valor_estimado,
          p.probabilidad,
          p.fecha_seguimiento,
          p.observaciones,
          p.convertido_cliente_id,
          p.fecha_conversion,
          p.created,
          p.modified,
          -- Información del cliente convertido si existe
          CASE 
            WHEN pt.apellido IS NOT NULL AND pt.apellido != '' THEN CONCAT(pt.apellido, ', ', pt.nombre)
            ELSE pt.nombre
          END as cliente_nombre
        FROM prospectos p
        LEFT JOIN persona_terceros pt ON p.convertido_cliente_id = pt.id
        ${whereClause}
        ${orderClause}
        LIMIT ? OFFSET ?
      `;
      
      const [rows] = await pool.query(query, [...params, limit, offset]);
      
      // Consulta para contar total
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM prospectos p
        ${whereClause}
      `;
      
      const [countResult] = await pool.query(countQuery, params);
      
      return {
        data: rows,
        pagination: {
          total: countResult[0].total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(countResult[0].total / limit)
        }
      };
      
    } catch (error) {
      console.error('Error al obtener prospectos:', error);
      throw error;
    }
  }

  /**
   * Obtener prospecto por ID
   */
  static async getProspectoById(id) {
    try {
      const query = `
        SELECT 
          p.*,
          -- Información del cliente convertido si existe
          pt.nombre as cliente_nombre,
          pt.apellido as cliente_apellido,
          pt.codigo as cliente_codigo
        FROM prospectos p
        LEFT JOIN persona_terceros pt ON p.convertido_cliente_id = pt.id
        WHERE p.id = ? AND p.activo = 1
      `;
      
      const [rows] = await pool.query(query, [id]);
      return rows[0] || null;
      
    } catch (error) {
      console.error('Error al obtener prospecto:', error);
      throw error;
    }
  }

  /**
   * Crear nuevo prospecto
   */
  static async createProspecto(data) {
    try {
      const id = uuidv4();
      const now = new Date();
      
      const query = `
        INSERT INTO prospectos (
          id, nombre, apellido, empresa, telefono, email, estado, origen,
          fecha_contacto, observaciones, valor_estimado, probabilidad,
          fecha_seguimiento, activo, created, modified
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `;
      
      const values = [
        id,
        data.nombre || '',
        data.apellido || null,
        data.empresa || null,
        data.telefono || null,
        data.email || null,
        parseInt(data.estado) || 0,
        data.origen || null,
        data.fecha_contacto || null,
        data.observaciones || null,
        parseFloat(data.valor_estimado) || null,
        parseInt(data.probabilidad) || null,
        data.fecha_seguimiento || null,
        now,
        now
      ];
      
      await pool.query(query, values);
      return id;
      
    } catch (error) {
      console.error('Error al crear prospecto:', error);
      throw error;
    }
  }

  /**
   * Actualizar prospecto
   */
  static async updateProspecto(id, data) {
    try {
      const query = `
        UPDATE prospectos SET
          nombre = ?,
          apellido = ?,
          empresa = ?,
          telefono = ?,
          email = ?,
          estado = ?,
          origen = ?,
          fecha_contacto = ?,
          observaciones = ?,
          valor_estimado = ?,
          probabilidad = ?,
          fecha_seguimiento = ?,
          modified = ?
        WHERE id = ? AND activo = 1
      `;
      
      const values = [
        data.nombre || '',
        data.apellido || null,
        data.empresa || null,
        data.telefono || null,
        data.email || null,
        parseInt(data.estado) || 0,
        data.origen || null,
        data.fecha_contacto || null,
        data.observaciones || null,
        parseFloat(data.valor_estimado) || null,
        parseInt(data.probabilidad) || null,
        data.fecha_seguimiento || null,
        new Date(),
        id
      ];
      
      const [result] = await pool.query(query, values);
      return result.affectedRows > 0;
      
    } catch (error) {
      console.error('Error al actualizar prospecto:', error);
      throw error;
    }
  }

  /**
   * Eliminar prospecto (soft delete)
   */
  static async deleteProspecto(id) {
    try {
      const query = `
        UPDATE prospectos SET
          activo = 0,
          modified = ?
        WHERE id = ?
      `;
      
      const [result] = await pool.query(query, [new Date(), id]);
      return result.affectedRows > 0;
      
    } catch (error) {
      console.error('Error al eliminar prospecto:', error);
      throw error;
    }
  }

  /**
   * Convertir prospecto a cliente
   */
  static async convertirACliente(prospectoId, clienteData) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Obtener datos del prospecto
      const [prospecto] = await connection.query(
        'SELECT * FROM prospectos WHERE id = ? AND activo = 1',
        [prospectoId]
      );
      
      if (!prospecto.length) {
        throw new Error('Prospecto no encontrado');
      }
      
      const prospectoData = prospecto[0];
      
      // Crear nuevo cliente en persona_terceros
      const clienteId = uuidv4();
      const now = new Date();
      
      const insertClienteQuery = `
        INSERT INTO persona_terceros (
          id, nombre, apellido, codigo, tipo, tipo_persona,
          condicion_iva, activo, created, modified
        ) VALUES (?, ?, ?, ?, '1', ?, ?, 1, ?, ?)
      `;
      
      await connection.query(insertClienteQuery, [
        clienteId,
        clienteData.nombre || prospectoData.nombre,
        clienteData.apellido || prospectoData.apellido,
        clienteData.codigo || `CLI-${Date.now()}`,
        clienteData.tipo_persona || 'fisica',
        parseInt(clienteData.condicion_iva) || 1,
        now,
        now
      ]);
      
      // Si hay datos adicionales, crear registro en personas
      if (prospectoData.email || prospectoData.telefono) {
        const insertPersonaQuery = `
          INSERT INTO personas (id, email, telefono, activo, created, modified)
          VALUES (?, ?, ?, 1, ?, ?)
        `;
        
        await connection.query(insertPersonaQuery, [
          clienteId,
          prospectoData.email,
          prospectoData.telefono,
          now,
          now
        ]);
      }
      
      // Actualizar prospecto marcando la conversión
      const updateProspectoQuery = `
        UPDATE prospectos SET
          convertido_cliente_id = ?,
          fecha_conversion = ?,
          estado = 2,
          modified = ?
        WHERE id = ?
      `;
      
      await connection.query(updateProspectoQuery, [
        clienteId,
        now,
        now,
        prospectoId
      ]);
      
      await connection.commit();
      
      return {
        clienteId: clienteId,
        prospectoId: prospectoId
      };
      
    } catch (error) {
      await connection.rollback();
      console.error('Error al convertir prospecto a cliente:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Obtener estadísticas de prospectos
   */
  static async getEstadisticas() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN estado = 0 THEN 1 END) as nuevos,
          COUNT(CASE WHEN estado = 1 THEN 1 END) as contactados,
          COUNT(CASE WHEN estado = 2 THEN 1 END) as calificados,
          COUNT(CASE WHEN estado = 3 THEN 1 END) as propuesta,
          COUNT(CASE WHEN estado = 4 THEN 1 END) as no_interesados,
          COUNT(CASE WHEN convertido_cliente_id IS NOT NULL THEN 1 END) as convertidos,
          AVG(CASE WHEN valor_estimado > 0 THEN valor_estimado END) as valor_promedio,
          SUM(CASE WHEN estado IN (0,1,2,3) THEN valor_estimado ELSE 0 END) as pipeline_total
        FROM prospectos 
        WHERE activo = 1
      `;
      
      const [result] = await pool.query(query);
      return result[0];
      
    } catch (error) {
      console.error('Error al obtener estadísticas de prospectos:', error);
      throw error;
    }
  }

  /**
   * Buscar prospectos para API
   */
  static async searchProspectos(filters = {}) {
    try {
      const { page = 1, limit = 20, search, estado, origen } = filters;
      return await this.getProspectos(page, limit, { search, estado, origen });
      
    } catch (error) {
      console.error('Error en búsqueda de prospectos:', error);
      throw error;
    }
  }

  /**
   * Actualizar estado de prospecto
   */
  static async updateEstado(id, estado, observaciones = null) {
    try {
      let query = `
        UPDATE prospectos SET
          estado = ?,
          modified = ?
      `;
      let params = [parseInt(estado), new Date()];
      
      if (observaciones) {
        query += ', observaciones = ?';
        params.push(observaciones);
      }
      
      query += ' WHERE id = ? AND activo = 1';
      params.push(id);
      
      const [result] = await pool.query(query, params);
      return result.affectedRows > 0;
      
    } catch (error) {
      console.error('Error al actualizar estado de prospecto:', error);
      throw error;
    }
  }

  /**
   * Obtener prospectos que necesitan seguimiento
   */
  static async getProspectosSeguimiento() {
    try {
      const query = `
        SELECT 
          p.*,
          CASE 
            WHEN p.apellido IS NOT NULL AND p.apellido != '' THEN CONCAT(p.apellido, ', ', p.nombre)
            ELSE p.nombre
          END as nombre_completo
        FROM prospectos p
        WHERE p.activo = 1 
          AND p.estado IN (0, 1, 2, 3)
          AND (
            p.fecha_seguimiento IS NULL 
            OR p.fecha_seguimiento <= NOW()
            OR DATEDIFF(NOW(), p.fecha_contacto) > 7
          )
        ORDER BY 
          CASE 
            WHEN p.fecha_seguimiento IS NOT NULL AND p.fecha_seguimiento <= NOW() THEN 1
            ELSE 2
          END,
          p.fecha_contacto ASC
        LIMIT 50
      `;
      
      const [rows] = await pool.query(query);
      return rows;
      
    } catch (error) {
      console.error('Error al obtener prospectos para seguimiento:', error);
      throw error;
    }
  }
}

module.exports = ProspectoModel;
