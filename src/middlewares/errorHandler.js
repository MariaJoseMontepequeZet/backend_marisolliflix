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

  // Cuerpo mas grande que el limite de express.json (100 KB)
  if (err.type === 'entity.too.large') {
    error = new AppError('El cuerpo de la peticion es demasiado grande', 413);
  } else if (err.expose && err.statusCode >= 400 && err.statusCode < 500 && !(err instanceof AppError)) {
    // Otros errores del lector del body (charset o encoding no soportados, etc.)
    error = new AppError('No se pudo leer el cuerpo de la peticion', err.statusCode);
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
