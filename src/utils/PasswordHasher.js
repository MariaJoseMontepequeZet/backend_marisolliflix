const bcrypt = require('bcryptjs');

// Unico lugar donde se encripta una contraseña (registro, admin y seeds usan el mismo costo)
class PasswordHasher {
  static #COSTO = 10;

  static hash(passwordPlano) {
    return bcrypt.hash(passwordPlano, PasswordHasher.#COSTO);
  }
}

module.exports = PasswordHasher;
