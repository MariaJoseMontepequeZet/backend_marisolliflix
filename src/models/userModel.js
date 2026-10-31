const { getPool } = require('../config/db');
const User = require('./entities/User');

// Para autenticar con el token: no trae la contraseña
async function findById(id) {
  const [filas] = await getPool().query(
    'SELECT id, username, email, role, created_at FROM users WHERE id = ?',
    [id]
  );
  return filas.length ? User.fromRow(filas[0]) : null;
}

// Para iniciar sesion: trae el hash para poder compararlo
async function findByEmail(email) {
  const [filas] = await getPool().query('SELECT * FROM users WHERE email = ?', [email]);
  return filas.length ? User.fromRow(filas[0]) : null;
}

async function existsByEmailOrUsername(email, username) {
  const [filas] = await getPool().query(
    'SELECT id FROM users WHERE email = ? OR username = ?',
    [email, username]
  );
  return filas.length > 0;
}

// Crea un usuario con rol "user" y devuelve la entidad sin contraseña
async function create({ username, email, passwordHash }) {
  const [result] = await getPool().query(
    'INSERT INTO users (username, email, password, role, created_at) VALUES (?, ?, ?, ?, NOW())',
    [username, email, passwordHash, 'user']
  );
  return findById(result.insertId);
}

module.exports = { findById, findByEmail, existsByEmailOrUsername, create };
