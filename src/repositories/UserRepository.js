const RepositoryConId = require('./RepositoryConId');
const User = require('../models/entities/User');

class UserRepository extends RepositoryConId {
  constructor() {
    super('users');
  }

  hidratar(fila) {
    return User.fromRow(fila);
  }

  // Para autenticar con el token: no trae la contraseña
  async findById(id) {
    const [filas] = await this.ejecutor().query(
      'SELECT id, username, email, role, created_at FROM users WHERE id = ?',
      [id]
    );
    return filas.length ? this.hidratar(filas[0]) : null;
  }

  // Para iniciar sesion: trae el hash para poder compararlo
  async findByEmail(email) {
    const [filas] = await this.ejecutor().query('SELECT * FROM users WHERE email = ?', [email]);
    return filas.length ? this.hidratar(filas[0]) : null;
  }

  async existsByEmailOrUsername(email, username) {
    const [filas] = await this.ejecutor().query(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );
    return filas.length > 0;
  }

  // Crea un usuario con rol "user" y devuelve la entidad sin contraseña
  async create({ username, email, passwordHash }) {
    const [result] = await this.ejecutor().query(
      'INSERT INTO users (username, email, password, role, created_at) VALUES (?, ?, ?, ?, NOW())',
      [username, email, passwordHash, 'user']
    );
    return this.findById(result.insertId);
  }
}

module.exports = { UserRepository, userRepository: new UserRepository() };
