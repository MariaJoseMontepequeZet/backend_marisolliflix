const { body, validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

// Middleware de Majo para procesar errores de express-validator
function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) {
    return next();
  }

  const errors = result.array().map((e) => ({
    field: e.path,
    message: e.msg,
  }));
  return next(new AppError('Datos inválidos', 422, errors));
}

// Reglas de validación para la HU-01 (Registro)
const registerValidation = [
  body('username').notEmpty().withMessage('El username es requerido'),
  body('email').isEmail().withMessage('Debe ser un email válido'),
  body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
  validate
];

module.exports = {
  validate,
  registerValidation
};
