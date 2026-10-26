const AppError = require('../utils/AppError');

// Se ejecuta cuando ninguna ruta coincide
function notFound(req, res, next) {
  next(new AppError(`Ruta ${req.method} ${req.originalUrl} no encontrada`, 404));
}

module.exports = notFound;
