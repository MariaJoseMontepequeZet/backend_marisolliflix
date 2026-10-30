const { test, before, after } = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const { connectDB, getPool } = require('../src/config/db');

let server;
let baseUrl;
let categoryId;
let movieId; // aprobada
let pendingId; // pendiente
let reviewId;
const tokens = {};
const ids = {};

const sufijo = Date.now();
const usuarios = {
  autor: { username: `rva_${sufijo}`, email: `rva_${sufijo}@test.com`, password: 'password123' },
  otro: { username: `rvo_${sufijo}`, email: `rvo_${sufijo}@test.com`, password: 'password123' },
  admin: { username: `rvm_${sufijo}`, email: `rvm_${sufijo}@test.com`, password: 'password123' },
};

const api = (metodo, ruta, { token, body } = {}) =>
  fetch(`${baseUrl}${ruta}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  });

before(async () => {
  await connectDB();
  server = app.listen(0);
  baseUrl = `http://localhost:${server.address().port}/api/v1`;
  const pool = getPool();

  const [cat] = await pool.query('INSERT INTO categories (name) VALUES (?)', [`RvCat ${sufijo}`]);
  categoryId = cat.insertId;

  for (const [clave, datos] of Object.entries(usuarios)) {
    await api('POST', '/auth/register', { body: datos });
  }
  await pool.query('UPDATE users SET role = ? WHERE username = ?', ['admin', usuarios.admin.username]);
  for (const [clave, datos] of Object.entries(usuarios)) {
    const login = await api('POST', '/auth/login', { body: { email: datos.email, password: datos.password } });
    const json = await login.json();
    tokens[clave] = json.token;
    ids[clave] = json.user.id;
  }

  const crear = async (titulo, status) => (await pool.query(
    `INSERT INTO movies (title, description, category_id, year, type, status, created_by)
     VALUES (?, 'd', ?, 2000, 'pelicula', ?, ?)`,
    [titulo, categoryId, status, ids.autor]
  ))[0].insertId;
  movieId = await crear(`Rv ${sufijo}`, 'approved');
  pendingId = await crear(`Rv pendiente ${sufijo}`, 'pending');
});

after(async () => {
  const pool = getPool();
  await pool.query('DELETE FROM movies WHERE id IN (?, ?)', [movieId, pendingId]);
  await pool.query('DELETE FROM users WHERE id IN (?, ?, ?)', [ids.autor, ids.otro, ids.admin]);
  await pool.query('DELETE FROM categories WHERE id = ?', [categoryId]);
  server.close();
  await pool.end();
});

// ---------- Crear ----------

test('crear una reseña valida responde 201 con las estadisticas', async () => {
  const res = await api('POST', `/movies/${movieId}/reviews`, {
    token: tokens.autor,
    body: { title: 'Excelente', rating: 9, comment: 'Me encanto la trama.' },
  });
  const json = await res.json();
  assert.strictEqual(res.status, 201);
  assert.strictEqual(json.status, 'success');
  assert.strictEqual(json.data.reviewCount, 1);
  assert.strictEqual(json.data.avgRating, '9.00');
  assert.ok(json.data.reviewId > 0);
  reviewId = json.data.reviewId;
});

test('una segunda reseña del mismo usuario responde 409 con el formato de error', async () => {
  const res = await api('POST', `/movies/${movieId}/reviews`, {
    token: tokens.autor,
    body: { title: 'Otra', rating: 5, comment: 'Repetida.' },
  });
  const json = await res.json();
  assert.strictEqual(res.status, 409);
  assert.strictEqual(json.status, 'error');
});

