const pool = require('../config/database');
const { AppError } = require('../utils/errors');
const { v4: uuidv4 } = require('uuid');

class FacturaController {
  static async getFacturasAPI(req, res, next) {
    try {
      let query = `
        SELECT 
          f.*,
          c.nombre as cliente_nombre,
          c.codigo as cliente_codigo,
          c.tipo_persona as cliente_tipo
        FROM facturas f
        LEFT JOIN clientes c ON c.id = f.cliente_id
        WHERE f.tipo = 'EMITIDA'
        ORDER BY f.fecha_emision DESC`;

      const [facturas] = await pool.query(query);

      res.json({
        success: true,
        data: facturas.map(f => ({
          ...f,
          total_formatted: `$ ${f.total.toLocaleString('es-AR', {minimumFractionDigits: 2})}`,
          fecha_emision_formatted: new Date(f.fecha_emision).toLocaleDateString('es-AR'),
          fecha_vencimiento_formatted: f.fecha_vencimiento ? new Date(f.fecha_vencimiento).toLocaleDateString('es-AR') : '',
          estado_badge: getEstadoBadge(f.estado)
        }))
      });
    } catch (error) {
      next(new AppError('Error al obtener facturas', 500));
    }
  }

  static async getDetalleFactura(req, res, next) {
    try {
      const { id } = req.params;

      // Obtener factura
      const [facturas] = await pool.query(`
        SELECT 
          f.*,
          c.nombre as cliente_nombre,
          c.codigo as cliente_codigo,
          c.tipo_persona as cliente_tipo,
          c.condicion_iva as cliente_condicion_iva
        FROM facturas f
        LEFT JOIN clientes c ON c.id = f.cliente_id
        WHERE f.id = ?`,
        [id]
      );

      if (facturas.length === 0) {
        return next(new AppError('Factura no encontrada', 404));
      }

      const factura = facturas[0];

      // Obtener items
      const [items] = await pool.query(
        'SELECT * FROM facturas_items WHERE factura_id = ?',
        [id]
      );

      res.json({
        success: true,
        data: {
          ...factura,
          items,
          total_formatted: `$ ${factura.total.toLocaleString('es-AR', {minimumFractionDigits: 2})}`,
          fecha_emision_formatted: new Date(factura.fecha_emision).toLocaleDateString('es-AR'),
          fecha_vencimiento_formatted: factura.fecha_vencimiento ? new Date(factura.fecha_vencimiento).toLocaleDateString('es-AR') : '',
          estado_badge: getEstadoBadge(factura.estado)
        }
      });
    } catch (error) {
      next(new AppError('Error al obtener detalle de factura', 500));
    }
  }

  static async crearFactura(req, res, next) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const {
        cliente_id,
        tipo_factura,
        fecha_vencimiento,
        items
      } = req.body;

      // Validar cliente
      const [clientes] = await connection.query(
        'SELECT id, condicion_iva FROM clientes WHERE id = ? AND activo = 1',
        [cliente_id]
      );

      if (clientes.length === 0) {
        throw new AppError('Cliente no encontrado o inactivo', 400);
      }

      // Validar tipo de factura según condición de IVA
      if (!esFacturaValidaParaCondicionIva(tipo_factura, clientes[0].condicion_iva)) {
        throw new AppError('Tipo de factura no válido para la condición de IVA del cliente', 400);
      }

      // Obtener próximo número
      const [ultimaFactura] = await connection.query(
        'SELECT MAX(numero_factura) as ultimo FROM facturas WHERE tipo_factura = ?',
        [tipo_factura]
      );

      const numeroFactura = (ultimaFactura[0].ultimo || 0) + 1;

      // Crear factura
      const id = uuidv4();
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

      await connection.query(`
        INSERT INTO facturas (
          id, cliente_id, tipo, tipo_factura, numero_factura,
          fecha_emision, fecha_vencimiento, estado,
          created, modified
        ) VALUES (?, ?, 'EMITIDA', ?, ?, ?, ?, 1, ?, ?)`,
        [id, cliente_id, tipo_factura, numeroFactura, now,
         fecha_vencimiento, now, now]
      );

      // Insertar items
      let subtotal = 0;
      let iva_total = 0;

      for (const item of items) {
        const itemId = uuidv4();
        const itemSubtotal = item.cantidad * item.precio_unitario;
        const itemIva = itemSubtotal * (item.iva / 100);

        subtotal += itemSubtotal;
        iva_total += itemIva;

        await connection.query(`
          INSERT INTO facturas_items (
            id, factura_id, descripcion, cantidad,
            precio_unitario, iva, subtotal
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [itemId, id, item.descripcion, item.cantidad,
           item.precio_unitario, item.iva, itemSubtotal]
        );
      }

      // Actualizar totales
      const total = subtotal + iva_total;
      await connection.query(
        'UPDATE facturas SET subtotal = ?, iva_total = ?, total = ? WHERE id = ?',
        [subtotal, iva_total, total, id]
      );

      await connection.commit();

      // Obtener factura creada
      const [factura] = await connection.query(`
        SELECT 
          f.*,
          c.nombre as cliente_nombre
        FROM facturas f
        LEFT JOIN clientes c ON c.id = f.cliente_id
        WHERE f.id = ?`,
        [id]
      );

      res.status(201).json({
        success: true,
        data: {
          ...factura[0],
          items,
          total_formatted: `$ ${total.toLocaleString('es-AR', {minimumFractionDigits: 2})}`,
          estado_badge: getEstadoBadge(1)
        }
      });

    } catch (error) {
      await connection.rollback();
      next(error instanceof AppError ? error : new AppError('Error al crear factura', 500));
    } finally {
      connection.release();
    }
  }

  static async anularFactura(req, res, next) {
    try {
      const { id } = req.params;
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

      // Verificar factura
      const [facturas] = await pool.query(
        'SELECT estado FROM facturas WHERE id = ?',
        [id]
      );

      if (facturas.length === 0) {
        return next(new AppError('Factura no encontrada', 404));
      }

      if (facturas[0].estado === 4) {
        return next(new AppError('La factura ya está anulada', 400));
      }

      // Anular factura
      await pool.query(
        'UPDATE facturas SET estado = 4, modified = ? WHERE id = ?',
        [now, id]
      );

      res.json({
        success: true,
        message: 'Factura anulada correctamente'
      });
    } catch (error) {
      next(new AppError('Error al anular factura', 500));
    }
  }
}

// Helpers
function getEstadoBadge(estado) {
  const estados = {
    1: ['Pendiente', 'warning'],
    2: ['Pagada', 'success'],
    3: ['Vencida', 'danger'],
    4: ['Anulada', 'secondary']
  };

  const [texto, color] = estados[estado] || ['Desconocido', 'light'];
  return `<span class="badge bg-${color}">${texto}</span>`;
}

function esFacturaValidaParaCondicionIva(tipoFactura, condicionIva) {
  // Mapeo de condiciones de IVA a tipos de factura permitidos
  const facturasPermitidas = {
    1: ['A'], // Responsable Inscripto
    2: ['B'], // Monotributo
    3: ['C'], // Exento
    4: ['B'], // Consumidor Final
    5: ['E']  // Exterior
  };

  return facturasPermitidas[condicionIva]?.includes(tipoFactura) || false;
}

module.exports = FacturaController;
