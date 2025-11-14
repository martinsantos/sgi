const pool = require('../config/database');
const fs = require('fs').promises;
const path = require('path');

class FacturaAdjuntoModel {
  /**
   * Obtiene todos los adjuntos de una factura emitida
   */
  static async getAdjuntosFacturaVenta(facturaVentaId) {
    try {
      const [adjuntos] = await pool.query(`
        SELECT 
          id,
          nombre_archivo,
          ruta_archivo,
          tipo_archivo,
          tamaño_bytes,
          descripcion,
          fecha_subida,
          subido_por
        FROM factura_adjuntos
        WHERE factura_venta_id = ? AND activo = 1
        ORDER BY fecha_subida DESC
      `, [facturaVentaId]);
      
      return adjuntos || [];
    } catch (error) {
      console.error('Error al obtener adjuntos de factura venta:', error);
      return [];
    }
  }

  /**
   * Obtiene todos los adjuntos de una factura recibida
   */
  static async getAdjuntosFacturaCompra(facturaCompraId) {
    try {
      const [adjuntos] = await pool.query(`
        SELECT 
          id,
          nombre_archivo,
          ruta_archivo,
          tipo_archivo,
          tamaño_bytes,
          descripcion,
          fecha_subida,
          subido_por
        FROM factura_adjuntos
        WHERE factura_compra_id = ? AND activo = 1
        ORDER BY fecha_subida DESC
      `, [facturaCompraId]);
      
      return adjuntos || [];
    } catch (error) {
      console.error('Error al obtener adjuntos de factura compra:', error);
      return [];
    }
  }

  /**
   * Crea un nuevo adjunto
   */
  static async crearAdjunto(datos) {
    try {
      const {
        facturaVentaId,
        facturaCompraId,
        nombreArchivo,
        rutaArchivo,
        tipoArchivo,
        tamanoBytesArchivo,
        descripcion,
        subidoPor
      } = datos;

      const [result] = await pool.query(`
        INSERT INTO factura_adjuntos (
          factura_venta_id,
          factura_compra_id,
          nombre_archivo,
          ruta_archivo,
          tipo_archivo,
          tamaño_bytes,
          descripcion,
          subido_por
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        facturaVentaId || null,
        facturaCompraId || null,
        nombreArchivo,
        rutaArchivo,
        tipoArchivo,
        tamanoBytesArchivo,
        descripcion || null,
        subidoPor || null
      ]);

      return result.insertId;
    } catch (error) {
      console.error('Error al crear adjunto:', error);
      throw error;
    }
  }

  /**
   * Obtiene un adjunto por ID
   */
  static async getAdjuntoById(adjuntoId) {
    try {
      const [adjuntos] = await pool.query(`
        SELECT *
        FROM factura_adjuntos
        WHERE id = ? AND activo = 1
      `, [adjuntoId]);

      return adjuntos[0] || null;
    } catch (error) {
      console.error('Error al obtener adjunto:', error);
      return null;
    }
  }

  /**
   * Elimina un adjunto (soft delete)
   */
  static async eliminarAdjunto(adjuntoId) {
    try {
      const [result] = await pool.query(`
        UPDATE factura_adjuntos
        SET activo = 0
        WHERE id = ?
      `, [adjuntoId]);

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error al eliminar adjunto:', error);
      throw error;
    }
  }

  /**
   * Actualiza la descripción de un adjunto
   */
  static async actualizarDescripcion(adjuntoId, descripcion) {
    try {
      const [result] = await pool.query(`
        UPDATE factura_adjuntos
        SET descripcion = ?
        WHERE id = ?
      `, [descripcion, adjuntoId]);

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error al actualizar descripción:', error);
      throw error;
    }
  }

  /**
   * Registra una descarga de adjunto
   */
  static async registrarDescarga(adjuntoId, usuarioId, ipAddress) {
    try {
      await pool.query(`
        INSERT INTO factura_adjuntos_descargas (
          adjunto_id,
          usuario_id,
          ip_address
        ) VALUES (?, ?, ?)
      `, [adjuntoId, usuarioId || null, ipAddress]);
    } catch (error) {
      console.error('Error al registrar descarga:', error);
    }
  }

  /**
   * Obtiene estadísticas de adjuntos
   */
  static async getEstadisticas() {
    try {
      const [stats] = await pool.query(`
        SELECT 
          COUNT(*) as total_adjuntos,
          COUNT(DISTINCT factura_venta_id) as facturas_venta_con_adjuntos,
          COUNT(DISTINCT factura_compra_id) as facturas_compra_con_adjuntos,
          SUM(tamaño_bytes) as tamaño_total_bytes,
          AVG(tamaño_bytes) as tamaño_promedio_bytes
        FROM factura_adjuntos
        WHERE activo = 1
      `);

      return stats[0] || {};
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      return {};
    }
  }
}

module.exports = FacturaAdjuntoModel;