test('crear con datos invalidos responde 422 y nunca 500', async () => {
  const invalidos = [
    { title: 'a'.repeat(256), rating: 8, comment: 'ok' },
    { title: 'ok', rating: 8, comment: 'c'.repeat(1001) },
    { title: 'ok', rating: 11, comment: 'ok' },
    { title: 'ok', rating: 0, comment: 'ok' },
    { title: 'ok', rating: 'abc', comment: 'ok' },
    { title: 'ok', rating: [5], comment: 'ok' },
    { title: 'ok', rating: 5.5, comment: 'ok' },
    { title: { a: 1 }, rating: 5, comment: 'ok' },
    { title: 'ok', rating: 5, comment: ['x'] },
    { title: '   ', rating: 5, comment: 'ok' },
    {},
  ];
  for (const body of invalidos) {
    const res = await api('POST', `/movies/${movieId}/reviews`, { token: tokens.otro, body });
    assert.strictEqual(res.status, 422, JSON.stringify(body).slice(0, 60));
  }
});

test('crear sin token responde 401; en peliculas inexistentes o pendientes responde 404', async () => {
  const cuerpo = { title: 'x', rating: 5, comment: 'x' };
  assert.strictEqual((await api('POST', `/movies/${movieId}/reviews`, { body: cuerpo })).status, 401);
  assert.strictEqual((await api('POST', '/movies/99999999/reviews', { token: tokens.otro, body: cuerpo })).status, 404);
  assert.strictEqual((await api('POST', `/movies/${pendingId}/reviews`, { token: tokens.otro, body: cuerpo })).status, 404);
  assert.strictEqual((await api('POST', '/movies/abc/reviews', { token: tokens.otro, body: cuerpo })).status, 422);
});

// ---------- Listar ----------

test('GET /movies/:id/reviews lista las reseñas con autor, votos y fechas', async () => {
  const res = await api('GET', `/movies/${movieId}/reviews`);
  const json = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(json.results, 1);
  assert.strictEqual(json.data[0].author.username, usuarios.autor.username);
  assert.strictEqual(json.data[0].likes, 0);
  assert.strictEqual(json.data[0].dislikes, 0);
  assert.strictEqual(json.data[0].myVote, 0);
  assert.ok(json.data[0].createdAt && json.data[0].updatedAt);
});

test('las reseñas de una pelicula pendiente solo las ven el admin y quien la propuso', async () => {
  await getPool().query(
    'INSERT INTO reviews (user_id, movie_id, title, rating, comment) VALUES (?, ?, ?, ?, ?)',
    [ids.otro, pendingId, 't', 7, 'c']
  );
  assert.strictEqual((await api('GET', `/movies/${pendingId}/reviews`)).status, 404);
  assert.strictEqual((await api('GET', `/movies/${pendingId}/reviews`, { token: tokens.otro })).status, 404);
  assert.strictEqual((await api('GET', `/movies/${pendingId}/reviews`, { token: tokens.autor })).status, 200);
  assert.strictEqual((await api('GET', `/movies/${pendingId}/reviews`, { token: tokens.admin })).status, 200);
  assert.strictEqual((await api('GET', '/movies/99999999/reviews')).status, 404);
  assert.strictEqual((await api('GET', '/movies/abc/reviews')).status, 422);
});

