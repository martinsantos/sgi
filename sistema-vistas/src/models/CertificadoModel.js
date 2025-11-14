const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * Modelo de Certificados - Gestión completa de certificados de obra
 */
class CertificadoModel {
  
  /**
   * Estados posibles de un certificado
   */
  static ESTADOS = {
    PENDIENTE: 0,
    APROBADO: 1,
    FACTURADO: 2,
    EN_PROCESO: 3,
    ANULADO: 4
  };

  /**
   * Mapeo de estados a nombres legibles
   */
  static ESTADO_NOMBRES = {
    0: 'Pendiente',
    1: 'Aprobado', 
    2: 'Facturado',
    3: 'En Proceso',
    4: 'Anulado'
  };

  /**
   * Obtener lista de certificados con paginación
   */
  static async getCertificados(page = 1, limit = 20, sortBy = 'numero', order = 'desc') {
    const offset = (page - 1) * limit;
    
    try {
      // Mapeo de campos para ordenamiento
      const sortFields = {
        'numero': 'c.numero',
        'fecha': 'c.fecha',
        'importe': 'c.importe',
        'estado': 'c.estado',
        'cliente': 'cliente_nombre'
      };
      
      const sortField = sortFields[sortBy] || 'c.numero';
      const sortOrder = (order === 'asc') ? 'ASC' : 'DESC';
      
      const query = `
        SELECT 
          c.id,
          c.numero,
          c.fecha,
          c.alcance,
          c.cantidad,
          c.precio_unitario,
          c.importe,
          c.estado,
          c.fecha_factura,
          c.observacion as condiciones,
          CASE 
            WHEN c.estado = 0 THEN 'Pendiente'
            WHEN c.estado = 1 THEN 'Aprobado'
            WHEN c.estado = 2 THEN 'Facturado'
            WHEN c.estado = 3 THEN 'En Proceso'
            WHEN c.estado = 4 THEN 'Anulado'
            ELSE 'Desconocido'
          END as estado_nombre,
          p.descripcion as proyecto_nombre,
          p.id as proyecto_id,
          p.id as proyecto_codigo,
          COALESCE(
            CASE 
              WHEN pt.apellido IS NOT NULL AND pt.apellido != '' THEN CONCAT(pt.apellido, ', ', COALESCE(pt.nombre, ''))
              ELSE COALESCE(pt.nombre, pt.apellido, 'Sin cliente')
            END,
            'Sin cliente'
          ) as cliente_nombre,
          pt.id as cliente_id,
          pt.codigo as cliente_codigo,
          c.created,
          c.modified
        FROM certificacions c
        LEFT JOIN proyectos p ON c.proyecto_id = p.id
        LEFT JOIN persona_terceros pt ON p.personal_id = pt.id
        WHERE c.activo = 1
        ORDER BY ${sortField} ${sortOrder}, c.numero DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      
      const [certificados] = await pool.query(query);
      
      // Consulta para contar total
      const [countResult] = await pool.query(
        'SELECT COUNT(*) as total FROM certificacions WHERE activo = 1'
      );
      
      const total = countResult[0]?.total || 0;
      
      console.log(`📊 Query ejecutado: ${certificados.length} certificados, Total en BD: ${total}`);
      
      return {
        certificados,
        total
      };
      
    } catch (error) {
      console.error('Error al obtener certificados:', error);
      throw error;
    }
  }
  
  /**
   * Obtener certificado por ID
   */
  static async getCertificadoById(id) {
    try {
      const query = `
        SELECT 
          c.id,
          c.numero,
          c.fecha,
          c.alcance,
          c.cantidad,
          c.precio_unitario,
          c.importe,
          c.estado,
          c.fecha_factura,
          c.observacion as condiciones,
          c.proyecto_id,
          c.activo,
          c.created,
          c.modified,
          CASE 
            WHEN c.estado = 0 THEN 'Pendiente'
            WHEN c.estado = 1 THEN 'Aprobado'
            WHEN c.estado = 2 THEN 'Facturado'
            WHEN c.estado = 3 THEN 'En Proceso'
            WHEN c.estado = 4 THEN 'Anulado'
            ELSE 'Desconocido'
          END as estado_nombre,
          p.descripcion as proyecto_nombre,
          p.id as proyecto_codigo,
          p.id as proyecto_id_rel,
          p.fecha_inicio as proyecto_fecha_inicio,
          p.precio_venta as proyecto_valor,
          COALESCE(
            CASE 
              WHEN pt.apellido IS NOT NULL AND pt.apellido != '' THEN CONCAT(pt.apellido, ', ', COALESCE(pt.nombre, ''))
              ELSE COALESCE(pt.nombre, pt.apellido, 'Sin cliente')
            END,
            'Sin cliente'
          ) as cliente_nombre,
          pt.id as cliente_id,
          pt.codigo as cliente_codigo
        FROM certificacions c
        LEFT JOIN proyectos p ON c.proyecto_id = p.id
        LEFT JOIN persona_terceros pt ON p.personal_id = pt.id
        WHERE c.id = ? AND c.activo = 1
      `;
      
      const [rows] = await pool.execute(query, [id]);
      
      if (rows.length === 0) {
        return null;
      }
      
      console.log(`📋 Certificado ID ${id}:`, {
        numero: rows[0].numero,
        cliente_nombre: rows[0].cliente_nombre,
        cliente_id: rows[0].cliente_id,
        proyecto_id: rows[0].proyecto_id_rel,
        allKeys: Object.keys(rows[0])
      });
      
      return rows[0];
      
    } catch (error) {
      console.error('Error al obtener certificado por ID:', error);
      throw error;
    }
  }

  /**
   * Obtener certificados recientes
   */
  static async getCertificadosRecientes(limit = 10) {
    try {
      const query = `
        SELECT 
          c.id,
          c.numero,
          c.fecha,
          c.alcance,
          c.importe,
          c.estado,
          c.fecha_factura,
          c.observacion as condiciones,
          CASE 
            WHEN c.estado = 0 THEN 'Pendiente'
            WHEN c.estado = 1 THEN 'Aprobado'
            WHEN c.estado = 2 THEN 'Facturado'
            ELSE 'Desconocido'
          END as estado_nombre,
          p.descripcion as proyecto_nombre,
          p.codigo as proyecto_codigo,
          COALESCE(
            CASE 
              WHEN pt.apellido IS NOT NULL AND pt.apellido != '' THEN CONCAT(pt.apellido, ', ', COALESCE(pt.nombre, ''))
              ELSE COALESCE(pt.nombre, pt.apellido, 'Sin cliente')
            END,
            'Sin cliente'
          ) as cliente_nombre
        FROM certificacions c
        LEFT JOIN proyectos p ON c.proyecto_id = p.id
        LEFT JOIN persona_terceros pt ON p.personal_id = pt.id
        WHERE c.activo = 1
        ORDER BY c.numero DESC
        LIMIT ${limit}
      `;
      
      const [certificados] = await pool.query(query);
      return certificados;
      
    } catch (error) {
      console.error('Error al obtener certificados recientes:', error);
      return [];
    }
  }

  /**
   * Obtener estadísticas de certificados
   */
  static async getEstadisticas() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_certificados,
          SUM(CASE WHEN estado = 0 THEN 1 ELSE 0 END) as certificados_pendientes,
          SUM(CASE WHEN estado = 1 THEN 1 ELSE 0 END) as certificados_aprobados,
          SUM(CASE WHEN estado = 2 THEN 1 ELSE 0 END) as certificados_facturados,
          COALESCE(SUM(importe), 0) as valor_total_certificados,
          COALESCE(SUM(CASE WHEN estado = 2 THEN importe ELSE 0 END), 0) as valor_facturado,
          COALESCE(AVG(importe), 0) as valor_promedio
        FROM certificacions
        WHERE activo = 1
      `;
      
      const [rows] = await pool.execute(query);
      return rows[0];
      
    } catch (error) {
      console.error('Error al obtener estadísticas de certificados:', error);
      return {
        total_certificados: 0,
        certificados_pendientes: 0,
        certificados_aprobados: 0,
        certificados_facturados: 0,
        valor_total_certificados: 0,
        valor_facturado: 0,
        valor_promedio: 0
      };
    }
  }

