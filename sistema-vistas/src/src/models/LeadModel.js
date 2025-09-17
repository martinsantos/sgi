const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * Modelo de Leads - Gestión completa de leads/oportunidades comerciales
 */
class LeadModel {
  
  /**
   * Estados posibles de un lead
   */
  static ESTADOS = {
    NUEVO: 'nuevo',
    CONTACTADO: 'contactado',
    CALIFICADO: 'calificado',
    PROPUESTA: 'propuesta',
    NEGOCIACION: 'negociacion',
    CERRADO_GANADO: 'cerrado_ganado',
    CERRADO_PERDIDO: 'cerrado_perdido'
  };

  /**
   * Mapeo de estados a nombres legibles
   */
  static ESTADO_NOMBRES = {
    'nuevo': 'Nuevo',
    'contactado': 'Contactado',
    'calificado': 'Calificado',
    'propuesta': 'Propuesta Enviada',
    'negociacion': 'En Negociación',
    'cerrado_ganado': 'Cerrado Ganado',
    'cerrado_perdido': 'Cerrado Perdido'
  };

  /**
   * Fuentes de leads
   */
  static FUENTES = {
    WEB: 'web',
    TELEFONO: 'telefono',
    EMAIL: 'email',
    REFERENCIA: 'referencia',
    EVENTO: 'evento',
    REDES_SOCIALES: 'redes_sociales',
    PUBLICIDAD: 'publicidad',
    OTRO: 'otro'
  };

