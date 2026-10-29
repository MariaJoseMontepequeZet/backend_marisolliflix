const { test, before, after } = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const { connectDB, getPool } = require('../src/config/db');

let server;
let baseUrl;
let categoryId;
let tokenUser;
let tokenAdmin;
let idA; // pending, la mas vieja
let idB; // pending

const sufijo = Date.now();
const user = { username: `pu_${sufijo}`, email: `pu_${sufijo}@test.com`, password: 'password123' };
const admin = { username: `pa_${sufijo}`, email: `pa_${sufijo}@test.com`, password: 'password123' };

const api = (metodo, ruta, { token, body } = {}) =>
  fetch(`${baseUrl}${ruta}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body && JSON.stringify(body),
  });

async function login(datos) {
  const res = await api('POST', '/auth/login', { body: { email: datos.email, password: datos.password } });
  return (await res.json()).token;
}

const proponer = async (titulo) => {
  const res = await api('POST', '/movies', {
    token: tokenUser,
    body: { title: `${titulo} ${sufijo}`, description: 'Descripcion', categoryId, year: 2020, type: 'pelicula' },
  });
  return (await res.json()).data.id;
};

before(async () => {
  await connectDB();
  server = app.listen(0);
  baseUrl = `http://localhost:${server.address().port}/api/v1`;

  const [cat] = await getPool().query('INSERT INTO categories (name) VALUES (?)', [`CatP ${sufijo}`]);
  categoryId = cat.insertId;

  await api('POST', '/auth/register', { body: user });
  await api('POST', '/auth/register', { body: admin });
  await getPool().query('UPDATE users SET role = ? WHERE username = ?', ['admin', admin.username]);
  tokenUser = await login(user);
  tokenAdmin = await login(admin);

  idA = await proponer('Propuesta A');
  idB = await proponer('Propuesta B');
});

after(async () => {
  const pool = getPool();
  await pool.query('DELETE FROM movies WHERE title LIKE ?', [`% ${sufijo}`]);
  await pool.query('DELETE FROM users WHERE username IN (?, ?)', [user.username, admin.username]);
  await pool.query('DELETE FROM categories WHERE id = ?', [categoryId]);
  server.close();
  await pool.end();
});

test('GET /movies/pending: sin token 401 y con usuario normal 403', async () => {
  const sinToken = await api('GET', '/movies/pending');
  assert.strictEqual(sinToken.status, 401);

  const usuario = await api('GET', '/movies/pending', { token: tokenUser });
  assert.strictEqual(usuario.status, 403);
});

test('GET /movies/pending: el admin ve solo las pending, las mas viejas primero', async () => {
  const res = await api('GET', '/movies/pending?limit=100', { token: tokenAdmin });
  const data = await res.json();

  assert.strictEqual(res.status, 200);
  assert.ok(data.data.every((m) => m.status === 'pending'));
  const ids = data.data.map((m) => m.id);
  assert.ok(ids.includes(idA) && ids.includes(idB));
  assert.ok(ids.indexOf(idA) < ids.indexOf(idB));
  assert.strictEqual(typeof data.pagination.total, 'number');
});

test('GET /movies/pending valida la paginacion', async () => {
  const res = await api('GET', '/movies/pending?limit=0', { token: tokenAdmin });
  assert.strictEqual(res.status, 422);
});

test('PATCH status: sin token 401 y con usuario normal 403', async () => {
  const sinToken = await api('PATCH', `/movies/${idA}/status`, { body: { status: 'approved' } });
  assert.strictEqual(sinToken.status, 401);

  const usuario = await api('PATCH', `/movies/${idA}/status`, { token: tokenUser, body: { status: 'approved' } });
  assert.strictEqual(usuario.status, 403);
});

test('PATCH status valida el valor: solo approved o rejected', async () => {
  for (const status of ['pending', 'otro', undefined]) {
    const res = await api('PATCH', `/movies/${idA}/status`, { token: tokenAdmin, body: { status } });
    const data = await res.json();
    assert.strictEqual(res.status, 422);
    assert.strictEqual(data.errors[0].field, 'status');
  }

  const idMalo = await api('PATCH', '/movies/abc/status', { token: tokenAdmin, body: { status: 'approved' } });
  assert.strictEqual(idMalo.status, 422);
});

test('PATCH status con un id inexistente responde 404', async () => {
  const res = await api('PATCH', '/movies/999999999/status', { token: tokenAdmin, body: { status: 'approved' } });
  assert.strictEqual(res.status, 404);
});

test('el admin aprueba: aparece en el listado publico y sale de pending', async () => {
  const antes = await api('GET', `/movies?categoryId=${categoryId}`);
  assert.ok(!(await antes.json()).data.some((m) => m.id === idA));

  const res = await api('PATCH', `/movies/${idA}/status`, { token: tokenAdmin, body: { status: 'approved' } });
  const data = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(data.data.status, 'approved');

  const despues = await api('GET', `/movies?categoryId=${categoryId}`);
  assert.ok((await despues.json()).data.some((m) => m.id === idA));

  const pendientes = await api('GET', '/movies/pending?limit=100', { token: tokenAdmin });
  assert.ok(!(await pendientes.json()).data.some((m) => m.id === idA));
});

test('el admin rechaza: no aparece en el listado publico ni en pending, y se puede reconsiderar', async () => {
  const res = await api('PATCH', `/movies/${idB}/status`, { token: tokenAdmin, body: { status: 'rejected' } });
  assert.strictEqual((await res.json()).data.status, 'rejected');

  const publico = await api('GET', `/movies?categoryId=${categoryId}`);
  assert.ok(!(await publico.json()).data.some((m) => m.id === idB));

  const pendientes = await api('GET', '/movies/pending?limit=100', { token: tokenAdmin });
  assert.ok(!(await pendientes.json()).data.some((m) => m.id === idB));

  const detallePublico = await api('GET', `/movies/${idB}`);
  assert.strictEqual(detallePublico.status, 404);

  const reconsiderar = await api('PATCH', `/movies/${idB}/status`, { token: tokenAdmin, body: { status: 'approved' } });
  assert.strictEqual(reconsiderar.status, 200);
});
