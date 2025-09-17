const PresupuestoModel = require('../models/presupuestoModel');
const pool = require('../config/database');

class PresupuestoController {
  static async listar(req, res) {
    try {
      const page = parseInt(req.query.page || 1);
      const limit = parseInt(req.query.limit || 10);

      // Build filters from query params
      const filters = {
        estado: req.query.estado,
        cliente_id: req.query.cliente_id,
        fecha_desde: req.query.fecha_desde,
        fecha_hasta: req.query.fecha_hasta,
        q: req.query.q
      };

      // Get presupuestos
      const result = await PresupuestoModel.getPresupuestos(page, limit, filters);

      // Get stats
      const stats = await PresupuestoModel.getEstadisticas();

      // Convert stats numbers to integers where needed
      const transformedStats = {
        total: parseInt(stats.total),
        total_borradores: parseInt(stats.total_borradores),
        total_enviados: parseInt(stats.total_enviados),
        total_aprobados: parseInt(stats.total_aprobados),
        total_rechazados: parseInt(stats.total_rechazados),
        total_vencidos: parseInt(stats.total_vencidos),
        importe_promedio: parseFloat(stats.importe_promedio)
      };

      // Get clients for filter
      const [clientes] = await pool.query(
        'SELECT id, nombre, codigo FROM clientes WHERE activo = 1 ORDER BY nombre'
      );

      // Format data for view
      const presupuestos = result.data.map(p => ({
        ...p,
        fecha_emision_formatted: new Date(p.fecha_emision).toLocaleDateString('es-AR'),
        fecha_validez_formatted: p.fecha_validez ? new Date(p.fecha_validez).toLocaleDateString('es-AR') : null,
        importe_total_formatted: p.importe_total ? 
          new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(p.importe_total) : 
          '$0,00',
        estado_badge_class: this.getEstadoBadgeClass(parseInt(p.estado)),
        estado_nombre: this.getEstadoBadge(parseInt(p.estado))
      }));

      return res.render('presupuestos/lista', {
        title: 'Presupuestos',
        presupuestos,
        stats: transformedStats,
        clientes,
        filters,
        pagination: {
          page: result.page,
          lastPage: result.lastPage,
          hasPages: result.lastPage > 1,
          total: result.total
        },
        queryString: req.query
      });

    } catch (error) {
      console.error('Error en listar presupuestos:', error);
      return res.render('error', {
        title: 'Error',
        message: 'Error al cargar presupuestos'
      });
    }
  }

  static async listarAPI(req, res) {
    try {
      const page = parseInt(req.query.page || 1);
      const limit = parseInt(req.query.limit || 10);

      const filters = {
        estado: req.query.estado,
        cliente_id: req.query.cliente_id,
        fecha_desde: req.query.fecha_desde,
        fecha_hasta: req.query.fecha_hasta,
        q: req.query.q
      };

      const result = await PresupuestoModel.getPresupuestos(page, limit, filters);

      return res.json({
        data: result.data,
        meta: {
          current_page: result.page,
          last_page: result.lastPage,
          total: result.total
        }
      });

    } catch (error) {
      console.error('Error en listarAPI:', error);
      return res.status(500).json({ 
        error: 'Error al cargar presupuestos' 
      });
    }
  }

  static async ver(req, res) {
    try {
      const presupuesto = await PresupuestoModel.getPresupuesto(req.params.id);
      
      if (!presupuesto) {
        return res.status(404).render('error', {
          title: 'No encontrado',
          message: 'Presupuesto no encontrado'
        });
      }

      // Format data for view
      presupuesto.fecha_emision_formatted = new Date(presupuesto.fecha_emision).toLocaleDateString('es-AR');
      presupuesto.fecha_validez_formatted = presupuesto.fecha_validez ? 
        new Date(presupuesto.fecha_validez).toLocaleDateString('es-AR') : null;
      presupuesto.importe_total_formatted = presupuesto.importe_total ?
        new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(presupuesto.importe_total) :
        '$0,00';
      presupuesto.estado_badge_class = this.getEstadoBadgeClass(parseInt(presupuesto.estado));
      presupuesto.estado_nombre = this.getEstadoBadge(parseInt(presupuesto.estado));

      // Format items
      presupuesto.items = presupuesto.items.map(item => ({
        ...item,
        subtotal_formatted: new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(item.subtotal),
        total_formatted: new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(item.total)
      }));

      return res.render('presupuestos/ver', {
        title: `Presupuesto #${presupuesto.numero_presupuesto}`,
        presupuesto
      });

    } catch (error) {
      console.error('Error al ver presupuesto:', error);
      return res.render('error', {
        title: 'Error',
        message: 'Error al cargar el presupuesto'
      });
    }
  }