  /**
   * Obtener lista de leads con paginación
   */
  static async getLeads(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    
    try {
      // Nota: Creamos una tabla virtual de leads usando presupuestos en estado inicial
      // como proxy hasta que se implemente una tabla específica de leads
      // OPTIMIZADO: Consulta simplificada para reducir timeouts
      const query = `
        SELECT 
          p.id,
          p.numero,
          p.descripcion as titulo,
          p.cliente_id,
          COALESCE(
            CASE 
              WHEN pt.apellido IS NOT NULL AND pt.apellido != '' THEN CONCAT(pt.apellido, ', ', COALESCE(pt.nombre, ''))
              ELSE COALESCE(pt.nombre, pt.apellido, 'Sin nombre')
            END,
            'Sin nombre'
          ) as nombre_contacto,
          p.precio_venta as valor_estimado,
          p.probabilidad,
          CASE 
            WHEN p.estado = 'borrador' OR p.estado = 'Borrador' THEN 'nuevo'
            WHEN p.estado = 'enviado' OR p.estado = 'Enviado' THEN 'propuesta'
            WHEN p.estado = 'aprobado' OR p.estado = 'Aprobado' THEN 'cerrado_ganado'
            WHEN p.estado = 'rechazado' OR p.estado = 'Rechazado' THEN 'cerrado_perdido'
            ELSE 'nuevo'
          END as estado,
          CASE 
            WHEN p.estado = 'borrador' OR p.estado = 'Borrador' THEN 'Nuevo'
            WHEN p.estado = 'enviado' OR p.estado = 'Enviado' THEN 'Propuesta Enviada'
            WHEN p.estado = 'aprobado' OR p.estado = 'Aprobado' THEN 'Cerrado Ganado'
            WHEN p.estado = 'rechazado' OR p.estado = 'Rechazado' THEN 'Cerrado Perdido'
            ELSE 'Nuevo'
          END as estado_nombre,
          'presupuesto' as fuente,
          p.fecha_cierre as fecha_seguimiento,
          p.created as fecha_creacion,
          p.modified as fecha_actualizacion
        FROM presupuestos p
        LEFT JOIN persona_terceros pt ON p.cliente_id = pt.id
        WHERE p.activo = 1
        ORDER BY p.created DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      
      const [leads] = await pool.query(query);
      
      // Consulta para contar total
      const [countResult] = await pool.query(
        'SELECT COUNT(*) as total FROM presupuestos WHERE activo = 1'
      );
      const total = countResult[0].total;
      
      return {
        data: leads,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalRecords: total,
          limit: limit,
          offset: offset,
          hasNextPage: page < Math.ceil(total / limit),
          hasPreviousPage: page > 1
        }
      };
      
    } catch (error) {
      console.error('Error al obtener leads:', error);
      throw error;
    }
  }
  
  /**
   * Obtener lead por ID
   */
  static async getLeadById(id) {
    try {
      const query = `
        SELECT 
          p.id,
          p.numero,
          p.descripcion as titulo,
          p.cliente_id,
          COALESCE(
            CASE 
              WHEN pt.apellido IS NOT NULL AND pt.apellido != '' THEN CONCAT(pt.apellido, ', ', COALESCE(pt.nombre, ''))
              ELSE COALESCE(pt.nombre, pt.apellido, 'Sin nombre')
            END,
            'Sin nombre'
          ) as nombre_contacto,
          pt.codigo as codigo_cliente,
          pers.email,
          pers.telefono,
          CONCAT_WS(' ', d.calle, d.numero) as direccion,
          p.precio_venta as valor_estimado,
          p.probabilidad,
          CASE 
            WHEN p.estado = 'borrador' OR p.estado = 'Borrador' THEN 'nuevo'
            WHEN p.estado = 'enviado' OR p.estado = 'Enviado' THEN 'propuesta'
            WHEN p.estado = 'aprobado' OR p.estado = 'Aprobado' THEN 'cerrado_ganado'
            WHEN p.estado = 'rechazado' OR p.estado = 'Rechazado' THEN 'cerrado_perdido'
            ELSE 'nuevo'
          END as estado,
          'presupuesto' as fuente,
          p.fecha_cierre as fecha_seguimiento,
          p.observacion as notas,
          p.created as fecha_creacion,
          p.modified as fecha_actualizacion
        FROM presupuestos p
        LEFT JOIN persona_terceros pt ON p.cliente_id = pt.id
        LEFT JOIN personas pers ON pt.id = pers.id
        LEFT JOIN domicilios d ON pers.domicilio_id = d.id
        WHERE p.id = ? AND p.activo = 1
      `;
      
      const [rows] = await pool.execute(query, [id]);
      
      if (rows.length === 0) {
        return null;
      }
      
      const lead = rows[0];
      
      // Obtener historial de interacciones (usando modificaciones de presupuesto como proxy)
      const historial = await this.getHistorialInteracciones(id);
      
      return {
        ...lead,
        historial_interacciones: historial
      };
      
    } catch (error) {
      console.error('Error al obtener lead por ID:', error);
      throw error;
    }
  }

  /**
   * Obtener leads recientes
   */
  static async getLeadsRecientes(limit = 10) {
    try {
      const query = `
        SELECT 
          p.id,
          p.numero,
          p.descripcion as titulo,
          COALESCE(pt.nombre, pt.apellido, 'Sin nombre') as nombre_contacto,
          p.precio_venta as valor_estimado,
          p.probabilidad,
          CASE 
            WHEN p.estado = 'borrador' OR p.estado = 'Borrador' THEN 'nuevo'
            WHEN p.estado = 'enviado' OR p.estado = 'Enviado' THEN 'propuesta'
            WHEN p.estado = 'aprobado' OR p.estado = 'Aprobado' THEN 'cerrado_ganado'
            WHEN p.estado = 'rechazado' OR p.estado = 'Rechazado' THEN 'cerrado_perdido'
            ELSE 'nuevo'
          END as estado,
          p.created as fecha_creacion
        FROM presupuestos p
        LEFT JOIN persona_terceros pt ON p.cliente_id = pt.id
        WHERE p.activo = 1 AND p.estado IN ('borrador', 'Borrador', 'enviado', 'Enviado')
        ORDER BY p.created DESC
        LIMIT ${limit}
      `;
      
      const [leads] = await pool.query(query);
      return leads;
      
    } catch (error) {
      console.error('Error al obtener leads recientes:', error);
      return [];
    }
  }

  /**
   * Obtener estadísticas de leads
   */
  static async getEstadisticas() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_leads,
          SUM(CASE WHEN p.estado IN ('borrador', 'Borrador') THEN 1 ELSE 0 END) as leads_nuevos,
          SUM(CASE WHEN p.estado IN ('enviado', 'Enviado') THEN 1 ELSE 0 END) as leads_propuesta,
          SUM(CASE WHEN p.estado IN ('aprobado', 'Aprobado') THEN 1 ELSE 0 END) as leads_cerrados_ganados,
          SUM(CASE WHEN p.estado IN ('rechazado', 'Rechazado') THEN 1 ELSE 0 END) as leads_cerrados_perdidos,
          COALESCE(SUM(p.precio_venta), 0) as valor_total_pipeline,
          COALESCE(SUM(CASE WHEN p.estado IN ('aprobado', 'Aprobado') THEN p.precio_venta ELSE 0 END), 0) as valor_cerrado_ganado,
          COALESCE(AVG(p.precio_venta), 0) as valor_promedio_lead,
          COALESCE(AVG(p.probabilidad), 0) as probabilidad_promedio
        FROM presupuestos p
        WHERE p.activo = 1
      `;
      
      const [rows] = await pool.execute(query);
      
      const stats = rows[0];
      
      // Calcular tasa de conversión
      const tasaConversion = stats.total_leads > 0 ? 
        (stats.leads_cerrados_ganados / stats.total_leads * 100) : 0;
      
      return {
        ...stats,
        tasa_conversion: Math.round(tasaConversion * 100) / 100
      };
      
    } catch (error) {
      console.error('Error al obtener estadísticas de leads:', error);
      return {
        total_leads: 0,
        leads_nuevos: 0,
        leads_propuesta: 0,
        leads_cerrados_ganados: 0,
        leads_cerrados_perdidos: 0,
        valor_total_pipeline: 0,
        valor_cerrado_ganado: 0,
        valor_promedio_lead: 0,
        probabilidad_promedio: 0,
        tasa_conversion: 0
      };
    }
  }

