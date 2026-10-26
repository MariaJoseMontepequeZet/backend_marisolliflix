const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

// Se pone despues de las reglas de express-validator en cada ruta.
// Si hay errores responde 422 con la lista de campos invalidos.
function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) {
    return next();
  }

  const errors = result.array().map((e) => ({
    field: e.path,
    message: e.msg,
  }));
  return next(new AppError('Datos invalidos', 422, errors));
}

module.exports = validate;
