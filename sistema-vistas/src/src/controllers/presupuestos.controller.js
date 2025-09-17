const PresupuestoModel = require('../models/PresupuestoModel');

class PresupuestosController {
  /**
   * Listar presupuestos
   */
  static async getPresupuestos(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const result = await PresupuestoModel.getPresupuestos(page, limit);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error al listar presupuestos:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Error al obtener presupuestos',
          details: error.message
        }
      });
    }
  }

  /**
   * Crear presupuesto
   */
  static async createPresupuesto(req, res) {
    try {
      const { cliente_id, descripcion, items, fecha_validez, observaciones } = req.body;

      // Validaciones básicas
      if (!cliente_id || !items || !items.length) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Datos inválidos',
            details: 'Se requiere cliente_id e items'
          }
        });
      }

      // Calcular total
      const total = items.reduce((sum, item) => 
        sum + (item.cantidad * item.precio_unitario), 0
      );

      const presupuestoData = {
        cliente_id,
        descripcion: descripcion || '',
        fecha_validez,
        observaciones,
        importe_total: total
      };

      const id = await PresupuestoModel.createPresupuesto(presupuestoData);
      const presupuesto = await PresupuestoModel.getPresupuestoById(id);

      res.status(201).json({
        success: true,
        data: {
          id,
          numero: presupuesto.numero,
          total: presupuesto.precio_venta
        }
      });
    } catch (error) {
      console.error('Error al crear presupuesto:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Error al crear presupuesto',
          details: error.message
        }
      });
    }
  }

  /**
   * Aprobar presupuesto
   */
  static async aprobarPresupuesto(req, res) {
    try {
      const { id } = req.params;
      const presupuesto = await PresupuestoModel.getPresupuestoById(id);

      if (!presupuesto) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Presupuesto no encontrado'
          }
        });
      }

      if (presupuesto.estado !== '1') {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Solo se pueden aprobar presupuestos en estado Enviado'
          }
        });
      }

      const success = await PresupuestoModel.updateEstado(id, '2');

      res.json({
        success: true,
        message: 'Presupuesto aprobado correctamente'
      });
    } catch (error) {
      console.error('Error al aprobar presupuesto:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Error al aprobar presupuesto',
          details: error.message
        }
      });
    }
  }

  /**
   * Rechazar presupuesto
   */
  static async rechazarPresupuesto(req, res) {
    try {
      const { id } = req.params;
      const { motivo } = req.body;

      if (!motivo) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Se requiere un motivo de rechazo'
          }
        });
      }

      const presupuesto = await PresupuestoModel.getPresupuestoById(id);

      if (!presupuesto) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Presupuesto no encontrado'
          }
        });
      }

      // Actualizar estado y agregar motivo
      await PresupuestoModel.updatePresupuesto(id, {
        estado: '3',
        observaciones: `[RECHAZADO] ${motivo}\n${presupuesto.observaciones || ''}`
      });

      res.json({
        success: true,
        message: 'Presupuesto rechazado correctamente'
      });
    } catch (error) {
      console.error('Error al rechazar presupuesto:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Error al rechazar presupuesto',
          details: error.message
        }
      });
    }
  }

  /**
   * Obtener presupuesto por ID
   */
  static async getPresupuestoById(req, res) {
    try {
      const { id } = req.params;
      const includeCliente = req.query.include === 'cliente';

      const presupuesto = await PresupuestoModel.getPresupuestoById(id);

      if (!presupuesto) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Presupuesto no encontrado'
          }
        });
      }

      if (includeCliente) {
        presupuesto.cliente = {
          id: presupuesto.cliente_id,
          nombre: presupuesto.cliente_nombre,
          cuil_cuit: presupuesto.cliente_cuit
        };
      }

      res.json({
        success: true,
        data: presupuesto
      });
    } catch (error) {
      console.error('Error al obtener presupuesto:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Error al obtener presupuesto',
          details: error.message
        }
      });
    }
  }
}

module.exports = PresupuestosController;
