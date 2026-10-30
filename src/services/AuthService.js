const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { userRepository } = require('../repositories/UserRepository');
const AppError = require('../utils/AppError');
const env = require('../config/env');

const MENSAJE_YA_REGISTRADO = 'El email o username ya se encuentra registrado';

// Reglas de la autenticacion: registrar, iniciar sesion y firmar el token.
// El repositorio se recibe por el constructor, asi se puede cambiar (por ejemplo en pruebas).
class AuthService {
  #usuarios;

  constructor(usuarios = userRepository) {
    this.#usuarios = usuarios;
  }

  async registrar({ username, email, password }) {
    if (await this.#usuarios.existsByEmailOrUsername(email, username)) {
      throw new AppError(MENSAJE_YA_REGISTRADO, 409);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    try {
      return await this.#usuarios.create({ username, email, passwordHash });
    } catch (error) {
      // Dos registros simultaneos pueden pasar la comprobacion; el indice unico los frena
      if (error.code === 'ER_DUP_ENTRY') throw new AppError(MENSAJE_YA_REGISTRADO, 409);
      throw error;
    }
  }

  // Devuelve { token, usuario }; el mensaje de error es el mismo si falla el email o la contraseña
  async iniciarSesion({ email, password }) {
    const usuario = await this.#usuarios.findByEmail(email);
    if (!usuario || !(await usuario.passwordCoincide(password))) {
      throw new AppError('Credenciales inválidas', 401);
    }
    return { token: this.#firmarToken(usuario), usuario };
  }

  #firmarToken(usuario) {
    return jwt.sign(
      { id: usuario.id, role: usuario.role },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES || '8h' }
    );
  }
}

module.exports = { AuthService, authService: new AuthService() };
