const { test, before, after } = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const openapi = require('../src/docs/openapi');
const { API_VERSION } = require('../src/utils/version');
const { connectDB, getPool } = require('../src/config/db');

let server;
let baseUrl;

const METODOS = ['get', 'post', 'put', 'patch', 'delete'];

before(async () => {
  await connectDB();
  server = app.listen(0);
  baseUrl = `http://localhost:${server.address().port}/api/v1`;
});

after(async () => {
  server.close();
  await getPool().end();
});

test('la interfaz de Swagger responde en /api/v1/docs', async () => {
  const res = await fetch(`${baseUrl}/docs/`);
  const html = await res.text();
  assert.strictEqual(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/html/);
  assert.match(html, /swagger-ui/i);
});

test('/api/v1/docs.json devuelve la especificacion OpenAPI con la version del API', async () => {
  const res = await fetch(`${baseUrl}/docs.json`);
  const json = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(json.openapi, '3.0.3');
  assert.strictEqual(json.info.version, API_VERSION);
  assert.ok(json.components.securitySchemes.bearerAuth);
});

test('todas las operaciones documentadas tienen etiqueta, resumen y respuestas', () => {
  for (const [ruta, item] of Object.entries(openapi.paths)) {
    for (const metodo of METODOS.filter((m) => item[m])) {
      const op = item[metodo];
      const nombre = `${metodo.toUpperCase()} ${ruta}`;
      assert.ok(op.tags && op.tags.length, `${nombre} sin tags`);
      assert.ok(op.summary, `${nombre} sin summary`);
      assert.ok(op.responses && Object.keys(op.responses).length, `${nombre} sin responses`);
    }
  }
});

test('los endpoints protegidos declaran seguridad y responden 401 sin token', async () => {
  const protegidos = [
    ['post', '/movies'], ['get', '/movies/pending'], ['put', '/movies/1'], ['patch', '/movies/1/status'], ['delete', '/movies/1'],
    ['post', '/categories'], ['put', '/categories/1'], ['delete', '/categories/1'], ['get', '/auth/me'],
    ['post', '/movies/1/reviews'], ['put', '/reviews/1'], ['delete', '/reviews/1'],
    ['post', '/reviews/1/reaction'], ['delete', '/reviews/1/reaction'],
  ];
  for (const [metodo, ruta] of protegidos) {
    const rutaDoc = ruta.replace(/\/\d+/g, '/{id}');
    assert.ok(openapi.paths[rutaDoc][metodo].security, `${metodo} ${rutaDoc} no declara security`);
    const res = await fetch(`${baseUrl}${ruta}`, { method: metodo.toUpperCase(), headers: { 'Content-Type': 'application/json' }, body: ['get', 'delete'].includes(metodo) ? undefined : '{}' });
    assert.strictEqual(res.status, 401, `${metodo} ${ruta}`);
  }
});

test('cada operacion documentada existe de verdad en el API (ninguna da "ruta no encontrada")', async () => {
  for (const [ruta, item] of Object.entries(openapi.paths)) {
    for (const metodo of METODOS.filter((m) => item[m])) {
      const url = `${baseUrl}${ruta.replace(/\{id\}/g, '1')}`;
      const res = await fetch(url, { method: metodo.toUpperCase(), headers: { 'Content-Type': 'application/json' }, body: ['get', 'delete'].includes(metodo) ? undefined : '{}' });
      const json = await res.json().catch(() => ({}));
      const noExiste = res.status === 404 && /^Ruta .* no encontrada/.test(json.message || '');
      assert.ok(!noExiste, `${metodo.toUpperCase()} ${ruta} esta documentada pero no existe`);
    }
  }
});
