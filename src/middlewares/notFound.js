const AppError = require('../utils/AppError');

// Responde 404 cuando ninguna ruta coincide
class RutaNoEncontrada {
  manejar(req, res, next) {
    next(new AppError(`Ruta ${req.method} ${req.originalUrl} no encontrada`, 404));
  }
}

const manejador = new RutaNoEncontrada();

module.exports = manejador.manejar.bind(manejador);
module.exports.RutaNoEncontrada = RutaNoEncontrada;