  /**
   * Obtener historial de interacciones de un lead
   */
  static async getHistorialInteracciones(leadId) {
    try {
      // Simular historial usando fechas de modificación del presupuesto
      const query = `
        SELECT 
          'Presupuesto creado' as tipo_interaccion,
          'Sistema' as usuario,
          p.created as fecha,
          CONCAT('Presupuesto N° ', p.numero, ' creado por valor de $', FORMAT(p.precio_venta, 2)) as descripcion
        FROM presupuestos p
        WHERE p.id = ?
        UNION ALL
        SELECT 
          'Presupuesto actualizado' as tipo_interaccion,
          'Sistema' as usuario,
          p.modified as fecha,
          CONCAT('Presupuesto modificado. Estado: ', p.estado) as descripcion
        FROM presupuestos p
        WHERE p.id = ? AND p.modified != p.created
        ORDER BY fecha DESC
      `;
      
      const [interacciones] = await pool.execute(query, [leadId, leadId]);
      return interacciones;
      
    } catch (error) {
      console.error('Error al obtener historial de interacciones:', error);
      return [];
    }
  }

  /**
   * Crear nuevo lead (simulado usando presupuesto)
   */
  static async createLead(leadData) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      // Crear como presupuesto en borrador para simular lead
      const PresupuestoModel = require('./PresupuestoModel');
      
      const presupuestoData = {
        descripcion: leadData.titulo || leadData.descripcion || 'Lead sin título',
        cliente_id: leadData.cliente_id,
        precio_venta: leadData.valor_estimado || 0,
        probabilidad: leadData.probabilidad || 50,
        estado: 'borrador', // Estado inicial para lead
        fecha_cierre: leadData.fecha_seguimiento,
        observacion: leadData.notas || `Lead creado desde fuente: ${leadData.fuente || 'desconocida'}`
      };
      
      const leadId = await PresupuestoModel.createPresupuesto(presupuestoData);
      
