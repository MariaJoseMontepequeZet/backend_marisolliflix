const { test, before, after } = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const { connectDB, getPool } = require('../src/config/db');

let server;
let baseUrl;
let categoryId;
let movieId;
let reviewId; // reseña del autor (rating 10)
let reviewAnaId; // reseña de Ana (rating 2)
const tokens = {};
const ids = {};

const sufijo = Date.now();
const nombres = ['autor', 'ana', 'beto', 'carla'];

const api = (metodo, ruta, { token, body } = {}) =>
  fetch(`${baseUrl}${ruta}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  });

const reaccionar = async (quien, type, id = reviewId) => {
  const res = await api('POST', `/reviews/${id}/reaction`, { token: tokens[quien], body: { type } });
  return { status: res.status, json: await res.json() };
};

const contarVotos = async (review, usuario) => {
  const [[{ n }]] = usuario
    ? await getPool().query('SELECT COUNT(*) AS n FROM review_votes WHERE review_id = ? AND user_id = ?', [review, usuario])
    : await getPool().query('SELECT COUNT(*) AS n FROM review_votes WHERE review_id = ?', [review]);
  return n;
};

const rankingPelicula = async () => (await (await api('GET', `/movies/${movieId}`)).json()).data.stats.rankingScore;

before(async () => {
  await connectDB();
  server = app.listen(0);
  baseUrl = `http://localhost:${server.address().port}/api/v1`;
  const pool = getPool();

  const [cat] = await pool.query('INSERT INTO categories (name) VALUES (?)', [`RxCat ${sufijo}`]);
  categoryId = cat.insertId;

  for (const n of nombres) {
    const datos = { username: `rx${n}_${sufijo}`, email: `rx${n}_${sufijo}@test.com`, password: 'password123' };
    await api('POST', '/auth/register', { body: datos });
    const login = await (await api('POST', '/auth/login', { body: { email: datos.email, password: datos.password } })).json();
    tokens[n] = login.token;
    ids[n] = login.user.id;
  }

  const [mov] = await pool.query(
    `INSERT INTO movies (title, description, category_id, year, type, status, created_by)
     VALUES (?, 'd', ?, 2000, 'pelicula', 'approved', ?)`,
    [`Rx ${sufijo}`, categoryId, ids.autor]
  );
  movieId = mov.insertId;

  // Dos reseñas con notas distintas para que el peso de cada una mueva el ranking
  const crear = async (quien, rating) => (await (await api('POST', `/movies/${movieId}/reviews`, {
    token: tokens[quien], body: { title: 't', rating, comment: 'c' },
  })).json()).data.reviewId;
  reviewId = await crear('autor', 10);
  reviewAnaId = await crear('ana', 2);
});

after(async () => {
  const pool = getPool();
  await pool.query('DELETE FROM movies WHERE id = ?', [movieId]);
  await pool.query('DELETE FROM users WHERE id IN (?, ?, ?, ?)', nombres.map((n) => ids[n]));
  await pool.query('DELETE FROM categories WHERE id = ?', [categoryId]);
  server.close();
  await pool.end();
});

test('no se puede votar la propia reseña (403) y no queda ningun voto', async () => {
  for (const type of ['like', 'dislike']) {
    const { status, json } = await reaccionar('autor', type);
    assert.strictEqual(status, 403);
    assert.strictEqual(json.status, 'error');
  }
  assert.strictEqual(await contarVotos(reviewId), 0);
});

test('un like se registra, cuenta en la reseña y sube el ranking de la pelicula', async () => {
  const antes = await rankingPelicula();
  const { status, json } = await reaccionar('beto', 'like');
  assert.strictEqual(status, 200);
  assert.strictEqual(json.data.reaction, 'like');
  assert.strictEqual(json.data.likes, 1);
  assert.strictEqual(json.data.dislikes, 0);
  assert.ok(json.data.rankingScore > antes, `ranking ${json.data.rankingScore} > ${antes}`);
});

