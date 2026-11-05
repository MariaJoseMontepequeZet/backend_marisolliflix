const passport = require('passport');
const AppError = require('../utils/AppError');

// Middlewares de autenticacion y permisos. Envuelve passport-jwt para que los errores
// salgan con el formato del errorHandler (por defecto passport responde texto plano).
class Autenticacion {
  // Exige un token valido y deja el usuario en req.user
  authenticate(req, res, next) {
    passport.authenticate('jwt', { session: false }, (err, user) => {
      if (err) return next(err);
      if (!user) return next(new AppError('Token invalido o ausente', 401));
      req.user = user;
      return next();
    })(req, res, next);
  }

  // Igual que authenticate, pero sin token deja pasar como visitante (req.user undefined)
  optionalAuthenticate(req, res, next) {
    if (!req.headers.authorization) return next();
    return this.authenticate(req, res, next);
  }

  // Se pone despues de authenticate: solo deja pasar a los roles indicados
  authorize(...roles) {
    return (req, res, next) => {
      if (!roles.includes(req.user.role)) {
        return next(new AppError('No tienes permisos para esta accion', 403));
      }
      return next();
    };
  }
}

const autenticacion = new Autenticacion();

// Se exportan ya enlazadas a la instancia para usarlas directo en las rutas
module.exports = {
  Autenticacion,
  authenticate: autenticacion.authenticate.bind(autenticacion),
  optionalAuthenticate: autenticacion.optionalAuthenticate.bind(autenticacion),
  authorize: autenticacion.authorize.bind(autenticacion),
};
