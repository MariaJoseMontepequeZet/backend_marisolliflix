const { test, before, after } = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const { connectDB, getPool } = require('../src/config/db');

let server;
let baseUrl;

before(async () => {
  await connectDB();
  // Puerto 0 = el sistema elige uno libre, asi no choca con el servidor de desarrollo
  server = app.listen(0);
  baseUrl = `http://localhost:${server.address().port}/api/v1`;
});

after(async () => {
  server.close();
  await getPool().end();
});

test('GET /api/v1/health responde 200 y la base de datos esta ok', async () => {
  const res = await fetch(`${baseUrl}/health`);
  const body = await res.json();

  assert.strictEqual(res.status, 200);
  assert.strictEqual(body.status, 'ok');
  assert.strictEqual(body.database, 'ok');
  assert.strictEqual(body.version, require('../package.json').version);
});

test('una ruta que no existe responde 404', async () => {
  const res = await fetch(`${baseUrl}/no-existe`);
  assert.strictEqual(res.status, 404);
});
