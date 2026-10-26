const { test, before, after } = require('node:test');
const assert = require('node:assert');
const express = require('express');
const { body } = require('express-validator');
const app = require('../src/app');
const env = require('../src/config/env');
const validate = require('../src/middlewares/validate');
const errorHandler = require('../src/middlewares/errorHandler');

let server;
let baseUrl;

before(() => {
  server = app.listen(0);
  baseUrl = `http://localhost:${server.address().port}/api/v1`;
});

after(() => {
  server.close();
});

test('ruta inexistente responde 404 con el formato de error', async () => {
  const res = await fetch(`${baseUrl}/no-existe`);
  const data = await res.json();

  assert.strictEqual(res.status, 404);
  assert.strictEqual(data.status, 'error');
  assert.match(data.message, /no encontrada/);
});

test('JSON mal formado responde 400', async () => {
  const res = await fetch(`${baseUrl}/no-existe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{ "malo": ',
  });

  assert.strictEqual(res.status, 400);
});

test('CORS permite FRONT_URL', async () => {
  const res = await fetch(`${baseUrl}/no-existe`, { headers: { Origin: env.FRONT_URL } });

  assert.strictEqual(res.headers.get('access-control-allow-origin'), env.FRONT_URL);
});

test('CORS rechaza otros origenes con 403', async () => {
  const res = await fetch(`${baseUrl}/no-existe`, { headers: { Origin: 'http://malicioso.com' } });

  assert.strictEqual(res.status, 403);
  assert.strictEqual(res.headers.get('access-control-allow-origin'), null);
});

test('el login se bloquea con 429 despues de 5 intentos', async () => {
  for (let i = 0; i < 5; i++) {
    const res = await fetch(`${baseUrl}/auth/login`, { method: 'POST' });
    assert.notStrictEqual(res.status, 429);
  }

  const res = await fetch(`${baseUrl}/auth/login`, { method: 'POST' });
  const data = await res.json();
  assert.strictEqual(res.status, 429);
  assert.strictEqual(data.status, 'error');
});

test('validate responde 422 con los campos invalidos', async () => {
  // Mini app solo para probar el middleware con una regla de ejemplo
  const prueba = express();
  prueba.use(express.json());
  prueba.post('/', body('email').isEmail().withMessage('Email invalido'), validate, (req, res) => {
    res.json({ ok: true });
  });
  prueba.use(errorHandler);

  const srv = prueba.listen(0);
  const url = `http://localhost:${srv.address().port}/`;
  const opciones = (email) => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  const malo = await fetch(url, opciones('no-es-email'));
  const data = await malo.json();
  assert.strictEqual(malo.status, 422);
  assert.deepStrictEqual(data.errors, [{ field: 'email', message: 'Email invalido' }]);

  const bueno = await fetch(url, opciones('majo@test.com'));
  assert.strictEqual(bueno.status, 200);

  srv.close();
});
