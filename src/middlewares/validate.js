const { body, validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

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

// Reglas de validación para registro
const registerValidation = [
  body('username').trim().notEmpty().withMessage('El username es requerido')
    .isLength({ max: 50 }).withMessage('El username no puede pasar de 50 caracteres'),
  body('email').isEmail().withMessage('Debe ser un email válido')
    .isLength({ max: 255 }).withMessage('El email no puede pasar de 255 caracteres')
    .normalizeEmail(),
  // bcrypt solo usa los primeros 72 bytes, mas alla no suma seguridad
  body('password').isLength({ min: 8, max: 72 }).withMessage('La contraseña debe tener entre 8 y 72 caracteres'),
  validate
];

// Reglas de validación para login (soluciona el error 500 si mandan campos vacíos)
const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Debe ser un email válido'),
  body('password').notEmpty().withMessage('La contraseña es requerida'),
  validate
];

// Mantenemos validate como export por defecto/principal para no romper tests anteriores
validate.registerValidation = registerValidation;
validate.loginValidation = loginValidation;

module.exports = validate;