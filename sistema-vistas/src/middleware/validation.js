const Joi = require('joi');

/**
 * Middleware para validación de esquemas Joi
 */
const validateSchema = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const details = error.details.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));

      return res.status(400).json({
        success: false,
        error: {
          message: 'Error de validación',
          details
        }
      });
    }

    next();
  };
};

// Esquemas de validación comunes
const schemas = {
  // Cliente
  createCliente: Joi.object({
    nombre: Joi.string().required().trim().min(3).max(100),
    codigo: Joi.string().required().trim().min(3).max(20),
    tipo_persona: Joi.string().required().valid('F', 'J'),
    cuil_cuit: Joi.string().required().pattern(/^[0-9]{11}$/),
    telefono: Joi.string().allow('').trim().max(20),
    email: Joi.string().email().allow('').trim().max(100),
    activo: Joi.number().valid(0, 1).default(1)
  }),

  updateCliente: Joi.object({
    nombre: Joi.string().trim().min(3).max(100),
    codigo: Joi.string().trim().min(3).max(20),
    tipo_persona: Joi.string().valid('F', 'J'),
    cuil_cuit: Joi.string().pattern(/^[0-9]{11}$/),
    telefono: Joi.string().allow('').trim().max(20),
    email: Joi.string().email().allow('').trim().max(100),
    activo: Joi.number().valid(0, 1)
  }).min(1),

  // Presupuesto
  createPresupuesto: Joi.object({
    cliente_id: Joi.string().required().uuid(),
    descripcion: Joi.string().required().trim().min(3).max(200),
    fecha_validez: Joi.date().iso().greater('now'),
    observaciones: Joi.string().allow('').trim().max(500),
    items: Joi.array().required().min(1).max(50).items(
      Joi.object({
        descripcion: Joi.string().required().trim().min(3).max(200),
        cantidad: Joi.number().required().positive(),
        precio_unitario: Joi.number().required().min(0),
        iva: Joi.number().default(21),
        orden: Joi.number().min(0).default(0)
      })
    )
  }),

  rechazarPresupuesto: Joi.object({
    motivo: Joi.string().required().trim().min(3).max(200)
  }),

  // Factura
  createFactura: Joi.object({
    cliente_id: Joi.string().required().uuid(),
    tipo_factura: Joi.string().required().valid('A', 'B', 'C', 'M'),
    fecha_vencimiento: Joi.date().iso().min('now'),
    items: Joi.array().required().min(1).max(50).items(
      Joi.object({
        descripcion: Joi.string().required().trim().min(3).max(200),
        cantidad: Joi.number().required().positive(),
        precio_unitario: Joi.number().required().min(0),
        iva: Joi.number().default(21)
      })
    )
  })
};

module.exports = {
  validateSchema,
  schemas
};
