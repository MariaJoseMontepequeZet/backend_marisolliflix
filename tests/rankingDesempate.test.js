const { test, before, after } = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const { connectDB, getPool } = require('../src/config/db');

let server;
let baseUrl;
let categoryId;
const sufijo = Date.now();
const titulo = (nombre) => `${nombre} ${sufijo}`;

// Titulos de esta prueba, en el orden que devuelve la API
const listar = async (query) => {
  const res = await fetch(`${baseUrl}/movies?categoryId=${categoryId}&${query}`);
  return (await res.json()).data.map((m) => m.title);
};

before(async () => {
  await connectDB();
  server = app.listen(0);
  baseUrl = `http://localhost:${server.address().port}/api/v1`;
  const pool = getPool();

  const [cat] = await pool.query('INSERT INTO categories (name) VALUES (?)', [`DesempateCat ${sufijo}`]);
  categoryId = cat.insertId;

  const [admin] = await pool.query(`INSERT INTO users (username, email, password, role) VALUES (?, ?, 'x', 'admin')`, [`dad_${sufijo}`, `dad_${sufijo}@t.com`]);
  const [u] = await pool.query(`INSERT INTO users (username, email, password) VALUES (?, ?, 'x')`, [`dau_${sufijo}`, `dau_${sufijo}@t.com`]);

  // Alfa se crea antes que Zeta (id menor, y el orden viejo por id dejaba a Zeta primero) y las dos tienen exactamente la misma reseña:
  // empatan en puntaje, reseñas, promedio y likes. Solo el titulo puede desempatar.
  const crear = async (nombre) => (await pool.query(
    `INSERT INTO movies (title, description, category_id, year, type, status, created_by)
     VALUES (?, 'd', ?, 2000, 'pelicula', 'approved', ?)`, [titulo(nombre), categoryId, admin.insertId]))[0].insertId;
  for (const nombre of ['Alfa', 'Zeta']) {
    const id = await crear(nombre);
    await pool.query(
      `INSERT INTO reviews (user_id, movie_id, title, rating, comment, created_at) VALUES (?, ?, 't', 10, 'c', '2026-01-01 00:00:00')`,
      [u.insertId, id],
    );
  }
});

after(async () => {
  const pool = getPool();
  await pool.query('DELETE FROM movies WHERE title LIKE ?', [`% ${sufijo}`]);
  await pool.query('DELETE FROM users WHERE username LIKE ?', [`%_${sufijo}`]);
  await pool.query('DELETE FROM categories WHERE id = ?', [categoryId]);
  server.close();
  await pool.end();
});

test('sort=ranking desempata por titulo y el orden no cambia con el limit', async () => {
  const completo = await listar('sort=ranking');
  assert.deepStrictEqual(completo, [titulo('Alfa'), titulo('Zeta')]);
  assert.deepStrictEqual(await listar('sort=ranking&limit=1'), [titulo('Alfa')]);
});
