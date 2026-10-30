const { test, before, after } = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const { connectDB, getPool } = require('../src/config/db');

let server;
let baseUrl;
let categoryId;
let movieId;
let token;
let userId;

const sufijo = Date.now();
const usuario = { username: `rv_${sufijo}`, email: `rv_${sufijo}@test.com`, password: 'password123' };

const api = (metodo, ruta, { token: t, body } = {}) =>
  fetch(`${baseUrl}${ruta}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(t && { Authorization: `Bearer ${t}` }) },
    body: body && JSON.stringify(body),
  });

before(async () => {
  await connectDB();
  server = app.listen(0);
  baseUrl = `http://localhost:${server.address().port}/api/v1`;
  const pool = getPool();

  const [cat] = await pool.query('INSERT INTO categories (name) VALUES (?)', [`RvCat ${sufijo}`]);
  categoryId = cat.insertId;

  await api('POST', '/auth/register', { body: usuario });
  const login = await api('POST', '/auth/login', { body: { email: usuario.email, password: usuario.password } });
  const datos = await login.json();
  token = datos.token;
  userId = datos.user.id;

  const [mov] = await pool.query(
    `INSERT INTO movies (title, description, category_id, year, type, status, created_by)
     VALUES (?, 'd', ?, 2000, 'pelicula', 'approved', ?)`,
    [`Rv ${sufijo}`, categoryId, userId]
  );
  movieId = mov.insertId;
});

after(async () => {
  const pool = getPool();
  await pool.query('DELETE FROM movies WHERE id = ?', [movieId]);
  await pool.query('DELETE FROM users WHERE id = ?', [userId]);
  await pool.query('DELETE FROM categories WHERE id = ?', [categoryId]);
  server.close();
  await pool.end();
});

test('crear una reseña valida responde 201 con las estadisticas', async () => {
  const res = await api('POST', `/movies/${movieId}/reviews`, {
    token,
    body: { title: 'Excelente', rating: 9, comment: 'Me encanto la trama.' },
  });
  const json = await res.json();
  assert.strictEqual(res.status, 201);
  assert.strictEqual(json.data.reviewCount, 1);
  assert.strictEqual(json.data.avgRating, '9.00');
});

test('una segunda reseña del mismo usuario responde 409 con el formato de error', async () => {
  const res = await api('POST', `/movies/${movieId}/reviews`, {
    token,
    body: { title: 'Otra', rating: 5, comment: 'Repetida.' },
  });
  const json = await res.json();
  assert.strictEqual(res.status, 409);
  assert.strictEqual(json.status, 'error');
});

test('un titulo de reseña de mas de 255 caracteres responde 422', async () => {
  const res = await api('POST', `/movies/${movieId}/reviews`, {
    token,
    body: { title: 'a'.repeat(256), rating: 8, comment: 'Comentario de prueba.' },
  });
  assert.strictEqual(res.status, 422);
});

test('crear una reseña sin token responde 401', async () => {
  const res = await api('POST', `/movies/${movieId}/reviews`, {
    body: { title: 'x', rating: 5, comment: 'x' },
  });
  assert.strictEqual(res.status, 401);
});

test('GET /movies/:id/reviews lista las reseñas con el autor', async () => {
  const res = await api('GET', `/movies/${movieId}/reviews`);
  const json = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(json.results, 1);
  assert.strictEqual(json.data[0].username, usuario.username);
});

test('GET /movies/:id incluye las reseñas con su autor', async () => {
  const res = await api('GET', `/movies/${movieId}`);
  const json = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(json.data.reviews.length, 1);
  assert.strictEqual(json.data.reviews[0].author.username, usuario.username);
});

test('GET /movies/ranking devuelve las aprobadas y GET /movies acepta los alias category, sort=popularity y sort=year', async () => {
  const ranking = await api('GET', `/movies/ranking?categoryId=${categoryId}&limit=5`);
  const rJson = await ranking.json();
  assert.strictEqual(ranking.status, 200);
  assert.strictEqual(rJson.data[0].id, movieId);

  for (const sort of ['popularity', 'year']) {
    const res = await api('GET', `/movies?category=${categoryId}&sort=${sort}`);
    const json = await res.json();
    assert.strictEqual(res.status, 200, sort);
    assert.strictEqual(json.data.length, 1, sort);
  }
});
