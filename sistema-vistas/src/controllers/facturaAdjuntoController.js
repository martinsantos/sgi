const FacturaAdjuntoModel = require('../models/FacturaAdjuntoModel');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class FacturaAdjuntoController {
  /**
   * Subir un adjunto a una factura
   */
  static async subirAdjunto(req, res) {
    try {
      const { facturaVentaId, facturaCompraId, descripcion } = req.body;
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No se proporcionó archivo'
        });
      }

      if (!facturaVentaId && !facturaCompraId) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere ID de factura venta o compra'
        });
      }

      // Crear directorio si no existe
      const uploadDir = path.join(__dirname, '../uploads/facturas');
      await fs.mkdir(uploadDir, { recursive: true });

      // Generar nombre único
      const nombreUnico = `${uuidv4()}-${Date.now()}${path.extname(req.file.originalname)}`;
      const rutaArchivo = path.join(uploadDir, nombreUnico);

      // Guardar archivo
      await fs.writeFile(rutaArchivo, req.file.buffer);

      // Registrar en BD
      const adjuntoId = await FacturaAdjuntoModel.crearAdjunto({
        facturaVentaId: facturaVentaId || null,
        facturaCompraId: facturaCompraId || null,
        nombreArchivo: req.file.originalname,
        rutaArchivo: `/uploads/facturas/${nombreUnico}`,
        tipoArchivo: req.file.mimetype,
        tamanoBytesArchivo: req.file.size,
        descripcion: descripcion || null,
        subidoPor: req.user?.id || null
      });

      console.log(`✅ Adjunto subido: ${nombreUnico} (ID: ${adjuntoId})`);

      res.json({
        success: true,
        message: 'Archivo subido correctamente',
        adjuntoId: adjuntoId,
        archivo: {
          nombre: req.file.originalname,
          tamaño: req.file.size,
          tipo: req.file.mimetype
        }
      });

    } catch (error) {
      console.error('❌ Error al subir adjunto:', error);
      res.status(500).json({
        success: false,
        message: 'Error al subir el archivo',
        error: error.message
      });
    }
  }

  /**
   * Descargar un adjunto
   */
  static async descargarAdjunto(req, res) {
    try {
      const { adjuntoId } = req.params;

      const adjunto = await FacturaAdjuntoModel.getAdjuntoById(adjuntoId);

      if (!adjunto) {
        return res.status(404).json({
          success: false,
          message: 'Adjunto no encontrado'
        });
      }

      // Registrar descarga
      await FacturaAdjuntoModel.registrarDescarga(
        adjuntoId,
        req.user?.id || null,
        req.ip
      );

      // Enviar archivo
      const rutaCompleta = path.join(__dirname, '..', adjunto.ruta_archivo);
      res.download(rutaCompleta, adjunto.nombre_archivo);

    } catch (error) {
      console.error('❌ Error al descargar adjunto:', error);
      res.status(500).json({
        success: false,
        message: 'Error al descargar el archivo',
        error: error.message
      });
    }
  }

  /**
   * Obtener adjuntos de una factura venta
   */
  static async getAdjuntosFacturaVenta(req, res) {
    try {
      const { facturaVentaId } = req.params;

      const adjuntos = await FacturaAdjuntoModel.getAdjuntosFacturaVenta(facturaVentaId);

      res.json({
        success: true,
        adjuntos: adjuntos
      });

    } catch (error) {
      console.error('❌ Error al obtener adjuntos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener adjuntos',
        error: error.message
      });
    }
  }

  /**
   * Obtener adjuntos de una factura compra
   */
  static async getAdjuntosFacturaCompra(req, res) {
    try {
      const { facturaCompraId } = req.params;

      const adjuntos = await FacturaAdjuntoModel.getAdjuntosFacturaCompra(facturaCompraId);

      res.json({
        success: true,
        adjuntos: adjuntos
      });

    } catch (error) {
      console.error('❌ Error al obtener adjuntos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener adjuntos',
        error: error.message
      });
    }
  }

  /**
   * Eliminar un adjunto
   */
  static async eliminarAdjunto(req, res) {
    try {
      const { adjuntoId } = req.params;

      const adjunto = await FacturaAdjuntoModel.getAdjuntoById(adjuntoId);

      if (!adjunto) {
        return res.status(404).json({
          success: false,
          message: 'Adjunto no encontrado'
        });
      }

      // Eliminar archivo del filesystem
      try {
        const rutaCompleta = path.join(__dirname, '..', adjunto.ruta_archivo);
        await fs.unlink(rutaCompleta);
      } catch (fsError) {
        console.warn('Advertencia: No se pudo eliminar archivo del filesystem:', fsError.message);
      }

      // Marcar como inactivo en BD
      await FacturaAdjuntoModel.eliminarAdjunto(adjuntoId);

      console.log(`✅ Adjunto eliminado: ${adjuntoId}`);

      res.json({
        success: true,
        message: 'Adjunto eliminado correctamente'
      });

    } catch (error) {
      console.error('❌ Error al eliminar adjunto:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar el adjunto',
        error: error.message
      });
    }
  }

  /**
   * Actualizar descripción de un adjunto
   */
  static async actualizarDescripcion(req, res) {
    try {
      const { adjuntoId } = req.params;
      const { descripcion } = req.body;

      const adjunto = await FacturaAdjuntoModel.getAdjuntoById(adjuntoId);

      if (!adjunto) {
        return res.status(404).json({
          success: false,
          message: 'Adjunto no encontrado'
        });
      }

      await FacturaAdjuntoModel.actualizarDescripcion(adjuntoId, descripcion);

      res.json({
        success: true,
        message: 'Descripción actualizada correctamente'
      });

    } catch (error) {
      console.error('❌ Error al actualizar descripción:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar la descripción',
        error: error.message
      });
    }
  }

  /**
   * Obtener estadísticas de adjuntos
   */
  static async getEstadisticas(req, res) {
    try {
      const stats = await FacturaAdjuntoModel.getEstadisticas();

      res.json({
        success: true,
        estadisticas: stats
      });

    } catch (error) {
      console.error('❌ Error al obtener estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: error.message
      });
    }
  }
}

module.exports = FacturaAdjuntoController;
