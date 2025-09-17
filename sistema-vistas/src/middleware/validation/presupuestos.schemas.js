const Joi = require('joi');

const schemas = {
  createPresupuesto: Joi.object({
    cliente_id: Joi.string().uuid().required(),
    descripcion: Joi.string().trim().allow(''),
    items: Joi.array().items(
      Joi.object({
        descripcion: Joi.string().trim().required(),
        cantidad: Joi.number().positive().required(),
        precio_unitario: Joi.number().positive().required()
      })
    ).min(1).required(),
    fecha_validez: Joi.date().iso().greater('now'),
    observaciones: Joi.string().trim().allow('')
  }),

  rechazarPresupuesto: Joi.object({
    motivo: Joi.string().trim().min(3).required()
  })
};

module.exports = schemas;
