const pool = require('../config/database');

class ProyectoModel {
  /**
   * Obtiene todos los proyectos con paginación, cliente, certificados y filtros
   */
  static async getProyectos(page = 1, limit = 20, filtros = {}, sortBy = 'fecha_inicio', sortOrder = 'DESC') {
    const offset = (page - 1) * limit;
    
    // Validar parámetros de ordenamiento
    const validSortFields = ['id', 'descripcion', 'cliente_nombre', 'estado', 'fecha_inicio', 'fecha_cierre', 'total_certificados', 'monto_certificados', 'monto_facturado', 'precio_venta'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'fecha_inicio';
    const order = (sortOrder === 'ASC' || sortOrder === 'asc') ? 'ASC' : 'DESC';
    
    // Construir condiciones WHERE dinámicamente
    let whereConditions = ['p.activo = 1'];
    let queryParams = [];
    
    if (filtros.id && filtros.id.trim() !== '') {
      whereConditions.push('p.id LIKE ?');
      queryParams.push(`${filtros.id}%`);
    }
    
    if (filtros.descripcion && filtros.descripcion.trim() !== '') {
      whereConditions.push('LOWER(p.descripcion) LIKE LOWER(?)');
      queryParams.push(`%${filtros.descripcion}%`);
    }
    
    if (filtros.cliente && filtros.cliente.trim() !== '') {
      whereConditions.push('(LOWER(pt.nombre) LIKE LOWER(?) OR LOWER(pt.apellido) LIKE LOWER(?) OR LOWER(pt.codigo) LIKE LOWER(?) OR LOWER(CONCAT(pt.apellido, ", ", pt.nombre)) LIKE LOWER(?) OR LOWER(CONCAT(pt.nombre, " ", pt.apellido)) LIKE LOWER(?) OR LOWER(p.descripcion) LIKE LOWER(?))');
      const clienteTerm = `%${filtros.cliente}%`;
      queryParams.push(clienteTerm, clienteTerm, clienteTerm, clienteTerm, clienteTerm, clienteTerm);
    }
    
    if (filtros.estado && filtros.estado !== '') {
      whereConditions.push('p.estado = ?');
      queryParams.push(parseInt(filtros.estado));
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    console.log(`🔍 Búsqueda: id="${filtros.id}", descripcion="${filtros.descripcion}", cliente="${filtros.cliente}", estado="${filtros.estado}"`);
    console.log(`📝 WHERE clause: ${whereClause}`);
    console.log(`📊 Query params:`, queryParams);
    
    const [rows] = await pool.query(`
      SELECT 
        @row_num := @row_num + 1 as numero_secuencial,
        p.id,
        p.descripcion,
        p.codigo as proyecto_codigo,
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
        -- Información del cliente
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
        -- Información del presupuesto origen
        pres.numero as presupuesto_numero,
        pres.precio_venta as presupuesto_valor,
        -- Estadísticas de certificados
        COUNT(DISTINCT c.id) as total_certificados,
        SUM(CASE WHEN c.activo = 1 THEN 1 ELSE 0 END) as certificados_activos,
        SUM(CASE WHEN c.activo = 1 THEN c.importe ELSE 0 END) as monto_certificados,
        SUM(CASE WHEN c.activo = 1 AND c.estado IN (2, 3) THEN c.importe ELSE 0 END) as monto_facturado
      FROM (SELECT @row_num := 0) as init,
           proyectos p
      LEFT JOIN persona_terceros pt ON p.personal_id = pt.id
      LEFT JOIN presupuestos pres ON pres.cliente_id = p.personal_id AND pres.estado = 'Aprobado'
      LEFT JOIN certificacions c ON p.id = c.proyecto_id
      WHERE ${whereClause}
      GROUP BY p.id
      ORDER BY ${sortField === 'cliente_nombre' ? 'cliente_nombre' : 'p.' + sortField} ${order}
      LIMIT ? OFFSET ?
    `, [...queryParams, limit, offset]);
    
    console.log(`✅ Resultados encontrados: ${rows.length} proyectos`);
    
    // Obtener certificados para cada proyecto
    const proyectosConCertificados = await Promise.all(
      rows.map(async (proyecto) => {
        const certificados = await this.getCertificadosProyecto(proyecto.id);
        console.log(`📋 Proyecto ${proyecto.id} (${proyecto.descripcion}): ${certificados.total} certificados (${certificados.total_activos} activos, ${certificados.total_inactivos} inactivos)`);
        return {
          ...proyecto,
          certificados_detalle: certificados
        };
      })
    );
    
    // Contar total con filtros aplicados
    const [count] = await pool.query(`
      SELECT COUNT(DISTINCT p.id) as total 
      FROM proyectos p
      LEFT JOIN persona_terceros pt ON p.personal_id = pt.id
      WHERE ${whereClause}
    `, queryParams);
    
    return {
      data: proyectosConCertificados,
      pagination: {
        total: count[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count[0].total / limit)
      }
    };
  }

  /**
   * Obtiene un proyecto simple por ID (para edición)
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
        pt.id as cliente_id,
        CASE 
          WHEN pt.apellido IS NOT NULL AND pt.apellido != '' THEN CONCAT(pt.apellido, ', ', COALESCE(pt.nombre, ''))
          ELSE COALESCE(pt.nombre, pt.apellido, 'Sin cliente')
        END as cliente_nombre,
        p.codigo as proyecto_codigo
      FROM proyectos p
      LEFT JOIN persona_terceros pt ON p.personal_id = pt.id
      WHERE p.id = ? AND p.activo = 1
    `, [id]);
    
    if (rows.length === 0) {
      return null;
    }
    
    return rows[0];
  }

  /**
   * Obtiene un proyecto completo por ID con todas sus relaciones (para vista)
   */
  static async getProyectoCompleto(id) {
    const proyecto = await this.getProyectoById(id);
    
    if (!proyecto) {
      return null;
    }
    
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
   * Obtiene todos los certificados de un proyecto (activos e inactivos)
   * Retorna objeto con certificados activos e inactivos separados
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
        c.activo,
        CASE c.estado
          WHEN 0 THEN 'Pendiente'
          WHEN 1 THEN 'Aprobado'
          WHEN 2 THEN 'Facturado'
          WHEN 3 THEN 'En Proceso'
          WHEN 4 THEN 'Anulado'
          ELSE 'Desconocido'
        END as estado_nombre,
        c.created,
        c.modified
      FROM certificacions c
      WHERE c.proyecto_id = ?
      ORDER BY c.fecha ASC, c.numero ASC
    `, [proyectoId]);
    
    // Separar certificados activos e inactivos
    const activos = rows.filter(c => c.activo === 1);
    const inactivos = rows.filter(c => c.activo === 0);
    
    return {
      activos,
      inactivos,
      total: rows.length,
      total_activos: activos.length,
      total_inactivos: inactivos.length
    };
  }

  /**
   * Obtiene todos los certificados disponibles para asociar a un proyecto
   * Excluye certificados ya asociados a otros proyectos
   */
  static async getCertificadosDisponibles(proyectoId, limit = 100, offset = 0) {
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
        CASE c.estado
          WHEN 0 THEN 'Pendiente'
          WHEN 1 THEN 'Aprobado'
          WHEN 2 THEN 'Facturado'
          WHEN 3 THEN 'En Proceso'
          WHEN 4 THEN 'Anulado'
          ELSE 'Desconocido'
        END as estado_nombre,
        c.created
      FROM certificacions c
      WHERE c.activo = 1 AND (c.proyecto_id IS NULL OR c.proyecto_id = ?)
      ORDER BY c.fecha DESC, c.numero DESC
      LIMIT ? OFFSET ?
    `, [proyectoId, limit, offset]);
    
    const [countResult] = await pool.query(`
      SELECT COUNT(*) as total FROM certificacions c
      WHERE c.activo = 1 AND (c.proyecto_id IS NULL OR c.proyecto_id = ?)
    `, [proyectoId]);
    
    return {
      certificados: rows,
      total: countResult[0]?.total || 0
    };
  }

  /**
   * Asocia un certificado a un proyecto
   */
  static async asociarCertificado(proyectoId, certificadoId) {
    try {
      const [result] = await pool.query(`
        UPDATE certificacions 
        SET proyecto_id = ?, modified = NOW()
        WHERE id = ? AND activo = 1
      `, [proyectoId, certificadoId]);
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error al asociar certificado:', error);
      throw error;
    }
  }

  /**
   * Desasocia un certificado de un proyecto
   */
  static async desasociarCertificado(certificadoId) {
    try {
      const [result] = await pool.query(`
        UPDATE certificacions 
        SET proyecto_id = NULL, modified = NOW()
        WHERE id = ? AND activo = 1
      `, [certificadoId]);
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error al desasociar certificado:', error);
      throw error;
    }
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
   * Actualiza todos los campos de un proyecto
   */
  static async updateProyecto(id, proyectoData) {
    try {
      const [result] = await pool.query(`
        UPDATE proyectos 
        SET 
          descripcion = ?,
          estado = ?,
          fecha_inicio = ?,
          fecha_cierre = ?,
          precio_venta = ?,
          observaciones = ?,
          personal_id = ?,
          modified = NOW()
        WHERE id = ? AND activo = 1
      `, [
        proyectoData.descripcion,
        parseInt(proyectoData.estado) || 1,
        proyectoData.fecha_inicio,
        proyectoData.fecha_cierre || null,
        parseFloat(proyectoData.precio_venta) || 0,
        proyectoData.observaciones || '',
        proyectoData.cliente_id || proyectoData.personal_id,
        id
      ]);
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error al actualizar proyecto:', error);
      throw error;
    }
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
              WHEN pers.apellido IS NOT NULL AND pers.apellido != '' THEN CONCAT(pers.apellido, ', ', COALESCE(pers.nombre, ''))
              ELSE COALESCE(pers.nombre, pers.apellido, 'Sin cliente')
            END,
            'Sin cliente'
          ) as cliente_nombre
        FROM proyectos p
        LEFT JOIN personals pers ON p.personal_id = pers.id
        WHERE p.activo = 1
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

  /**
   * Obtiene proyectos de un cliente específico
   */
  static async getProyectosByCliente(clienteId) {
    try {
      const [rows] = await pool.query(`
        SELECT 
          p.id,
          p.descripcion as nombre,
          p.descripcion,
          p.estado,
          p.precio_venta,
          p.fecha_inicio,
          p.fecha_cierre,
          p.observaciones,
          p.personal_id,
          p.created,
          p.modified
        FROM proyectos p
        WHERE p.personal_id = ? AND p.activo = 1
        ORDER BY p.fecha_inicio DESC
      `, [clienteId]);
      
      return rows || [];
    } catch (error) {
      console.error('Error al obtener proyectos del cliente:', error);
      return [];
    }
  }

  /**
   * Elimina un proyecto (soft delete - marca como inactivo)
   */
  static async deleteProyecto(id) {
    try {
      const [result] = await pool.query(`
        UPDATE proyectos 
        SET activo = 0, modified = NOW()
        WHERE id = ? AND activo = 1
      `, [id]);
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error al eliminar proyecto:', error);
      throw error;
    }
  }
}

module.exports = ProyectoModel;
