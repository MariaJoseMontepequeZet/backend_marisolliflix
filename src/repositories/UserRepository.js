const RepositoryConId = require('./RepositoryConId');
const User = require('../models/entities/User');

// Campo recibido -> columna de la tabla (solo estos se pueden editar)
const COLUMNAS = { username: 'username', email: 'email', passwordHash: 'password', role: 'role' };

// Columnas sin la contraseña, para todo lo que no sea iniciar sesion
const SIN_PASSWORD = 'id, username, email, role, created_at';

// Escapa % y _ para que la busqueda los tome como texto normal
const escaparLike = (texto) => texto.replace(/[\\%_]/g, '\\$&');

class UserRepository extends RepositoryConId {
  constructor() {
    super('users');
  }

  hidratar(fila) {
    return User.fromRow(fila);
  }

  // Para autenticar con el token: no trae la contraseña
  async findById(id, conexion) {
    const [filas] = await this.ejecutor(conexion).query(`SELECT ${SIN_PASSWORD} FROM users WHERE id = ?`, [id]);
    return filas.length ? this.hidratar(filas[0]) : null;
  }

  // Para iniciar sesion: trae el hash para poder compararlo
  async findByEmail(email) {
    const [filas] = await this.ejecutor().query('SELECT * FROM users WHERE email = ?', [email]);
    return filas.length ? this.hidratar(filas[0]) : null;
  }

  // Lista paginada para el admin; `q` busca en el nombre y en el correo, `role` filtra por rol
  async findAll({ q, role } = {}, { limit, offset }) {
    const condiciones = [];
    const valores = [];
    if (q) {
      condiciones.push('(username LIKE ? OR email LIKE ?)');
      valores.push(`%${escaparLike(q)}%`, `%${escaparLike(q)}%`);
    }
    if (role) {
      condiciones.push('role = ?');
      valores.push(role);
    }
    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

    const [[{ total }]] = await this.ejecutor().query(`SELECT COUNT(*) AS total FROM users ${where}`, valores);
    const [filas] = await this.ejecutor().query(
      `SELECT ${SIN_PASSWORD} FROM users ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
      [...valores, limit, offset]
    );
    return { total, users: filas.map((fila) => this.hidratar(fila)) };
  }

  // Dice si otro usuario (distinto de `excluirId`) ya usa ese correo o nombre
  async existsByEmailOrUsername(email, username, excluirId = 0) {
    const [filas] = await this.ejecutor().query(
      'SELECT id FROM users WHERE (email = ? OR username = ?) AND id <> ?',
      [email ?? null, username ?? null, excluirId]
    );
    return filas.length > 0;
  }

  // Crea un usuario (por defecto con rol "user") y devuelve la entidad sin contraseña
  async create({ username, email, passwordHash, role = 'user' }) {
    const [result] = await this.ejecutor().query(
      'INSERT INTO users (username, email, password, role, created_at) VALUES (?, ?, ?, ?, NOW())',
      [username, email, passwordHash, role]
    );
    return this.findById(result.insertId);
  }

  // Actualiza solo los campos que vienen en `cambios`
  async update(id, cambios) {
    const campos = Object.keys(cambios).filter((campo) => COLUMNAS[campo]);
    if (campos.length) {
      const asignaciones = campos.map((campo) => `${COLUMNAS[campo]} = ?`).join(', ');
      await this.ejecutor().query(`UPDATE users SET ${asignaciones} WHERE id = ?`, [
        ...campos.map((campo) => cambios[campo]),
        id,
      ]);
    }
    return this.findById(id);
  }
}

module.exports = { UserRepository, userRepository: new UserRepository() };
