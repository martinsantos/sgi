const pool = require('../config/database');
const { AppError } = require('../middleware/error-handler');
const { v4: uuidv4 } = require('uuid');

class ClienteController {
  static async getClientesAPI(req, res, next) {
    try {
      let query = `
        SELECT 
          c.*,
          COALESCE(COUNT(DISTINCT f.id), 0) as total_facturas,
          COALESCE(SUM(f.total), 0) as total_facturado,
          COALESCE(SUM(CASE WHEN f.estado = 1 THEN f.total ELSE 0 END), 0) as total_pendiente,
          COUNT(DISTINCT CASE WHEN f.estado = 1 THEN f.id END) as facturas_pendientes,
          MAX(f.fecha_emision) as fecha_ult_factura
        FROM clientes c
        LEFT JOIN facturas f ON f.cliente_id = c.id
        WHERE c.activo = 1
        GROUP BY c.id
        ORDER BY c.nombre ASC`;

      const [clientes] = await pool.query(query);

      res.json({
        success: true,
        data: clientes.map(cliente => ({
          ...cliente,
          total_facturado_formatted: `$ ${cliente.total_facturado.toLocaleString('es-AR', {minimumFractionDigits: 2})}`,
          total_pendiente_formatted: `$ ${cliente.total_pendiente.toLocaleString('es-AR', {minimumFractionDigits: 2})}`,
          fecha_ult_factura_formatted: cliente.fecha_ult_factura ? new Date(cliente.fecha_ult_factura).toLocaleDateString('es-AR') : '',
          estado_badge: cliente.activo ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-danger">Inactivo</span>'
        }))
      });
    } catch (error) {
      next(new AppError('Error al obtener clientes', 500));
    }
  }

  static async createCliente(req, res, next) {
    try {
      const { 
        nombre, codigo, tipo_persona, cuil_cuit, 
        contacto_principal, email, telefono,
        condicion_iva, tipo_cliente 
      } = req.body;

      const id = uuidv4();
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

      const [result] = await pool.query(
        `INSERT INTO clientes (
          id, nombre, codigo, tipo_persona, cuil_cuit,
          contacto_principal, email, telefono,
          condicion_iva, tipo_cliente,
          created, modified, activo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [id, nombre, codigo, tipo_persona, cuil_cuit, 
         contacto_principal, email, telefono,
         condicion_iva, tipo_cliente,
         now, now]
      );

      const [cliente] = await pool.query(
        'SELECT * FROM clientes WHERE id = ?',
        [id]
      );

      res.status(201).json({
        success: true,
        data: cliente[0]
      });
    } catch (error) {
      next(new AppError('Error al crear cliente', 500));
    }
  }

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
        .reduce((obj, key) => {
          obj[key] = updates[key];
          return obj;
        }, {});

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
      next(new AppError('Error al actualizar cliente', 500));
    }
  }

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

      // Estadísticas de facturación
      const [stats] = await pool.query(`
        SELECT
          COUNT(DISTINCT id) as facturas_totales,
          COALESCE(SUM(total), 0) as monto_facturado,
          COALESCE(SUM(CASE WHEN estado = 1 THEN total ELSE 0 END), 0) as monto_pendiente,
          COUNT(DISTINCT CASE WHEN estado = 1 THEN id END) as facturas_pendientes,
          MAX(fecha_emision) as ultima_factura
        FROM facturas
        WHERE cliente_id = ?`,
        [id]
      );

      // Últimas facturas
      const [facturas] = await pool.query(`
        SELECT id, numero_factura, fecha_emision, total, estado
        FROM facturas
        WHERE cliente_id = ?
        ORDER BY fecha_emision DESC
        LIMIT 5`,
        [id]
      );

      res.json({
        success: true,
        data: {
          ...cliente[0],
          stats: stats[0],
          ultimas_facturas: facturas
        }
      });
    } catch (error) {
      next(new AppError('Error al obtener detalle del cliente', 500));
    }
  }
}

module.exports = ClienteController;
