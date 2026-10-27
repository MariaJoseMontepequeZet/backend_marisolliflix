const { test, before, after } = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const { connectDB, getPool } = require('../src/config/db');

let server;
let baseUrl;
let tokenUser;
let tokenAdmin;
let idCategoria;
let idConPeliculas;

const sufijo = Date.now();
const user = { username: `cu_${sufijo}`, email: `cu_${sufijo}@test.com`, password: 'password123' };
const admin = { username: `ca_${sufijo}`, email: `ca_${sufijo}@test.com`, password: 'password123' };
const nombre = (texto) => `${texto} ${sufijo}`;

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

before(async () => {
  await connectDB();
  server = app.listen(0);
  baseUrl = `http://localhost:${server.address().port}/api/v1`;

  await api('POST', '/auth/register', { body: user });
  await api('POST', '/auth/register', { body: admin });
  await getPool().query('UPDATE users SET role = ? WHERE username = ?', ['admin', admin.username]);
  tokenUser = await login(user);
  tokenAdmin = await login(admin);
});

after(async () => {
  const pool = getPool();
  await pool.query('DELETE FROM movies WHERE title LIKE ?', [`% ${sufijo}`]);
  await pool.query('DELETE FROM categories WHERE name LIKE ?', [`% ${sufijo}`]);
  await pool.query('DELETE FROM users WHERE username IN (?, ?)', [user.username, admin.username]);
  server.close();
  await pool.end();
});

test('el admin crea una categoria y responde 201', async () => {
  const res = await api('POST', '/categories', { token: tokenAdmin, body: { name: `  ${nombre('Terror')}  ` } });
  const data = await res.json();

  assert.strictEqual(res.status, 201);
  assert.strictEqual(data.data.name, nombre('Terror'));
  idCategoria = data.data.id;
});

test('crear sin token responde 401 y con un usuario normal 403', async () => {
  const sinToken = await api('POST', '/categories', { body: { name: nombre('X') } });
  assert.strictEqual(sinToken.status, 401);

  const usuario = await api('POST', '/categories', { token: tokenUser, body: { name: nombre('X') } });
  assert.strictEqual(usuario.status, 403);
});

test('nombre repetido responde 409, aunque cambien mayusculas', async () => {
  const igual = await api('POST', '/categories', { token: tokenAdmin, body: { name: nombre('Terror') } });
  assert.strictEqual(igual.status, 409);

  const otraCaja = await api('POST', '/categories', { token: tokenAdmin, body: { name: nombre('TERROR') } });
  assert.strictEqual(otraCaja.status, 409);
});

test('nombre vacio o demasiado largo responde 422', async () => {
  const vacio = await api('POST', '/categories', { token: tokenAdmin, body: { name: '   ' } });
  const vacioData = await vacio.json();
  assert.strictEqual(vacio.status, 422);
  assert.strictEqual(vacioData.errors[0].field, 'name');

  const largo = await api('POST', '/categories', { token: tokenAdmin, body: { name: 'x'.repeat(101) } });
  assert.strictEqual(largo.status, 422);
});

test('el listado y el detalle son publicos', async () => {
  const lista = await api('GET', '/categories');
  const listaData = await lista.json();
  assert.strictEqual(lista.status, 200);
  assert.ok(listaData.data.some((c) => c.id === idCategoria));

  const detalle = await api('GET', `/categories/${idCategoria}`);
  assert.strictEqual(detalle.status, 200);

  const noExiste = await api('GET', '/categories/999999999');
  assert.strictEqual(noExiste.status, 404);

  const idMalo = await api('GET', '/categories/abc');
  assert.strictEqual(idMalo.status, 422);
});

test('PUT solo lo hace el admin y valida nombre repetido', async () => {
  const usuario = await api('PUT', `/categories/${idCategoria}`, { token: tokenUser, body: { name: nombre('Otro') } });
  assert.strictEqual(usuario.status, 403);

  const res = await api('PUT', `/categories/${idCategoria}`, { token: tokenAdmin, body: { name: nombre('Suspenso') } });
  const data = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(data.data.name, nombre('Suspenso'));

  const otra = await api('POST', '/categories', { token: tokenAdmin, body: { name: nombre('Drama') } });
  idConPeliculas = (await otra.json()).data.id;
  const repetido = await api('PUT', `/categories/${idCategoria}`, { token: tokenAdmin, body: { name: nombre('Drama') } });
  assert.strictEqual(repetido.status, 409);

  const noExiste = await api('PUT', '/categories/999999999', { token: tokenAdmin, body: { name: nombre('Y') } });
  assert.strictEqual(noExiste.status, 404);
});

test('no se puede borrar una categoria con peliculas asociadas (409)', async () => {
  const pelicula = await api('POST', '/movies', {
    token: tokenAdmin,
    body: {
      title: nombre('Pelicula'), description: 'Descripcion', categoryId: idConPeliculas, year: 2020, type: 'pelicula',
    },
  });
  assert.strictEqual(pelicula.status, 201);

  const res = await api('DELETE', `/categories/${idConPeliculas}`, { token: tokenAdmin });
  assert.strictEqual(res.status, 409);

  const sigue = await api('GET', `/categories/${idConPeliculas}`);
  assert.strictEqual(sigue.status, 200);
});

test('DELETE: usuario normal 403; admin borra una vacia con 204 y luego 404', async () => {
  const usuario = await api('DELETE', `/categories/${idCategoria}`, { token: tokenUser });
  assert.strictEqual(usuario.status, 403);

  const borrada = await api('DELETE', `/categories/${idCategoria}`, { token: tokenAdmin });
  assert.strictEqual(borrada.status, 204);

  const otra = await api('DELETE', `/categories/${idCategoria}`, { token: tokenAdmin });
  assert.strictEqual(otra.status, 404);
});
