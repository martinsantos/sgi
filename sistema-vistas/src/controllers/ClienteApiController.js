const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * API Controller for Clients
 */
class ClienteApiController {
  /**
   * List clients with pagination and filters
   */
  static async getClientes(req, res) {
    try {
      const { page = 1, limit = 20, activo, q } = req.query;
      const offset = (page - 1) * limit;

      let sql = `
        SELECT c.*, 
          COALESCE(p.total_proyectos, 0) as total_proyectos,
          COALESCE(p.proyectos_activos, 0) as proyectos_activos
        FROM clientes c
        LEFT JOIN (
          SELECT 
            cliente_id,
            COUNT(*) as total_proyectos,
            SUM(CASE WHEN estado IN (1,2) THEN 1 ELSE 0 END) as proyectos_activos
          FROM proyectos 
          WHERE activo = 1
          GROUP BY cliente_id
        ) p ON p.cliente_id = c.id
        WHERE c.activo = 1
      `;

      const params = [];

      if (activo !== undefined) {
        sql += ' AND c.activo = ?';
        params.push(Number(activo));
      }

      if (q) {
        sql += ' AND (c.nombre LIKE ? OR c.codigo LIKE ? OR c.cuil_cuit LIKE ?)';
        const term = `%${q}%`;
        params.push(term, term, term);
      }

      // Get total count
      const [countResult] = await pool.execute(
        `SELECT COUNT(*) as total FROM (${sql}) as subquery`,
        params
      );

      // Get paginated results
      sql += ' ORDER BY c.nombre LIMIT ? OFFSET ?';
      params.push(Number(limit), offset);

      const [clientes] = await pool.execute(sql, params);

      res.json({
        success: true,
        data: clientes,
        pagination: {
          total: countResult[0].total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(countResult[0].total / limit)
        }
      });

    } catch (error) {
      logger.error('Error getting clients:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Error al obtener clientes',
          details: error.message
        }
      });
    }
  }

  /**
   * Get single client by ID
   */
  static async getCliente(req, res) {
    try {
      const { id } = req.params;

      const [rows] = await pool.execute(
        'SELECT * FROM clientes WHERE id = ? AND activo = 1',
        [id]
      );

      if (!rows.length) {
        return res.status(404).json({
          success: false,
          error: { message: 'Cliente no encontrado' }
        });
      }

      // Get additional info
      const [proyectos] = await pool.execute(
        'SELECT COUNT(*) as total FROM proyectos WHERE personal_id = ? AND activo = 1',
        [id]
      );

      const [presupuestos] = await pool.execute(
        'SELECT COUNT(*) as total FROM presupuestos WHERE cliente_id = ? AND activo = 1',
        [id]
      );

      res.json({
        success: true,
        data: {
          ...rows[0],
          total_proyectos: proyectos[0].total,
          total_presupuestos: presupuestos[0].total
        }
      });

    } catch (error) {
      logger.error('Error getting client:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Error al obtener cliente',
          details: error.message
        }
      });
    }
  }

  /**
   * Create new client
   */
  static async createCliente(req, res) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const {
        nombre,
        codigo,
        tipo_persona,
        cuil_cuit,
        telefono,
        email,
        direccion
      } = req.body;

      // Validate required fields
      if (!nombre || !codigo || !tipo_persona || !cuil_cuit) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Datos incompletos',
            details: ['nombre, codigo, tipo_persona y cuil_cuit son requeridos']
          }
        });
      }

      // Check if code exists
      const [existing] = await connection.execute(
        'SELECT id FROM clientes WHERE codigo = ? AND activo = 1',
        [codigo]
      );

      if (existing.length) {
        return res.status(409).json({
          success: false,
          error: {
            message: 'Ya existe un cliente con ese código'
          }
        });
      }

      // Create client
      const id = uuidv4();
      await connection.execute(
        `INSERT INTO clientes (
          id, nombre, codigo, tipo_persona, cuil_cuit,
          telefono, email, activo, created, modified
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
        [id, nombre, codigo, tipo_persona, cuil_cuit, telefono, email]
      );

      // Add address if provided
      if (direccion) {
        await connection.execute(
          `INSERT INTO direcciones (
            id, cliente_id, calle, numero, localidad,
            provincia, codigo_postal, created, modified
          ) VALUES (UUID(), ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            id,
            direccion.calle,
            direccion.numero,
            direccion.localidad,
            direccion.provincia,
            direccion.codigo_postal
          ]
        );
      }

      await connection.commit();

      res.status(201).json({
        success: true,
        data: {
          id,
          nombre,
          codigo,
          tipo_persona,
          cuil_cuit,
          telefono,
          email,
          direccion,
          activo: 1
        }
      });

    } catch (error) {
      await connection.rollback();
      logger.error('Error creating client:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Error al crear cliente',
          details: error.message
        }
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Update existing client
   */
  static async updateCliente(req, res) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const {
        nombre,
        codigo,
        tipo_persona,
        cuil_cuit,
        telefono,
        email,
        direccion,
        activo
      } = req.body;

      // Check if client exists
      const [existing] = await connection.execute(
        'SELECT id FROM clientes WHERE id = ? AND activo = 1',
        [id]
      );

      if (!existing.length) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Cliente no encontrado'
          }
        });
      }

      // Check if code exists (if changing)
      if (codigo) {
        const [codeExists] = await connection.execute(
          'SELECT id FROM clientes WHERE codigo = ? AND id != ? AND activo = 1',
          [codigo, id]
        );

        if (codeExists.length) {
          return res.status(409).json({
            success: false,
            error: {
              message: 'Ya existe un cliente con ese código'
            }
          });
        }
      }

      // Update client
      const updateFields = [];
      const updateParams = [];

      if (nombre) {
        updateFields.push('nombre = ?');
        updateParams.push(nombre);
      }
      if (codigo) {
        updateFields.push('codigo = ?');
        updateParams.push(codigo);
      }
      if (tipo_persona) {
        updateFields.push('tipo_persona = ?');
        updateParams.push(tipo_persona);
      }
      if (cuil_cuit) {
        updateFields.push('cuil_cuit = ?');
        updateParams.push(cuil_cuit);
      }
      if (telefono !== undefined) {
        updateFields.push('telefono = ?');
        updateParams.push(telefono);
      }
      if (email !== undefined) {
        updateFields.push('email = ?');
        updateParams.push(email);
      }
      if (activo !== undefined) {
        updateFields.push('activo = ?');
        updateParams.push(Number(activo));
      }

      updateFields.push('modified = NOW()');
      updateParams.push(id);

      await connection.execute(
        `UPDATE clientes SET ${updateFields.join(', ')} WHERE id = ?`,
        updateParams
      );

      // Update address if provided
      if (direccion) {
        await connection.execute(
          'DELETE FROM direcciones WHERE cliente_id = ?',
          [id]
        );

        await connection.execute(
          `INSERT INTO direcciones (
            id, cliente_id, calle, numero, localidad,
            provincia, codigo_postal, created, modified
          ) VALUES (UUID(), ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            id,
            direccion.calle,
            direccion.numero,
            direccion.localidad,
            direccion.provincia,
            direccion.codigo_postal
          ]
        );
      }

      await connection.commit();

      res.json({
        success: true,
        data: {
          id,
          ...req.body
        }
      });

    } catch (error) {
      await connection.rollback();
      logger.error('Error updating client:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Error al actualizar cliente',
          details: error.message
        }
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Delete client (soft delete)
   */
  static async deleteCliente(req, res) {
    try {
      const { id } = req.params;

      const [result] = await pool.execute(
        'UPDATE clientes SET activo = 0, modified = NOW() WHERE id = ? AND activo = 1',
        [id]
      );

      if (!result.affectedRows) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Cliente no encontrado'
          }
        });
      }

      res.json({
        success: true,
        data: { id }
      });

    } catch (error) {
      logger.error('Error deleting client:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Error al eliminar cliente',
          details: error.message
        }
      });
    }
  }
}

module.exports = {
  getClientes: ClienteApiController.getClientes,
  getCliente: ClienteApiController.getCliente,
  createCliente: ClienteApiController.createCliente,
  updateCliente: ClienteApiController.updateCliente,
  deleteCliente: ClienteApiController.deleteCliente
};
