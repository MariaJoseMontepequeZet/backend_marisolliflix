const { getPool } = require('../config/db');

function toCategory(fila) {
  return { id: fila.id, name: fila.name, createdAt: fila.created_at };
}

async function findAll() {
  const [filas] = await getPool().query('SELECT * FROM categories ORDER BY name');
  return filas.map(toCategory);
}

async function findById(id) {
  const [filas] = await getPool().query('SELECT * FROM categories WHERE id = ?', [id]);
  return filas.length ? toCategory(filas[0]) : null;
}

async function create(name) {
  const [result] = await getPool().query('INSERT INTO categories (name) VALUES (?)', [name]);
  return findById(result.insertId);
}

async function update(id, name) {
  await getPool().query('UPDATE categories SET name = ? WHERE id = ?', [name, id]);
  return findById(id);
}

async function remove(id) {
  const [result] = await getPool().query('DELETE FROM categories WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

async function countMovies(id) {
  const [[{ total }]] = await getPool().query(
    'SELECT COUNT(*) AS total FROM movies WHERE category_id = ?',
    [id]
  );
  return total;
}

module.exports = { findAll, findById, create, update, remove, countMovies };
