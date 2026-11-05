const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const { userRepository } = require('../repositories/UserRepository');
const env = require('./env');

// Registra en passport la estrategia JWT: valida el token y carga al usuario desde la base
class ConfiguradorPassport {
  #usuarios;

  constructor(usuarios = userRepository) {
    this.#usuarios = usuarios;
  }

  configurar(passport) {
    const opciones = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: env.JWT_SECRET,
      algorithms: ['HS256'],
    };
    passport.use(new JwtStrategy(opciones, (payload, done) => this.#buscarUsuario(payload, done)));
  }

  async #buscarUsuario(payload, done) {
    try {
      const usuario = await this.#usuarios.findById(payload.id);
      return done(null, usuario || false);
    } catch (error) {
      return done(error, false);
    }
  }
}

module.exports = ConfiguradorPassport;
