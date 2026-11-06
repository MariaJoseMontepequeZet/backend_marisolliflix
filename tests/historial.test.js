const { test, before, after } = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const { connectDB, getPool } = require('../src/config/db');

let server;
let baseUrl;
let categoryId;
let tokenAutor;
let tokenOtro;
let idPelicula;
let idOtraPelicula;
let idResena;

const sufijo = Date.now();
const autor = { username: `hi_${sufijo}`, email: `hi_${sufijo}@test.com`, password: 'password123' };
const otro = { username: `ho_${sufijo}`, email: `ho_${sufijo}@test.com`, password: 'password123' };

const api = (metodo, ruta, { token, body } = {}) =>
  fetch(`${baseUrl}${ruta}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  });

async function registrarYLogin(datos) {
  await api('POST', '/auth/register', { body: datos });
  const res = await api('POST', '/auth/login', { body: { email: datos.email, password: datos.password } });
  return (await res.json()).token;
}

async function crearPelicula(titulo) {
  const [[usuario]] = await getPool().query('SELECT id FROM users WHERE username = ?', [autor.username]);
  const [r] = await getPool().query(
    'INSERT INTO movies (title, description, category_id, year, type, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [titulo, 'Descripcion', categoryId, 2010, 'pelicula', 'approved', usuario.id]
  );
  return r.insertId;
}

const historial = async (query = '', token = tokenAutor) => {
  const res = await api('GET', `/historial${query}`, { token });
  return { status: res.status, json: await res.json() };
};

before(async () => {
  await connectDB();
  server = app.listen(0);
  baseUrl = `http://localhost:${server.address().port}/api/v1`;
  const [cat] = await getPool().query('INSERT INTO categories (name) VALUES (?)', [`CatHist ${sufijo}`]);
  categoryId = cat.insertId;
  tokenAutor = await registrarYLogin(autor);
  tokenOtro = await registrarYLogin(otro);
  idPelicula = await crearPelicula(`Historial A ${sufijo}`);
  idOtraPelicula = await crearPelicula(`Historial B ${sufijo}`);
});

after(async () => {
  const pool = getPool();
  await pool.query('DELETE FROM movies WHERE id IN (?, ?)', [idPelicula, idOtraPelicula]);
  await pool.query('DELETE FROM users WHERE username IN (?, ?)', [autor.username, otro.username]);
  await pool.query('DELETE FROM categories WHERE id = ?', [categoryId]);
  server.close();
  await pool.end();
});

test('el historial exige sesion', async () => {
  assert.strictEqual((await api('GET', '/historial')).status, 401);
});

test('un usuario nuevo tiene el historial vacio', async () => {
  const { status, json } = await historial();
  assert.strictEqual(status, 200);
  assert.deepStrictEqual(json.data, []);
  assert.deepStrictEqual(json.summary, { review_created: 0, review_updated: 0, review_deleted: 0 });
});

test('crear, editar y eliminar una reseña se registra automaticamente en la base', async () => {
  const creada = await api('POST', `/movies/${idPelicula}/reviews`, {
    token: tokenAutor, body: { title: 'Muy buena', rating: 9, comment: 'Me gusto mucho' },
  });
  assert.strictEqual(creada.status, 201);
  idResena = (await creada.json()).data.reviewId;

  assert.strictEqual((await api('PUT', `/reviews/${idResena}`, { token: tokenAutor, body: { rating: 7 } })).status, 200);

  const otra = await api('POST', `/movies/${idOtraPelicula}/reviews`, {
    token: tokenAutor, body: { title: 'Regular', rating: 5, comment: 'Le falto ritmo' },
  });
  const idOtra = (await otra.json()).data.reviewId;
  assert.strictEqual((await api('DELETE', `/reviews/${idOtra}`, { token: tokenAutor })).status, 200);

  const [filas] = await getPool().query(
    'SELECT h.action FROM historial h JOIN users u ON u.id = h.user_id WHERE u.username = ? ORDER BY h.id',
    [autor.username]
  );
  assert.deepStrictEqual(filas.map((f) => f.action), ['review_created', 'review_updated', 'review_created', 'review_deleted']);
});

test('el historial sale ordenado, con descripcion, pelicula y cambios', async () => {
  const { status, json } = await historial();
  assert.strictEqual(status, 200);
  assert.deepStrictEqual(json.data.map((a) => a.action), ['review_deleted', 'review_created', 'review_updated', 'review_created']);
  assert.deepStrictEqual(json.summary, { review_created: 2, review_updated: 1, review_deleted: 1 });
  assert.deepStrictEqual(json.pagination, { page: 1, limit: 10, total: 4, pages: 1 });

  const edicion = json.data.find((a) => a.action === 'review_updated');
  assert.strictEqual(edicion.movie.title, `Historial A ${sufijo}`);
  assert.strictEqual(edicion.review.id, idResena);
  assert.deepStrictEqual(edicion.changes, { rating: { from: 9, to: 7 } });
  assert.match(edicion.description, /Editaste tu reseña/);

  const eliminada = json.data.find((a) => a.action === 'review_deleted');
  assert.strictEqual(eliminada.review.title, 'Regular');
  assert.strictEqual(eliminada.actionLabel, 'Reseña eliminada');

  const asc = await historial('?order=asc');
  assert.deepStrictEqual(asc.json.data.map((a) => a.id), json.data.map((a) => a.id).reverse());
});

test('filtra por tipo de accion y por fecha', async () => {
  const creadas = await historial('?action=review_created');
  assert.strictEqual(creadas.json.data.length, 2);
  assert.ok(creadas.json.data.every((a) => a.action === 'review_created'));
  assert.strictEqual(creadas.json.filters.action, 'review_created');

  const [[{ hoy }]] = await getPool().query("SELECT DATE_FORMAT(NOW(), '%Y-%m-%d') AS hoy");
  const deHoy = await historial(`?from=${hoy}&to=${hoy}`);
  assert.strictEqual(deHoy.json.data.length, 4);

  const futuro = await historial('?from=2999-01-01');
  assert.strictEqual(futuro.json.data.length, 0);
  const pasado = await historial('?to=2000-01-01');
  assert.strictEqual(pasado.json.data.length, 0);

  const paginado = await historial('?limit=1&page=2');
  assert.strictEqual(paginado.json.data.length, 1);
  assert.strictEqual(paginado.json.pagination.pages, 4);
});

test('cada usuario solo ve su propio historial', async () => {
  const { json } = await historial('', tokenOtro);
  assert.deepStrictEqual(json.data, []);
});

test('filtros invalidos responden 422', async () => {
  for (const query of ['?action=borrar', '?from=05-11-2026', '?to=2026-02-30', '?from=2026-11-10&to=2026-11-01', '?order=arriba', '?limit=500']) {
    const { status } = await historial(query);
    assert.strictEqual(status, 422, query);
  }
});

test('si la reseña no se guarda, tampoco se registra en el historial', async () => {
  const repetida = await api('POST', `/movies/${idPelicula}/reviews`, {
    token: tokenAutor, body: { title: 'Otra vez', rating: 8, comment: 'Repetida' },
  });
  assert.strictEqual(repetida.status, 409);
  const ajena = await api('DELETE', `/reviews/${idResena}`, { token: tokenOtro });
  assert.strictEqual(ajena.status, 403);
  const { json } = await historial();
  assert.strictEqual(json.pagination.total, 4);
});
