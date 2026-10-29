const { test, before, after } = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const { connectDB, getPool } = require('../src/config/db');

let server;
let baseUrl;
let categoryId;
let tokenAdmin;
let idsUsuarios = [];

const sufijo = Date.now();
const admin = { username: `sa_${sufijo}`, email: `sa_${sufijo}@test.com`, password: 'password123' };
const titulo = (nombre) => `${nombre} ${sufijo}`;

const api = (metodo, ruta, { token, body } = {}) =>
  fetch(`${baseUrl}${ruta}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body && JSON.stringify(body),
  });

// Titulos de las peliculas de esta prueba, en el orden que devuelve la API
const listar = async (query) => {
  const res = await api('GET', `/movies?categoryId=${categoryId}&${query}`);
  const json = await res.json();
  return { status: res.status, titulos: (json.data || []).map((m) => m.title), json };
};

before(async () => {
  await connectDB();
  server = app.listen(0);
  baseUrl = `http://localhost:${server.address().port}/api/v1`;
  const pool = getPool();

  const [cat] = await pool.query('INSERT INTO categories (name) VALUES (?)', [`SortCat ${sufijo}`]);
  categoryId = cat.insertId;

  await api('POST', '/auth/register', { body: admin });
  await pool.query('UPDATE users SET role = ? WHERE username = ?', ['admin', admin.username]);
  const login = await api('POST', '/auth/login', { body: { email: admin.email, password: admin.password } });
  tokenAdmin = (await login.json()).token;
  const [[{ id: adminId }]] = await pool.query('SELECT id FROM users WHERE username = ?', [admin.username]);

  // Tres usuarios para repartir reseñas
  for (let i = 0; i < 3; i += 1) {
    const [u] = await pool.query('INSERT INTO users (username, email, password) VALUES (?, ?, "x")', [`su${i}_${sufijo}`, `su${i}_${sufijo}@t.com`]);
    idsUsuarios.push(u.insertId);
  }

  // B: 1 reseña de 10 | A: 3 reseñas de 6 | C: sin reseñas
  const crear = async (nombre, year) => (await pool.query(
    `INSERT INTO movies (title, description, category_id, year, type, status, created_by)
     VALUES (?, "d", ?, ?, "pelicula", "approved", ?)`, [titulo(nombre), categoryId, year, adminId]))[0].insertId;
  const a = await crear('Alfa', 2001);
  const b = await crear('Beta', 2010);
  await crear('Gamma', 2005);
  for (const u of idsUsuarios) {
    await pool.query('INSERT INTO reviews (user_id, movie_id, title, rating, comment) VALUES (?, ?, "t", 6, "c")', [u, a]);
  }
  await pool.query('INSERT INTO reviews (user_id, movie_id, title, rating, comment) VALUES (?, ?, "t", 10, "c")', [idsUsuarios[0], b]);
});

after(async () => {
  const pool = getPool();
  await pool.query('DELETE FROM movies WHERE title LIKE ?', [`% ${sufijo}`]);
  await pool.query('DELETE FROM users WHERE username LIKE ? OR username = ?', [`su%_${sufijo}`, admin.username]);
  await pool.query('DELETE FROM categories WHERE id = ?', [categoryId]);
  server.close();
  await pool.end();
});

test('sort=popularidad ordena por cantidad de reseñas', async () => {
  const { titulos } = await listar('sort=popularidad');
  assert.deepStrictEqual(titulos, [titulo('Alfa'), titulo('Beta'), titulo('Gamma')]);
});

test('sort=ranking pone primero la de mayor puntaje y al final la que no tiene reseñas', async () => {
  const { titulos } = await listar('sort=ranking');
  assert.strictEqual(titulos[titulos.length - 1], titulo('Gamma'));
  assert.strictEqual(titulos.length, 3);
});

test('sort=titulo y sort=anio ordenan por esos campos', async () => {
  assert.deepStrictEqual((await listar('sort=titulo')).titulos, [titulo('Alfa'), titulo('Beta'), titulo('Gamma')]);
  assert.deepStrictEqual((await listar('sort=anio')).titulos, [titulo('Beta'), titulo('Gamma'), titulo('Alfa')]);
});

test('sin sort usa recientes y sigue funcionando la paginacion', async () => {
  const { status, json } = await listar('limit=2&page=2');
  assert.strictEqual(status, 200);
  assert.strictEqual(json.data.length, 1);
  assert.strictEqual(json.pagination.total, 3);
});

test('un sort invalido responde 422 y no se interpola en SQL', async () => {
  const res = await api('GET', '/movies?sort=id;DROP TABLE movies');
  assert.strictEqual(res.status, 422);
});