test('GET /movies/:id incluye las reseñas con su autor', async () => {
  const res = await api('GET', `/movies/${movieId}`);
  const json = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(json.data.reviews.length, 1);
  assert.strictEqual(json.data.reviews[0].author.username, usuarios.autor.username);
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

// ---------- Editar (HU-09) ----------

test('PUT /reviews/:id: el autor edita su reseña y las estadisticas se recalculan', async () => {
  const res = await api('PUT', `/reviews/${reviewId}`, { token: tokens.autor, body: { rating: 5, title: 'Mejor pensado' } });
  const json = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(json.status, 'success');
  assert.strictEqual(json.data.rating, 5);
  assert.strictEqual(json.data.title, 'Mejor pensado');
  assert.strictEqual(json.data.comment, 'Me encanto la trama.'); // lo que no se manda se conserva
  assert.strictEqual(json.data.avgRating, '5.00');

  const lista = await (await api('GET', `/movies/${movieId}/reviews`)).json();
  assert.strictEqual(lista.data[0].rating, 5);
});

test('PUT /reviews/:id: solo el autor puede editar (otro usuario y admin reciben 403)', async () => {
  for (const quien of ['otro', 'admin']) {
    const res = await api('PUT', `/reviews/${reviewId}`, { token: tokens[quien], body: { rating: 1 } });
    assert.strictEqual(res.status, 403, quien);
  }
  const lista = await (await api('GET', `/movies/${movieId}/reviews`)).json();
  assert.strictEqual(lista.data[0].rating, 5);
});

test('PUT /reviews/:id: sin token 401, inexistente 404 e id invalido 422', async () => {
  assert.strictEqual((await api('PUT', `/reviews/${reviewId}`, { body: { rating: 4 } })).status, 401);
  assert.strictEqual((await api('PUT', '/reviews/99999999', { token: tokens.autor, body: { rating: 4 } })).status, 404);
  for (const id of ['abc', '0', '-1', '1.5']) {
    assert.strictEqual((await api('PUT', `/reviews/${id}`, { token: tokens.autor, body: { rating: 4 } })).status, 422, id);
  }
});

test('PUT /reviews/:id: datos invalidos responden 422 y nunca 500', async () => {
  const invalidos = [
    {},
    { rating: 11 },
    { rating: 0 },
    { rating: 'abc' },
    { rating: [5] },
    { title: '' },
    { title: 'a'.repeat(256) },
    { title: { a: 1 } },
    { comment: '   ' },
    { comment: 'c'.repeat(1001) },
  ];
  for (const body of invalidos) {
    const res = await api('PUT', `/reviews/${reviewId}`, { token: tokens.autor, body });
    assert.strictEqual(res.status, 422, JSON.stringify(body).slice(0, 60));
  }
});

// ---------- Eliminar (HU-09) ----------

test('DELETE /reviews/:id: otro usuario recibe 403 y la reseña sigue ahi', async () => {
  const res = await api('DELETE', `/reviews/${reviewId}`, { token: tokens.otro });
  assert.strictEqual(res.status, 403);
  assert.strictEqual((await api('DELETE', `/reviews/${reviewId}`, { token: tokens.admin })).status, 403);
  const lista = await (await api('GET', `/movies/${movieId}/reviews`)).json();
  assert.strictEqual(lista.results, 1);
});

test('DELETE /reviews/:id: el autor la elimina junto con sus votos y el ranking se recalcula', async () => {
  const pool = getPool();
  await pool.query('INSERT INTO review_votes (review_id, user_id, value) VALUES (?, ?, 1)', [reviewId, ids.otro]);

  const res = await api('DELETE', `/reviews/${reviewId}`, { token: tokens.autor });
  const json = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(json.status, 'success');
  assert.strictEqual(json.data.reviewCount, 0);
  assert.strictEqual(json.data.rankingScore, 0);

  const [[{ votos }]] = await pool.query('SELECT COUNT(*) AS votos FROM review_votes WHERE review_id = ?', [reviewId]);
  assert.strictEqual(votos, 0);

  // ya no existe: 404 y el usuario puede volver a reseñar la pelicula
  assert.strictEqual((await api('DELETE', `/reviews/${reviewId}`, { token: tokens.autor })).status, 404);
  const otra = await api('POST', `/movies/${movieId}/reviews`, {
    token: tokens.autor,
    body: { title: 'De nuevo', rating: 8, comment: 'Segunda oportunidad.' },
  });
  assert.strictEqual(otra.status, 201);
});

test('DELETE /reviews/:id: sin token 401 e id invalido 422', async () => {
  assert.strictEqual((await api('DELETE', `/reviews/${reviewId}`)).status, 401);
  assert.strictEqual((await api('DELETE', '/reviews/abc', { token: tokens.autor })).status, 422);
});
