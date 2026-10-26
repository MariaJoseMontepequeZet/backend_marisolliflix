const passport = require('passport');
const AppError = require('../utils/AppError');

// Envuelve passport-jwt para que el 401 salga con el formato del errorHandler
// (por defecto passport responde "Unauthorized" en texto plano).
function authenticate(req, res, next) {
  passport.authenticate('jwt', { session: false }, (err, user) => {
    if (err) return next(err);
    if (!user) return next(new AppError('Token invalido o ausente', 401));
    req.user = user;
    next();
  })(req, res, next);
}

// Igual que authenticate, pero sin token deja pasar como visitante (req.user undefined)
function optionalAuthenticate(req, res, next) {
  if (!req.headers.authorization) return next();
  return authenticate(req, res, next);
}

// Se pone despues de authenticate: solo deja pasar a los roles indicados
function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('No tienes permisos para esta accion', 403));
    }
    next();
  };
}

module.exports = { authenticate, optionalAuthenticate, authorize };