  /**
   * Obtener certificados por proyecto
   */
  static async getCertificadosByProyecto(proyectoId) {
    try {
      const query = `
        SELECT 
          c.*,
          CASE 
            WHEN c.estado = 0 THEN 'Pendiente'
            WHEN c.estado = 1 THEN 'Aprobado'
            WHEN c.estado = 2 THEN 'Facturado'
            ELSE 'Desconocido'
          END as estado_nombre
        FROM certificacions c
        WHERE c.proyecto_id = ? AND c.activo = 1
        ORDER BY c.numero ASC
      `;
      
      const [certificados] = await pool.execute(query, [proyectoId]);
      return certificados;
      
    } catch (error) {
      console.error('Error al obtener certificados por proyecto:', error);
      return [];
    }
  }

  /**
   * Obtener estadísticas agregadas de certificados por cliente (persona_terceros)
   */
  static async getStatsCliente(clienteId) {
    if (!clienteId) {
      return { totalCertificados: 0, montoTotal: 0 };
    }

    try {
      const query = `
        SELECT 
          COUNT(*) as totalCertificados,
          COALESCE(SUM(c.importe), 0) as montoTotal
        FROM certificacions c
        LEFT JOIN proyectos p ON c.proyecto_id = p.id
        WHERE p.personal_id = ? AND c.activo = 1
      `;

      const [rows] = await pool.query(query, [clienteId]);
      return rows?.[0] || { totalCertificados: 0, montoTotal: 0 };
    } catch (error) {
      console.error('Error al obtener estadísticas de certificados del cliente:', error);
      return { totalCertificados: 0, montoTotal: 0 };
    }
  }