  static async nuevo(req, res) {
    try {
      // Get clients for select
      const [clientes] = await pool.query(
        'SELECT id, nombre, codigo FROM clientes WHERE activo = 1 ORDER BY nombre'
      );

      return res.render('presupuestos/nuevo', {
        title: 'Nuevo Presupuesto',
        clientes
      });

    } catch (error) {
      console.error('Error en nuevo presupuesto:', error);
      return res.render('error', {
        title: 'Error',
        message: 'Error al cargar el formulario'
      });
    }
  }

  static async crear(req, res) {
    try {
      const data = {
        cliente_id: req.body.cliente_id,
        numero_presupuesto: await this.generateNumeroPresupuesto(),
        fecha_emision: req.body.fecha_emision,
        fecha_validez: req.body.fecha_validez,
        descripcion: req.body.descripcion,
        notas: req.body.notas,
        subtotal: req.body.subtotal,
        iva: req.body.iva,
        importe_total: req.body.importe_total,
        estado: 0 // Borrador
      };

      const items = req.body.items;

      const id = await PresupuestoModel.crear(data, items);
      
      return res.json({ id });

    } catch (error) {
      console.error('Error al crear presupuesto:', error);
      return res.status(500).json({ 
        error: 'Error al crear el presupuesto' 
      });
    }
  }

  static async editar(req, res) {
    try {
      const presupuesto = await PresupuestoModel.getPresupuesto(req.params.id);
      
      if (!presupuesto) {
        return res.status(404).render('error', {
          title: 'No encontrado',
          message: 'Presupuesto no encontrado'
        });
      }

      if (presupuesto.estado !== 0) {
        return res.status(403).render('error', {
          title: 'No permitido',
          message: 'Solo se pueden editar presupuestos en estado borrador'
        });
      }

      // Get clients for select
      const [clientes] = await pool.query(
        'SELECT id, nombre, codigo FROM clientes WHERE activo = 1 ORDER BY nombre'
      );

      return res.render('presupuestos/editar', {
        title: `Editar Presupuesto #${presupuesto.numero_presupuesto}`,
        presupuesto,
        clientes
      });

    } catch (error) {
      console.error('Error al editar presupuesto:', error);
      return res.render('error', {
        title: 'Error',
        message: 'Error al cargar el presupuesto'
      });
    }
  }

  static async actualizar(req, res) {
    try {
      const data = {
        cliente_id: req.body.cliente_id,
        fecha_validez: req.body.fecha_validez,
        descripcion: req.body.descripcion,
        notas: req.body.notas,
        subtotal: req.body.subtotal,
        iva: req.body.iva,
        importe_total: req.body.importe_total
      };

      const items = req.body.items;

      await PresupuestoModel.actualizar(req.params.id, data, items);
      
      return res.json({ success: true });

    } catch (error) {
      console.error('Error al actualizar presupuesto:', error);
      return res.status(500).json({ 
        error: 'Error al actualizar el presupuesto' 
      });
    }
  }

  static async aprobar(req, res) {
    try {
      await PresupuestoModel.aprobar(req.params.id);
      return res.json({ success: true });
    } catch (error) {
      console.error('Error al aprobar presupuesto:', error);
      return res.status(500).json({ 
        error: 'Error al aprobar el presupuesto' 
      });
    }
  }

  static async rechazar(req, res) {
    try {
      await PresupuestoModel.rechazar(req.params.id);
      return res.json({ success: true });
    } catch (error) {
      console.error('Error al rechazar presupuesto:', error);
      return res.status(500).json({ 
        error: 'Error al rechazar el presupuesto' 
      });
    }
  }

  static async eliminar(req, res) {
    try {
      await PresupuestoModel.eliminar(req.params.id);
      return res.json({ success: true });
    } catch (error) {
      console.error('Error al eliminar presupuesto:', error);
      return res.status(500).json({ 
        error: error.message || 'Error al eliminar el presupuesto' 
      });
    }
  }

  static async generateNumeroPresupuesto() {
    const [result] = await pool.query(`
      SELECT MAX(CAST(SUBSTRING_INDEX(numero_presupuesto, '-', -1) AS UNSIGNED)) as max_numero 
      FROM presupuestos 
      WHERE YEAR(fecha_emision) = YEAR(CURDATE())
    `);
    
    const year = new Date().getFullYear().toString().substr(-2);
    const numero = (result[0].max_numero || 0) + 1;
    return `P${year}-${numero.toString().padStart(4, '0')}`;
  }

  // Helpers for estado badges
  static getEstadoBadgeClass(estado) {
    const classes = {
      0: 'bg-secondary', // Borrador
      1: 'bg-primary',   // Enviado
      2: 'bg-success',   // Aprobado
      3: 'bg-danger',    // Rechazado
      4: 'bg-warning'    // Vencido
    };
    return classes[estado] || 'bg-secondary';
  }

  static getEstadoBadge(estado) {
    const estados = {
      0: 'Borrador',
      1: 'Enviado', 
      2: 'Aprobado',
      3: 'Rechazado',
      4: 'Vencido'
    };
    return estados[estado] || 'Desconocido';
  }
}

module.exports = PresupuestoController;
