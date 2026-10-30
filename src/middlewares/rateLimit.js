const rateLimit = require('express-rate-limit');
const AppError = require('../utils/AppError');

// Manda el error al errorHandler para que la respuesta tenga el mismo formato
function handler(req, res, next, options) {
  next(new AppError(options.message, options.statusCode));
}

// Limite general para todo el API: 100 peticiones cada 3 minutos por IP
const globalLimiter = rateLimit({
  windowMs: 3 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: 'Demasiadas peticiones, intenta de nuevo en unos minutos',
  handler,
});

// Limite mas estricto para el login: 5 intentos cada 15 minutos por IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true, // solo cuentan los intentos fallidos
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: 'Demasiados intentos de inicio de sesion, intenta de nuevo en 15 minutos',
  handler,
});

module.exports = { globalLimiter, loginLimiter };