test('repetir el mismo tipo quita el voto (toggle)', async () => {
  const { json } = await reaccionar('beto', 'like');
  assert.strictEqual(json.data.reaction, null);
  assert.strictEqual(json.data.likes, 0);
  assert.strictEqual(await contarVotos(reviewId, ids.beto), 0);
});

test('cambiar de like a dislike mueve el voto sin duplicarlo y baja el ranking', async () => {
  const base = await rankingPelicula();
  await reaccionar('beto', 'like');
  const { json } = await reaccionar('beto', 'dislike');
  assert.strictEqual(json.data.reaction, 'dislike');
  assert.strictEqual(json.data.likes, 0);
  assert.strictEqual(json.data.dislikes, 1);
  assert.ok(json.data.rankingScore < base, `ranking ${json.data.rankingScore} < ${base}`);
  assert.strictEqual(await contarVotos(reviewId), 1);
});

test('varios usuarios suman y el listado muestra los contadores y el voto propio (myVote)', async () => {
  await reaccionar('ana', 'like');
  await reaccionar('carla', 'like');
  const lista = await (await api('GET', `/movies/${movieId}/reviews`, { token: tokens.beto })).json();
  const mia = lista.data.find((r) => r.id === reviewId);
  assert.strictEqual(mia.likes, 2);
  assert.strictEqual(mia.dislikes, 1);
  assert.strictEqual(mia.myVote, -1); // Beto dio dislike

  const anonimo = await (await api('GET', `/movies/${movieId}/reviews`)).json();
  assert.strictEqual(anonimo.data.find((r) => r.id === reviewId).myVote, 0);
});

test('DELETE /reviews/:id/reaction quita el voto y es idempotente', async () => {
  const res = await api('DELETE', `/reviews/${reviewId}/reaction`, { token: tokens.carla });
  const json = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(json.data.reaction, null);
  assert.strictEqual(json.data.likes, 1);
  assert.strictEqual((await api('DELETE', `/reviews/${reviewId}/reaction`, { token: tokens.carla })).status, 200);
  assert.strictEqual((await api('DELETE', `/reviews/${reviewId}/reaction`, { token: tokens.autor })).status, 403);
});

test('datos invalidos: sin token 401, tipo invalido 422, id invalido 422, inexistente 404', async () => {
  assert.strictEqual((await api('POST', `/reviews/${reviewId}/reaction`, { body: { type: 'like' } })).status, 401);
  const tiposInvalidos = [{ type: 'love' }, { type: '' }, { type: 1 }, { type: null }, { type: ['like'] }, { type: { a: 1 } }, {}];
  for (const body of tiposInvalidos) {
    const res = await api('POST', `/reviews/${reviewId}/reaction`, { token: tokens.ana, body });
    assert.strictEqual(res.status, 422, JSON.stringify(body));
  }
  for (const id of ['abc', '0', '-1']) {
    const res = await api('POST', `/reviews/${id}/reaction`, { token: tokens.ana, body: { type: 'like' } });
    assert.strictEqual(res.status, 422, id);
  }
  assert.strictEqual((await reaccionar('ana', 'like', 99999999)).status, 404);
});

test('dos peticiones simultaneas del mismo usuario no dan error y dejan un estado coherente', async () => {
  await api('DELETE', `/reviews/${reviewId}/reaction`, { token: tokens.carla });
  const [a, b] = await Promise.all([reaccionar('carla', 'like'), reaccionar('carla', 'like')]);
  assert.strictEqual(a.status, 200);
  assert.strictEqual(b.status, 200);
  assert.strictEqual(await contarVotos(reviewId, ids.carla), 0); // el segundo toggle quita el voto del primero
});

test('al eliminar la reseña desaparecen sus votos', async () => {
  assert.strictEqual(await contarVotos(reviewAnaId), 0);
  await reaccionar('beto', 'like', reviewAnaId);
  assert.strictEqual(await contarVotos(reviewAnaId), 1);
  assert.strictEqual((await api('DELETE', `/reviews/${reviewAnaId}`, { token: tokens.ana })).status, 200);
  assert.strictEqual(await contarVotos(reviewAnaId), 0);
});
