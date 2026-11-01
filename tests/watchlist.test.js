const { test, before, after } = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const { connectDB, getPool } = require('../src/config/db');

let server;
let baseUrl;
let categoryId;
let tokenUser;
let tokenOtro;
let idAprobada;
let idPendiente;

const sufijo = Date.now();
const user = { username: `wl_${sufijo}`, email: `wl_${sufijo}@test.com`, password: 'password123' };
const otro = { username: `wo_${sufijo}`, email: `wo_${sufijo}@test.com`, password: 'password123' };

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

async function crearPelicula(titulo, status) {
  const [[admin]] = await getPool().query('SELECT id FROM users WHERE username = ?', [user.username]);
  const [r] = await getPool().query(
    'INSERT INTO movies (title, description, category_id, year, type, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [titulo, 'Descripcion', categoryId, 2010, 'pelicula', status, admin.id]
  );
  return r.insertId;
}

before(async () => {
  await connectDB();
  server = app.listen(0);
  baseUrl = `http://localhost:${server.address().port}/api/v1`;
  const [cat] = await getPool().query('INSERT INTO categories (name) VALUES (?)', [`CatWL ${sufijo}`]);
  categoryId = cat.insertId;
  tokenUser = await registrarYLogin(user);
  tokenOtro = await registrarYLogin(otro);
  idAprobada = await crearPelicula(`Guardable ${sufijo}`, 'approved');
  idPendiente = await crearPelicula(`Pendiente WL ${sufijo}`, 'pending');
});

after(async () => {
  const pool = getPool();
  await pool.query('DELETE FROM movies WHERE id IN (?, ?)', [idAprobada, idPendiente]);
  await pool.query('DELETE FROM users WHERE username IN (?, ?)', [user.username, otro.username]);
  await pool.query('DELETE FROM categories WHERE id = ?', [categoryId]);
  server.close();
  await pool.end();
});

test('mi lista exige sesion', async () => {
  assert.strictEqual((await api('GET', '/watchlist')).status, 401);
  assert.strictEqual((await api('POST', `/watchlist/${idAprobada}`)).status, 401);
});

test('agregar, repetir, ver en el detalle, listar y quitar', async () => {
  const primera = await api('POST', `/watchlist/${idAprobada}`, { token: tokenUser });
  assert.strictEqual(primera.status, 201);
  const repetida = await api('POST', `/watchlist/${idAprobada}`, { token: tokenUser });
  assert.strictEqual(repetida.status, 200);

  const detalle = await (await api('GET', `/movies/${idAprobada}`, { token: tokenUser })).json();
  assert.strictEqual(detalle.data.inWatchlist, true);
  const detalleOtro = await (await api('GET', `/movies/${idAprobada}`, { token: tokenOtro })).json();
  assert.strictEqual(detalleOtro.data.inWatchlist, false);
  const visitante = await (await api('GET', `/movies/${idAprobada}`)).json();
  assert.strictEqual(visitante.data.inWatchlist, false);

  const lista = await (await api('GET', '/watchlist', { token: tokenUser })).json();
  assert.deepStrictEqual(lista.data.map((m) => m.id), [idAprobada]);
  assert.strictEqual(lista.pagination.total, 1);
  const listaOtro = await (await api('GET', '/watchlist', { token: tokenOtro })).json();
  assert.strictEqual(listaOtro.pagination.total, 0);

  assert.strictEqual((await api('DELETE', `/watchlist/${idAprobada}`, { token: tokenUser })).status, 204);
  assert.strictEqual((await api('DELETE', `/watchlist/${idAprobada}`, { token: tokenUser })).status, 404);
});

test('no se pueden guardar peliculas pendientes ni ids invalidos', async () => {
  assert.strictEqual((await api('POST', `/watchlist/${idPendiente}`, { token: tokenUser })).status, 404);
  assert.strictEqual((await api('POST', '/watchlist/999999999', { token: tokenUser })).status, 404);
  assert.strictEqual((await api('POST', '/watchlist/abc', { token: tokenUser })).status, 422);
});
