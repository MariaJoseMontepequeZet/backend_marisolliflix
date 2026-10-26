const { test, before, after } = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const { connectDB, getPool } = require('../src/config/db');

let server;
let baseUrl;

// Sufijo unico para no chocar con datos que ya existan en la base
const sufijo = Date.now();
const usuario = {
  username: `auth_${sufijo}`,
  email: `auth_${sufijo}@test.com`,
  password: 'password123',
};

const post = (ruta, body) =>
  fetch(`${baseUrl}${ruta}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

before(async () => {
  await connectDB();
  server = app.listen(0);
  baseUrl = `http://localhost:${server.address().port}/api/v1`;
});

after(async () => {
  await getPool().query('DELETE FROM users WHERE username = ?', [usuario.username]);
  server.close();
  await getPool().end();
});

test('registro crea el usuario con rol user y responde 201', async () => {
  const res = await post('/auth/register', usuario);
  const data = await res.json();

  assert.strictEqual(res.status, 201);
  assert.strictEqual(data.data.role, 'user');
  assert.strictEqual(data.data.password, undefined);

  const [filas] = await getPool().query('SELECT password FROM users WHERE username = ?', [usuario.username]);
  assert.notStrictEqual(filas[0].password, usuario.password);
});

test('username de solo espacios o demasiado largo responde 422 y no 500', async () => {
  const vacio = await post('/auth/register', { ...usuario, username: '   ' });
  assert.strictEqual(vacio.status, 422);

  const largo = await post('/auth/register', { ...usuario, username: 'x'.repeat(80) });
  assert.strictEqual(largo.status, 422);
});

test('registro repetido responde 409', async () => {
  const res = await post('/auth/register', usuario);
  assert.strictEqual(res.status, 409);
});

test('registro con datos invalidos responde 422', async () => {
  const res = await post('/auth/register', { username: '', email: 'malo', password: '123' });
  const data = await res.json();

  assert.strictEqual(res.status, 422);
  assert.deepStrictEqual(data.errors.map((e) => e.field).sort(), ['email', 'password', 'username']);
});

test('login con credenciales correctas responde 200 con token y /me lo acepta', async () => {
  const res = await post('/auth/login', { email: usuario.email, password: usuario.password });
  const data = await res.json();

  assert.strictEqual(res.status, 200);
  assert.ok(data.token);

  const me = await fetch(`${baseUrl}/auth/me`, { headers: { Authorization: `Bearer ${data.token}` } });
  const perfil = await me.json();
  assert.strictEqual(me.status, 200);
  assert.strictEqual(perfil.user.email, usuario.email);
  assert.strictEqual(perfil.user.password, undefined);
});

test('login con password incorrecto responde 401', async () => {
  const res = await post('/auth/login', { email: usuario.email, password: 'otra-password' });
  assert.strictEqual(res.status, 401);
});

test('login sin datos responde 422 y no 500', async () => {
  const res = await post('/auth/login', {});
  assert.strictEqual(res.status, 422);
});

test('/me sin token responde 401 con el formato de error', async () => {
  const res = await fetch(`${baseUrl}/auth/me`);
  const data = await res.json();

  assert.strictEqual(res.status, 401);
  assert.strictEqual(data.status, 'error');
});
