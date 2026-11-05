const { test, before, after } = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const { connectDB, getPool } = require('../src/config/db');

let server;
let baseUrl;
let tokenAdmin;
let tokenUser;
let idAdmin;
let idCreado;

// Sufijo unico para no chocar con datos que ya existan en la base
const sufijo = Date.now();
const admin = { username: `ua_${sufijo}`, email: `ua_${sufijo}@test.com`, password: 'password123' };
const normal = { username: `uu_${sufijo}`, email: `uu_${sufijo}@test.com`, password: 'password123' };
const nuevo = { username: `un_${sufijo}`, email: `un_${sufijo}@test.com`, password: 'password123' };

const api = (metodo, ruta, { token, body } = {}) =>
  fetch(`${baseUrl}${ruta}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body && JSON.stringify(body),
  });

const login = async (datos) => {
  const res = await api('POST', '/auth/login', { body: { email: datos.email, password: datos.password } });
  return (await res.json()).token;
};

before(async () => {
  await connectDB();
  server = app.listen(0);
  baseUrl = `http://localhost:${server.address().port}/api/v1`;

  const registrado = await (await api('POST', '/auth/register', { body: admin })).json();
  idAdmin = registrado.data.id;
  await api('POST', '/auth/register', { body: normal });
  await getPool().query('UPDATE users SET role = ? WHERE id = ?', ['admin', idAdmin]);
  tokenAdmin = await login(admin);
  tokenUser = await login(normal);
});

after(async () => {
  const pool = getPool();
  await pool.query('DELETE FROM users WHERE username IN (?, ?, ?)', [admin.username, normal.username, nuevo.username]);
  server.close();
  await pool.end();
});

test('un usuario normal no puede usar la gestion de usuarios (403) y sin token es 401', async () => {
  assert.strictEqual((await api('GET', '/users', { token: tokenUser })).status, 403);
  assert.strictEqual((await api('POST', '/users', { token: tokenUser, body: nuevo })).status, 403);
  assert.strictEqual((await api('GET', '/users')).status, 401);
});

test('el admin lista usuarios con paginacion y sin contraseñas', async () => {
  const res = await api('GET', `/users?q=${sufijo}&limit=5`, { token: tokenAdmin });
  const data = await res.json();

  assert.strictEqual(res.status, 200);
  assert.strictEqual(data.pagination.total, 2);
  assert.ok(data.data.every((u) => u.password === undefined && u.email));
});

test('el admin filtra la lista por rol', async () => {
  const res = await api('GET', `/users?q=${sufijo}&role=admin`, { token: tokenAdmin });
  const data = await res.json();

  assert.strictEqual(data.pagination.total, 1);
  assert.strictEqual(data.data[0].username, admin.username);
});

test('el admin crea un usuario normal por defecto', async () => {
  const res = await api('POST', '/users', { token: tokenAdmin, body: nuevo });
  const data = await res.json();

  assert.strictEqual(res.status, 201);
  assert.strictEqual(data.data.role, 'user');
  assert.strictEqual(data.data.password, undefined);
  idCreado = data.data.id;

  // La contraseña queda guardada con hash y el usuario puede iniciar sesion
  const [filas] = await getPool().query('SELECT password FROM users WHERE id = ?', [idCreado]);
  assert.notStrictEqual(filas[0].password, nuevo.password);
  assert.ok(await login(nuevo));
});

test('crear con datos repetidos responde 409 y con datos invalidos 422', async () => {
  assert.strictEqual((await api('POST', '/users', { token: tokenAdmin, body: nuevo })).status, 409);
  const corto = { ...nuevo, username: 'otro', email: 'otro@test.com', password: '123' };
  assert.strictEqual((await api('POST', '/users', { token: tokenAdmin, body: corto })).status, 422);
  const rol = { ...nuevo, username: 'otro', email: 'otro@test.com', role: 'jefe' };
  assert.strictEqual((await api('POST', '/users', { token: tokenAdmin, body: rol })).status, 422);
});

test('el admin ve el detalle de un usuario y un id inexistente responde 404', async () => {
  const res = await api('GET', `/users/${idCreado}`, { token: tokenAdmin });
  assert.strictEqual((await res.json()).data.username, nuevo.username);
  assert.strictEqual((await api('GET', '/users/999999999', { token: tokenAdmin })).status, 404);
});

test('el admin convierte a un usuario en administrador y ese ya puede administrar', async () => {
  const res = await api('PUT', `/users/${idCreado}`, { token: tokenAdmin, body: { role: 'admin' } });
  assert.strictEqual(res.status, 200);
  assert.strictEqual((await res.json()).data.role, 'admin');

  const tokenNuevo = await login(nuevo);
  assert.strictEqual((await api('GET', '/users', { token: tokenNuevo })).status, 200);
});

test('el admin puede cambiar nombre y contraseña de un usuario', async () => {
  const cambios = { username: `un2_${sufijo}`, password: 'otraclave123' };
  const res = await api('PUT', `/users/${idCreado}`, { token: tokenAdmin, body: cambios });
  assert.strictEqual(res.status, 200);
  assert.strictEqual((await res.json()).data.username, cambios.username);
  assert.ok(await login({ email: nuevo.email, password: cambios.password }));
  await getPool().query('UPDATE users SET username = ? WHERE id = ?', [nuevo.username, idCreado]);
});

test('editar sin campos o con un nombre ya usado falla', async () => {
  assert.strictEqual((await api('PUT', `/users/${idCreado}`, { token: tokenAdmin, body: {} })).status, 422);
  const repetido = await api('PUT', `/users/${idCreado}`, { token: tokenAdmin, body: { username: normal.username } });
  assert.strictEqual(repetido.status, 409);
});

test('el admin no puede quitarse su propio rol ni eliminar su propia cuenta', async () => {
  const rol = await api('PUT', `/users/${idAdmin}`, { token: tokenAdmin, body: { role: 'user' } });
  assert.strictEqual(rol.status, 403);
  const borrar = await api('DELETE', `/users/${idAdmin}`, { token: tokenAdmin });
  assert.strictEqual(borrar.status, 403);
});

test('eliminar un usuario pasa sus peliculas al admin y borra sus reseñas', async () => {
  const [[categoria]] = await getPool().query('SELECT id FROM categories LIMIT 1');
  let categoriaId = categoria && categoria.id;
  if (!categoriaId) {
    const [r] = await getPool().query('INSERT INTO categories (name) VALUES (?)', [`Cat ${sufijo}`]);
    categoriaId = r.insertId;
  }
  const titulo = `Pelicula de usuario ${sufijo}`;
  await getPool().query(
    "INSERT INTO movies (title, description, category_id, year, type, status, created_by) VALUES (?, 'x', ?, 2000, 'pelicula', 'approved', ?)",
    [titulo, categoriaId, idCreado]
  );

  const res = await api('DELETE', `/users/${idCreado}`, { token: tokenAdmin });
  assert.strictEqual(res.status, 204);
  assert.strictEqual((await api('GET', `/users/${idCreado}`, { token: tokenAdmin })).status, 404);

  const [[pelicula]] = await getPool().query('SELECT created_by FROM movies WHERE title = ?', [titulo]);
  assert.strictEqual(pelicula.created_by, idAdmin);
  await getPool().query('DELETE FROM movies WHERE title = ?', [titulo]);
  await getPool().query('DELETE FROM categories WHERE name = ?', [`Cat ${sufijo}`]);
});
