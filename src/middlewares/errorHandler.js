const AppError = require('../utils/AppError');

// Manejador centralizado de errores. Siempre responde con el mismo formato:
// { status: 'error', message, errors? }
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let error = err;

  // JSON mal formado en el body
  if (err.type === 'entity.parse.failed') {
    error = new AppError('El cuerpo de la peticion no es un JSON valido', 400);
  }

  // Cualquier error que no sea nuestro se trata como 500 y no se muestra el detalle
  if (!(error instanceof AppError)) {
    console.error(err);
    error = new AppError('Error interno del servidor', 500);
  }

  const respuesta = { status: 'error', message: error.message };
  if (error.errors) {
    respuesta.errors = error.errors;
  }

  res.status(error.statusCode).json(respuesta);
}

module.exports = errorHandler;
