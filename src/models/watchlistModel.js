const { getPool } = require('../config/db');
const { SELECT_CON_STATS, toMovie } = require('./movieModel');

// Peliculas guardadas por el usuario, las ultimas agregadas primero.
// Solo cuentan las aprobadas: si una se rechaza despues, deja de aparecer.
async function findByUser(userId, { limit, offset }) {
  const [[{ total }]] = await getPool().query(
    `SELECT COUNT(*) AS total FROM watchlist_items w
     JOIN movies m ON m.id = w.movie_id
     WHERE w.user_id = ? AND m.status = 'approved'`,
    [userId]
  );
  const [filas] = await getPool().query(
    `${SELECT_CON_STATS}
     JOIN watchlist_items w ON w.movie_id = m.id
     WHERE w.user_id = ? AND m.status = 'approved'
     ORDER BY w.created_at DESC, m.id DESC
     LIMIT ? OFFSET ?`,
    [userId, limit, offset]
  );
  return { total, movies: filas.map(toMovie) };
}

async function has(userId, movieId) {
  const [filas] = await getPool().query(
    'SELECT 1 FROM watchlist_items WHERE user_id = ? AND movie_id = ?',
    [userId, movieId]
  );
  return filas.length > 0;
}

// La clave primaria (user_id, movie_id) evita duplicados; devuelve false si ya estaba
async function add(userId, movieId) {
  const [result] = await getPool().query(
    'INSERT IGNORE INTO watchlist_items (user_id, movie_id) VALUES (?, ?)',
    [userId, movieId]
  );
  return result.affectedRows > 0;
}

async function remove(userId, movieId) {
  const [result] = await getPool().query(
    'DELETE FROM watchlist_items WHERE user_id = ? AND movie_id = ?',
    [userId, movieId]
  );
  return result.affectedRows > 0;
}

module.exports = { findByUser, has, add, remove };