  /**
   * Crear nuevo certificado
   */
  static async createCertificado(certificadoData) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      const id = uuidv4();
      
      // Obtener el próximo número de certificado
      const [maxNumero] = await connection.query(
        'SELECT COALESCE(MAX(numero), 0) + 1 as next_numero FROM certificacions'
      );
      const numeroSecuencial = maxNumero[0].next_numero;
      
      const query = `
        INSERT INTO certificacions (
          id, numero, fecha, alcance, cantidad, precio_unitario, importe,
          estado, observacion, proyecto_id, activo, created, modified
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
      `;
      
      const valores = [
        id,
        certificadoData.numero || numeroSecuencial,
        certificadoData.fecha || new Date(),
        certificadoData.alcance || '',
        certificadoData.cantidad || 1,
        certificadoData.precio_unitario || 0,
        certificadoData.importe || 0,
        certificadoData.estado || 0,
        certificadoData.condiciones || certificadoData.observacion || '',
        certificadoData.proyecto_id
      ];
      
      await connection.execute(query, valores);
      
      console.log('✅ Certificado creado:', id);
      return id;
      
    } catch (error) {
      console.error('❌ Error al crear certificado:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Actualizar estado de certificado
   */
  static async updateEstadoCertificado(id, nuevoEstado, observaciones = null) {
    try {
      const query = `
        UPDATE certificacions 
        SET estado = ?, observacion = COALESCE(?, observacion), modified = NOW()
        WHERE id = ? AND activo = 1
      `;
      
      const [result] = await pool.execute(query, [nuevoEstado, observaciones, id]);
      return result.affectedRows > 0;
      
    } catch (error) {
      console.error('Error al actualizar estado de certificado:', error);
      throw error;
    }
  }

  /**
   * Marcar certificado como facturado
   */
  static async marcarComoFacturado(id, fechaFactura = null) {
    try {
      const query = `
        UPDATE certificacions 
        SET estado = 2, fecha_factura = COALESCE(?, NOW()), modified = NOW()
        WHERE id = ? AND activo = 1
      `;
      
      const [result] = await pool.execute(query, [fechaFactura, id]);
      return result.affectedRows > 0;
      
    } catch (error) {
      console.error('Error al marcar certificado como facturado:', error);
      throw error;
    }
  }

  /**
   * Buscar certificados por criterios
   */
  static async searchCertificados(filters = {}, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const conditions = ['c.activo = 1'];
    const params = [];

    if (filters.numero) {
      conditions.push('c.numero = ?');
      params.push(filters.numero);
    }

    if (filters.alcance) {
      conditions.push('c.alcance LIKE ?');
      params.push(`%${filters.alcance}%`);
    }

    if (filters.estado !== undefined && filters.estado !== null) {
      conditions.push('c.estado = ?');
      params.push(filters.estado);
    }

    if (filters.proyecto_id) {
      conditions.push('c.proyecto_id = ?');
      params.push(filters.proyecto_id);
    }

    if (filters.cliente_id) {
      conditions.push('pt.id = ?');
      params.push(filters.cliente_id);
    }

    if (filters.cliente_nombre) {
      conditions.push('(pt.nombre LIKE ? OR pt.apellido LIKE ? OR CONCAT(pt.apellido, ", ", pt.nombre) LIKE ?)');
      const search = `%${filters.cliente_nombre}%`;
      params.push(search, search, search);
    }

    if (filters.fecha_desde) {
      conditions.push('DATE(c.fecha) >= ?');
      params.push(filters.fecha_desde);
    }

    if (filters.fecha_hasta) {
      conditions.push('DATE(c.fecha) <= ?');
      params.push(filters.fecha_hasta);
    }

    const whereClause = conditions.join(' AND ');

    try {
      const [rows] = await pool.query(`
        SELECT 
          c.id,
          c.numero,
          c.fecha,
          c.alcance,
          c.cantidad,
          c.precio_unitario,
          c.importe,
          c.estado,
          c.fecha_factura,
          c.observacion as condiciones,
          CASE 
            WHEN c.estado = 0 THEN 'Pendiente'
            WHEN c.estado = 1 THEN 'Aprobado'
            WHEN c.estado = 2 THEN 'Facturado'
            WHEN c.estado = 3 THEN 'En Proceso'
            WHEN c.estado = 4 THEN 'Anulado'
            ELSE 'Desconocido'
          END as estado_nombre,
          p.descripcion as proyecto_nombre,
          p.codigo as proyecto_codigo,
          p.id as proyecto_id,
          COALESCE(
            CASE 
              WHEN pt.apellido IS NOT NULL AND pt.apellido != '' THEN CONCAT(pt.apellido, ', ', COALESCE(pt.nombre, ''))
              ELSE COALESCE(pt.nombre, pt.apellido, 'Sin cliente')
            END,
            'Sin cliente'
          ) as cliente_nombre,
          pt.id as cliente_id,
          pt.codigo as cliente_codigo,
          c.created,
          c.modified
        FROM certificacions c
        LEFT JOIN proyectos p ON c.proyecto_id = p.id
        LEFT JOIN persona_terceros pt ON p.personal_id = pt.id
        WHERE ${whereClause}
        ORDER BY c.numero DESC, c.fecha DESC
        LIMIT ? OFFSET ?
      `, [...params, limit, offset]);

      const [countRows] = await pool.query(`
        SELECT COUNT(*) as total
        FROM certificacions c
        LEFT JOIN proyectos p ON c.proyecto_id = p.id
        LEFT JOIN persona_terceros pt ON p.personal_id = pt.id
        WHERE ${whereClause}
      `, params);

      const total = countRows[0]?.total || 0;

      return {
        certificados: rows,
        total
      };

    } catch (error) {
      console.error('Error al buscar certificados:', error);
      throw error;
    }
  }

  /**
   * Buscar certificados con filtros
   */
  static async buscarCertificados(filters = {}, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    
    try {
      let whereConditions = ['c.activo = 1'];
      let queryParams = [];
      
      // Filtro por número
      if (filters.numero) {
        whereConditions.push('c.numero = ?');
        queryParams.push(filters.numero);
      }
      
      // Filtro por cliente ID (exacto)
      if (filters.cliente_id) {
        whereConditions.push('pt.id = ?');
        queryParams.push(filters.cliente_id);
      }
      
      // Filtro por cliente nombre (búsqueda texto - mantener para compatibilidad)
      if (filters.cliente_nombre) {
        whereConditions.push('(pt.nombre LIKE ? OR pt.apellido LIKE ? OR CONCAT(pt.apellido, \', \', pt.nombre) LIKE ?)');
        const searchTerm = `%${filters.cliente_nombre}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm);
      }
      
      // Filtro por alcance/descripción
      if (filters.alcance) {
        whereConditions.push('c.alcance LIKE ?');
        queryParams.push(`%${filters.alcance}%`);
      }
      
      // Filtro por estado
      if (filters.estado !== null && filters.estado !== undefined) {
        whereConditions.push('c.estado = ?');
        queryParams.push(filters.estado);
      }
      
      // Filtro por proyecto
      if (filters.proyecto_id) {
        whereConditions.push('c.proyecto_id = ?');
        queryParams.push(filters.proyecto_id);
      }
      
      // Filtro por fecha exacta
      if (filters.fecha) {
        whereConditions.push('DATE(c.fecha) = ?');
        queryParams.push(filters.fecha);
      }
      
      // Filtro por rango de fechas
      if (filters.fecha_desde) {
        whereConditions.push('DATE(c.fecha) >= ?');
        queryParams.push(filters.fecha_desde);
      }
      
      if (filters.fecha_hasta) {
        whereConditions.push('DATE(c.fecha) <= ?');
        queryParams.push(filters.fecha_hasta);
      }
      
      const whereClause = whereConditions.join(' AND ');
      
      const query = `
        SELECT 
          c.id,
          c.numero,
          c.fecha,
          c.alcance,
          c.cantidad,
          c.precio_unitario,
          c.importe,
          c.estado,
          c.fecha_factura,
          c.observacion as condiciones,
          CASE 
            WHEN c.estado = 0 THEN 'Pendiente'
            WHEN c.estado = 1 THEN 'Aprobado'
            WHEN c.estado = 2 THEN 'Facturado'
            WHEN c.estado = 3 THEN 'En Proceso'
            WHEN c.estado = 4 THEN 'Anulado'
            ELSE 'Desconocido'
          END as estado_nombre,
          p.descripcion as proyecto_nombre,
          p.codigo as proyecto_codigo,
          p.id as proyecto_id,
          COALESCE(
            CASE 
              WHEN pt.apellido IS NOT NULL AND pt.apellido != '' THEN CONCAT(pt.apellido, ', ', COALESCE(pt.nombre, ''))
              ELSE COALESCE(pt.nombre, pt.apellido, 'Sin cliente')
            END,
            'Sin cliente'
          ) as cliente_nombre,
          pt.id as cliente_id,
          pt.codigo as cliente_codigo,
          c.created,
          c.modified
        FROM certificacions c
        LEFT JOIN proyectos p ON c.proyecto_id = p.id
        LEFT JOIN persona_terceros pt ON p.personal_id = pt.id
        WHERE ${whereClause}
        ORDER BY c.numero DESC, c.fecha DESC
        LIMIT ? OFFSET ?
      `;
      
      queryParams.push(limit, offset);
      
      const [certificados] = await pool.query(query, queryParams);
      
      // Contar total
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM certificacions c
        LEFT JOIN proyectos p ON c.proyecto_id = p.id
        LEFT JOIN persona_terceros pt ON p.personal_id = pt.id
        WHERE ${whereClause}
      `;
      
      const [countResult] = await pool.query(countQuery, queryParams.slice(0, -2));
      const total = countResult[0].total;
      
      return {
        certificados,
        total
      };
      
    } catch (error) {
      console.error('Error al buscar certificados:', error);
      throw error;
    }
  }
}

module.exports = CertificadoModel;
// FORCE RELOAD Wed Sep 10 20:56:13 UTC 2025
