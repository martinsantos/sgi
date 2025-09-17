const pool = require('../config/database');

class ProyectoModel {
  /**
   * Obtiene todos los proyectos con paginación y información de cliente
   */
  static async getProyectos(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [rows] = await pool.query(`
      SELECT 
        p.id,
        p.descripcion,
        p.estado,
        p.fecha_inicio,
        p.fecha_cierre,
        p.precio_venta,
        p.observaciones,
        p.personal_id,
        p.created,
        p.modified,
        CASE p.estado
          WHEN 1 THEN 'Pendiente'
          WHEN 2 THEN 'En Progreso' 
          WHEN 3 THEN 'Finalizado'
          WHEN 4 THEN 'Cancelado'
          ELSE 'Desconocido'
        END as estado_nombre,
        -- Información del cliente usando workaround para FK rota
        COALESCE(
          CASE 
            WHEN pt.apellido IS NOT NULL AND pt.apellido != '' THEN CONCAT(pt.apellido, ', ', COALESCE(pt.nombre, ''))
            ELSE COALESCE(pt.nombre, pt.apellido, 'Sin cliente')
          END,
          'Sin cliente'
        ) as cliente_nombre,
        pt.id as cliente_id,
        pt.codigo as cliente_codigo,
        pt.tipo_persona,
        -- Información del presupuesto origen (si existe)
        pres.numero as presupuesto_numero,
        pres.precio_venta as presupuesto_valor
      FROM proyectos p
      LEFT JOIN persona_terceros pt ON p.personal_id = pt.id
      LEFT JOIN presupuestos pres ON pres.cliente_id = p.personal_id AND pres.estado = 'Aprobado'
      WHERE p.activo = 1
      ORDER BY p.fecha_inicio DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);
    
    const [count] = await pool.query('SELECT COUNT(*) as total FROM proyectos WHERE activo = 1');
    
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
   * Obtiene un proyecto completo por ID con todas sus relaciones
   */
  static async getProyectoById(id) {
    const [rows] = await pool.query(`
      SELECT 
        p.*,
        CASE p.estado
          WHEN 1 THEN 'Pendiente'
          WHEN 2 THEN 'En Progreso' 
          WHEN 3 THEN 'Finalizado'
          WHEN 4 THEN 'Cancelado'
          ELSE 'Desconocido'
        END as estado_nombre,
        -- Cliente information
        pt.id as cliente_id,
        CASE 
          WHEN pt.apellido IS NOT NULL AND pt.apellido != '' THEN CONCAT(pt.apellido, ', ', COALESCE(pt.nombre, ''))
          ELSE COALESCE(pt.nombre, pt.apellido, 'Sin cliente')
        END as cliente_nombre,
        pt.codigo as cliente_codigo,
        pt.tipo_persona as cliente_tipo,
        -- Información de contacto del cliente
        pers.email as cliente_email,
        pers.telefono as cliente_telefono,
        CONCAT_WS(' ', d.calle, d.numero) as cliente_direccion
      FROM proyectos p
      LEFT JOIN persona_terceros pt ON p.personal_id = pt.id
      LEFT JOIN personas pers ON pt.id = pers.id
      LEFT JOIN domicilios d ON pers.domicilio_id = d.id
      WHERE p.id = ? AND p.activo = 1
    `, [id]);
    
    if (rows.length === 0) {
      return null;
    }
    
    const proyecto = rows[0];
    
    // Obtener certificados del proyecto
    const certificados = await this.getCertificadosProyecto(id);
    
    // Obtener facturas relacionadas con el proyecto
    const facturas = await this.getFacturasProyecto(id);
    
    // Obtener presupuesto origen (si existe)
    const presupuesto = await this.getPresupuestoOrigen(proyecto.personal_id);
    
    // Obtener tareas del proyecto
    const tareas = await this.getTareasProyecto(id);
    
    // Obtener resumen financiero del proyecto
    const resumenFinanciero = await this.getResumenFinancieroProyecto(id);
    
    return {
      ...proyecto,
      certificados,
      facturas,
      presupuesto_origen: presupuesto,
      tareas,
      resumen_financiero: resumenFinanciero
    };
  }

  /**
   * Obtiene todos los certificados de un proyecto
   */
  static async getCertificadosProyecto(proyectoId) {
    const [rows] = await pool.query(`
      SELECT 
        c.id,
        c.numero,
        c.fecha,
        c.alcance,
        c.observacion as condiciones,
        c.cantidad,
        c.precio_unitario,
        c.importe,
        c.estado,
        c.fecha_factura,
        CASE c.estado
          WHEN 0 THEN 'Pendiente'
          WHEN 1 THEN 'Aprobado'
          WHEN 2 THEN 'Facturado'
          ELSE 'Desconocido'
        END as estado_nombre,
        c.created,
        c.modified
      FROM certificacions c
      WHERE c.proyecto_id = ? AND c.activo = 1
      ORDER BY c.numero DESC
    `, [proyectoId]);
    
    return rows;
  }

  /**
   * Obtiene facturas relacionadas con un proyecto (por cliente)
   */
  static async getFacturasProyecto(proyectoId) {
    const [rows] = await pool.query(`
      SELECT 
        fv.id,
        fv.numero_factura,
        fv.fecha_emision,
        fv.total,
        fv.estado,
        fv.observaciones,
        CASE fv.estado
          WHEN 1 THEN 'Pendiente'
          WHEN 2 THEN 'Pagada Parcial'
          WHEN 3 THEN 'Pagada'
          WHEN 4 THEN 'En Proceso'
          WHEN 5 THEN 'Anulada'
          ELSE 'Desconocido'
        END as estado_nombre
      FROM factura_ventas fv
      INNER JOIN proyectos p ON fv.persona_tercero_id = p.personal_id
      WHERE p.id = ? AND fv.activo = 1
      ORDER BY fv.fecha_emision DESC
    `, [proyectoId]);
    
    return rows;
  }

  /**
   * Obtiene el presupuesto origen de un proyecto
   */
  static async getPresupuestoOrigen(clienteId) {
    const [rows] = await pool.query(`
      SELECT 
        p.id,
        p.numero,
        p.descripcion,
        p.precio_venta,
        p.fecha_cierre,
        p.estado,
        p.probabilidad,
        p.observacion
      FROM presupuestos p
      WHERE p.cliente_id = ? AND p.estado IN ('Aprobado', 'aprobado', 'APROBADO')
      ORDER BY p.created DESC
      LIMIT 1
    `, [clienteId]);
    
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Obtiene las tareas de un proyecto
   */
  static async getTareasProyecto(proyectoId) {
    // Nota: la tabla proyecto_detalles no tiene columnas de descripción/fechas/horas.
    // Ajustamos la consulta a las columnas reales detectadas: id, proyecto_id, item_id, activo, costo, created, modified
    const [rows] = await pool.query(`
      SELECT 
        pd.id,
        pd.item_id,
        pd.costo,
        pd.activo,
        pd.created,
        pd.modified
      FROM proyecto_detalles pd
      WHERE pd.proyecto_id = ?
      ORDER BY pd.created ASC
    `, [proyectoId]);
    
    return rows;
  }

  /**
   * Obtiene resumen financiero del proyecto
   */
  static async getResumenFinancieroProyecto(proyectoId) {
    // Certificados del proyecto
    const [certificados] = await pool.query(`
      SELECT 
        COUNT(*) as total_certificados,
        COUNT(CASE WHEN estado = 0 THEN 1 END) as pendientes,
        COUNT(CASE WHEN estado = 1 THEN 1 END) as aprobados,
        COUNT(CASE WHEN estado = 2 THEN 1 END) as facturados,
        COALESCE(SUM(importe), 0) as valor_total_certificados,
        COALESCE(SUM(CASE WHEN estado = 2 THEN importe ELSE 0 END), 0) as valor_facturado
      FROM certificacions
      WHERE proyecto_id = ? AND activo = 1
    `, [proyectoId]);

    // Facturas relacionadas (por cliente del proyecto)
    const [facturas] = await pool.query(`
      SELECT 
        COUNT(fv.id) as total_facturas,
        COALESCE(SUM(fv.total), 0) as valor_total_facturas,
        COALESCE(SUM(CASE WHEN fv.estado = 3 THEN fv.total ELSE 0 END), 0) as valor_cobrado
      FROM factura_ventas fv
      INNER JOIN proyectos p ON fv.persona_tercero_id = p.personal_id
      WHERE p.id = ? AND fv.activo = 1
    `, [proyectoId]);

    return {
      certificados: certificados[0],
      facturas: facturas[0]
    };
  }

  /**
   * Crea un nuevo proyecto desde un presupuesto aprobado
   */
  static async createProyectoFromPresupuesto(presupuestoId, proyectoData) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Obtener datos del presupuesto
      const [presupuesto] = await connection.query(`
        SELECT * FROM presupuestos WHERE id = ?
      `, [presupuestoId]);
      
      if (presupuesto.length === 0) {
        throw new Error('Presupuesto no encontrado');
      }
      
      const pres = presupuesto[0];
      const proyectoId = require('uuid').v4();
      const centroCostoId = require('uuid').v4();
      
      // Crear centro de costo para el proyecto
      await connection.query(`
        INSERT INTO centro_costos (id, nombre, descripcion, activo, created, modified)
        VALUES (?, ?, ?, 1, NOW(), NOW())
      `, [centroCostoId, `CC-${proyectoData.codigo || 'PROYECTO'}`, 
          `Centro de costo para proyecto: ${proyectoData.descripcion}`]);
      
      // Crear el proyecto
      await connection.query(`
        INSERT INTO proyectos (
          id, descripcion, estado, plan_cuenta_id, activo, fecha_inicio, fecha_cierre,
          centro_costo_id, personal_id, material_equipo, servicio_propio, servicio_subcontratado,
          precio_venta, rentabilidad, observaciones, tipo, margen_contribucion, comision_venta,
          created, modified
        ) VALUES (?, ?, 2, ?, 1, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, NOW(), NOW())
      `, [
        proyectoId,
        proyectoData.descripcion || pres.descripcion,
        pres.plan_cuenta_id,
        proyectoData.fecha_cierre || pres.fecha_cierre,
        centroCostoId,
        pres.cliente_id, // personal_id = cliente_id
        pres.material_equipo || 0,
        pres.servicio_propio || 0,
        pres.servicio_subcontratado || 0,
        pres.precio_venta || 0,
        pres.precio_venta * 0.15 || 0, // 15% rentabilidad estimada
        proyectoData.observaciones || '',
        pres.margen_contribucion || 0,
        pres.comision_venta || 0
      ]);
      
      // Actualizar estado del presupuesto
      await connection.query(`
        UPDATE presupuestos SET estado = 'Convertido a Proyecto' WHERE id = ?
      `, [presupuestoId]);
      
      await connection.commit();
      return proyectoId;
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Actualiza el estado de un proyecto
   */
  static async updateEstadoProyecto(id, nuevoEstado, observaciones = null) {
    const [result] = await pool.query(`
      UPDATE proyectos 
      SET estado = ?, observaciones = COALESCE(?, observaciones), modified = NOW()
      WHERE id = ?
    `, [nuevoEstado, observaciones, id]);
    
    return result.affectedRows > 0;
  }

  /**
   * Busca proyectos por diferentes criterios
   */
  static async searchProyectos(filters = {}, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const params = [];
    let whereClause = 'WHERE p.activo = 1';
    
    if (filters.descripcion) {
      whereClause += ' AND p.descripcion LIKE ?';
      params.push(`%${filters.descripcion}%`);
    }
    
    if (filters.estado) {
      whereClause += ' AND p.estado = ?';
      params.push(filters.estado);
    }
    
    if (filters.cliente_nombre) {
      whereClause += ' AND (pt.nombre LIKE ? OR pt.apellido LIKE ?)';
      params.push(`%${filters.cliente_nombre}%`, `%${filters.cliente_nombre}%`);
    }
    
    if (filters.fecha_inicio_desde) {
      whereClause += ' AND p.fecha_inicio >= ?';
      params.push(filters.fecha_inicio_desde);
    }
    
    if (filters.fecha_inicio_hasta) {
      whereClause += ' AND p.fecha_inicio <= ?';
      params.push(filters.fecha_inicio_hasta);
    }

    const queryParams = [...params, limit, offset];
    
    const [rows] = await pool.query(`
      SELECT 
        p.id,
        p.descripcion,
        p.estado,
        p.fecha_inicio,
        p.fecha_cierre,
        p.precio_venta,
        CASE p.estado
          WHEN 1 THEN 'Pendiente'
          WHEN 2 THEN 'En Progreso' 
          WHEN 3 THEN 'Finalizado'
          WHEN 4 THEN 'Cancelado'
          ELSE 'Desconocido'
        END as estado_nombre,
        COALESCE(
          CASE 
            WHEN pt.apellido IS NOT NULL AND pt.apellido != '' THEN CONCAT(pt.apellido, ', ', COALESCE(pt.nombre, ''))
            ELSE COALESCE(pt.nombre, pt.apellido, 'Sin cliente')
          END,
          'Sin cliente'
        ) as cliente_nombre
      FROM proyectos p
      LEFT JOIN persona_terceros pt ON p.personal_id = pt.id
      ${whereClause}
      ORDER BY p.fecha_inicio DESC
      LIMIT ? OFFSET ?
    `, queryParams);
    
    const [count] = await pool.query(`
      SELECT COUNT(*) as total 
      FROM proyectos p
      LEFT JOIN persona_terceros pt ON p.personal_id = pt.id
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
   * Obtener proyectos activos (para dashboard)
   */
  static async getProyectosActivos(limit = 5) {
    try {
      const query = `
        SELECT 
          p.id,
          p.descripcion,
          p.estado,
          p.fecha_inicio,
          p.fecha_cierre,
          p.precio_venta,
          CASE p.estado
            WHEN 1 THEN 'Pendiente'
            WHEN 2 THEN 'En Progreso' 
            WHEN 3 THEN 'Finalizado'
            WHEN 4 THEN 'Cancelado'
            ELSE 'Desconocido'
          END as estado_nombre,
          COALESCE(
            CASE 
              WHEN pt.apellido IS NOT NULL AND pt.apellido != '' THEN CONCAT(pt.apellido, ', ', COALESCE(pt.nombre, ''))
              ELSE COALESCE(pt.nombre, pt.apellido, 'Sin cliente')
            END,
            'Sin cliente'
          ) as cliente_nombre
        FROM proyectos p
        LEFT JOIN persona_terceros pt ON p.personal_id = pt.id
        WHERE p.activo = 1 AND p.estado IN (1, 2)
        ORDER BY p.fecha_inicio DESC
        LIMIT ?
      `;
      
      const [rows] = await pool.query(query, [limit]);
      return rows;
      
    } catch (error) {
      console.error('Error al obtener proyectos activos:', error);
      return [];
    }
  }

  /**
   * Obtener estadísticas de proyectos
   */
  static async getEstadisticas() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_proyectos,
          SUM(CASE WHEN estado = 1 THEN 1 ELSE 0 END) as proyectos_pendientes,
          SUM(CASE WHEN estado = 2 THEN 1 ELSE 0 END) as proyectos_activos,
          SUM(CASE WHEN estado = 3 THEN 1 ELSE 0 END) as proyectos_finalizados,
          SUM(CASE WHEN estado = 4 THEN 1 ELSE 0 END) as proyectos_cancelados,
          COALESCE(SUM(precio_venta), 0) as valor_total_proyectos,
          COALESCE(AVG(precio_venta), 0) as valor_promedio
        FROM proyectos
        WHERE activo = 1
      `;
      
      const [rows] = await pool.query(query);
      return rows[0];
      
    } catch (error) {
      console.error('Error al obtener estadísticas de proyectos:', error);
      return {
        total_proyectos: 0,
        proyectos_pendientes: 0,
        proyectos_activos: 0,
        proyectos_finalizados: 0,
        proyectos_cancelados: 0,
        valor_total_proyectos: 0,
        valor_promedio: 0
      };
    }
  }
}

module.exports = ProyectoModel;
