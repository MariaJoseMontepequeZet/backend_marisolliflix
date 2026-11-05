const AppError = require('../utils/AppError');

// Manejador centralizado de errores. Siempre responde con el mismo formato:
// { status: 'error', message, errors? }
class ManejadorErrores {
  // Express lo reconoce como manejador de errores por tener 4 parametros
  // eslint-disable-next-line no-unused-vars
  manejar(err, req, res, next) {
    const error = this.#aAppError(err);

    const respuesta = { status: 'error', message: error.message };
    if (error.errors) {
      respuesta.errors = error.errors;
    }
    res.status(error.statusCode).json(respuesta);
  }

  // Convierte cualquier error en un AppError con el codigo HTTP que corresponde
  #aAppError(err) {
    // JSON mal formado en el body
    if (err.type === 'entity.parse.failed') {
      return new AppError('El cuerpo de la peticion no es un JSON valido', 400);
    }
    // Cuerpo mas grande que el limite de express.json (100 KB)
    if (err.type === 'entity.too.large') {
      return new AppError('El cuerpo de la peticion es demasiado grande', 413);
    }
    // Otros errores del lector del body (charset o encoding no soportados, etc.)
    if (err.expose && err.statusCode >= 400 && err.statusCode < 500 && !(err instanceof AppError)) {
      return new AppError('No se pudo leer el cuerpo de la peticion', err.statusCode);
    }
    if (err instanceof AppError) return err;

    // Cualquier otro error se trata como 500 y no se muestra el detalle
    console.error(err);
    return new AppError('Error interno del servidor', 500);
  }
}

const manejador = new ManejadorErrores();

module.exports = manejador.manejar.bind(manejador);
module.exports.ManejadorErrores = ManejadorErrores;
