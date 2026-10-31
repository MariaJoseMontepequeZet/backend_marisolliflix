const bcrypt = require('bcryptjs');

// Un usuario. El hash de la contraseña es privado: nunca sale en toJSON() y solo se usa
// desde dentro de la clase para comparar.
class User {
  #id;
  #username;
  #email;
  #role;
  #createdAt;
  #passwordHash;

  constructor({ id, username, email, role, createdAt, passwordHash }) {
    this.#id = id;
    this.#username = username;
    this.#email = email;
    this.#role = role;
    this.#createdAt = createdAt;
    this.#passwordHash = passwordHash;
  }

  static fromRow(fila) {
    return new User({
      id: fila.id,
      username: fila.username,
      email: fila.email,
      role: fila.role,
      createdAt: fila.created_at,
      passwordHash: fila.password,
    });
  }

  get id() { return this.#id; }
  get username() { return this.#username; }
  get email() { return this.#email; }
  get role() { return this.#role; }
  get createdAt() { return this.#createdAt; }

  get esAdmin() {
    return this.#role === 'admin';
  }

  // Compara una contraseña en texto plano con el hash guardado
  async passwordCoincide(passwordPlano) {
    if (!this.#passwordHash) return false;
    return bcrypt.compare(passwordPlano, this.#passwordHash);
  }

  // Lo que devuelve GET /auth/me (mismo formato de siempre, sin contraseña)
  toJSON() {
    return {
      id: this.#id,
      username: this.#username,
      email: this.#email,
      role: this.#role,
      created_at: this.#createdAt,
    };
  }
}

module.exports = User;