      console.log('✅ Lead creado (como presupuesto):', leadId);
      return leadId;
      
    } catch (error) {
      console.error('❌ Error al crear lead:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Actualizar estado de lead
   */
  static async updateEstadoLead(id, nuevoEstado, notas = null) {
    try {
      // Mapear estado de lead a estado de presupuesto
      const estadosMap = {
        'nuevo': 'borrador',
        'contactado': 'borrador',
        'calificado': 'borrador',
        'propuesta': 'enviado',
        'negociacion': 'enviado',
        'cerrado_ganado': 'aprobado',
        'cerrado_perdido': 'rechazado'
      };
      
      const estadoPresupuesto = estadosMap[nuevoEstado] || 'borrador';
      
      const query = `
        UPDATE presupuestos 
        SET estado = ?, observacion = COALESCE(?, observacion), modified = NOW()
        WHERE id = ? AND activo = 1
      `;
      
      const [result] = await pool.execute(query, [estadoPresupuesto, notas, id]);
      return result.affectedRows > 0;
      
    } catch (error) {
      console.error('Error al actualizar estado de lead:', error);
      throw error;
    }
  }

  /**
   * Convertir lead a presupuesto formal
   */
  static async convertirAPresupuesto(leadId, datosAdicionales = {}) {
    try {
      const query = `
        UPDATE presupuestos 
        SET 
          estado = 'enviado',
          fecha_envio = NOW(),
          observacion = CONCAT(COALESCE(observacion, ''), '\n--- Convertido de Lead a Presupuesto ---'),
          modified = NOW()
        WHERE id = ? AND activo = 1
      `;
      
      const [result] = await pool.execute(query, [leadId]);
      return result.affectedRows > 0;
      
    } catch (error) {
      console.error('Error al convertir lead a presupuesto:', error);
      throw error;
    }
  }

  /**
   * Buscar leads por criterios
   */
  static async searchLeads(filters = {}, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const params = [];
    let whereClause = 'WHERE p.activo = 1';
    
    if (filters.titulo) {
      whereClause += ' AND p.descripcion LIKE ?';
      params.push(`%${filters.titulo}%`);
    }
    
    if (filters.estado) {
      // Mapear estado de lead a estado de presupuesto
      const estadosMap = {
        'nuevo': ['borrador', 'Borrador'],
        'propuesta': ['enviado', 'Enviado'],
        'cerrado_ganado': ['aprobado', 'Aprobado'],
        'cerrado_perdido': ['rechazado', 'Rechazado']
      };
      
      const estadosPresupuesto = estadosMap[filters.estado] || [filters.estado];
      whereClause += ` AND p.estado IN (${estadosPresupuesto.map(() => '?').join(', ')})`;
      params.push(...estadosPresupuesto);
    }
    
    if (filters.nombre_contacto) {
      whereClause += ' AND (pt.nombre LIKE ? OR pt.apellido LIKE ?)';
      params.push(`%${filters.nombre_contacto}%`, `%${filters.nombre_contacto}%`);
    }
    
    if (filters.valor_minimo) {
      whereClause += ' AND p.precio_venta >= ?';
      params.push(filters.valor_minimo);
    }
    
    if (filters.valor_maximo) {
      whereClause += ' AND p.precio_venta <= ?';
      params.push(filters.valor_maximo);
    }
    
    if (filters.fecha_desde) {
      whereClause += ' AND p.created >= ?';
      params.push(filters.fecha_desde);
    }
    
    if (filters.fecha_hasta) {
      whereClause += ' AND p.created <= ?';
      params.push(filters.fecha_hasta);
    }

    const queryParams = [...params, limit, offset];
    
    try {
      const [rows] = await pool.query(`
        SELECT 
          p.id,
          p.numero,
          p.descripcion as titulo,
          COALESCE(pt.nombre, pt.apellido, 'Sin nombre') as nombre_contacto,
          p.precio_venta as valor_estimado,
          p.probabilidad,
          CASE 
            WHEN p.estado = 'borrador' OR p.estado = 'Borrador' THEN 'nuevo'
            WHEN p.estado = 'enviado' OR p.estado = 'Enviado' THEN 'propuesta'
            WHEN p.estado = 'aprobado' OR p.estado = 'Aprobado' THEN 'cerrado_ganado'
            WHEN p.estado = 'rechazado' OR p.estado = 'Rechazado' THEN 'cerrado_perdido'
            ELSE 'nuevo'
          END as estado,
          p.created as fecha_creacion
        FROM presupuestos p
        LEFT JOIN persona_terceros pt ON p.cliente_id = pt.id
        ${whereClause}
        ORDER BY p.created DESC
        LIMIT ? OFFSET ?
      `, queryParams);
      
      const [count] = await pool.query(`
        SELECT COUNT(*) as total 
        FROM presupuestos p
        LEFT JOIN persona_terceros pt ON p.cliente_id = pt.id
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
      console.error('Error al buscar leads:', error);
      throw error;
    }
  }

  /**
   * Formatear moneda
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
   * Calcular valor ponderado del lead (valor * probabilidad)
   */
  static calcularValorPonderado(valorEstimado, probabilidad) {
    if (!valorEstimado || !probabilidad) return 0;
    return (valorEstimado * probabilidad) / 100;
  }
}

module.exports = LeadModel;
