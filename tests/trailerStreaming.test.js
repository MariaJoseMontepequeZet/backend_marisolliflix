const { test, before, after } = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const { connectDB, getPool } = require('../src/config/db');

let server;
let baseUrl;
let categoryId;
let tokenAdmin;

const sufijo = Date.now();
const admin = { username: `ts_${sufijo}`, email: `ts_${sufijo}@test.com`, password: 'password123' };
const titulo = (nombre) => `${nombre} ${sufijo}`;

const pelicula = (extra = {}) => ({
  title: titulo('Interestelar'),
  description: 'Viaje a traves de un agujero de gusano',
  categoryId,
  year: 2014,
  type: 'pelicula',
  ...extra,
});

const api = (metodo, ruta, { token, body } = {}) =>
  fetch(`${baseUrl}${ruta}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  });

before(async () => {
  await connectDB();
  server = app.listen(0);
  baseUrl = `http://localhost:${server.address().port}/api/v1`;
  const [cat] = await getPool().query('INSERT INTO categories (name) VALUES (?)', [`CatTS ${sufijo}`]);
  categoryId = cat.insertId;

  await api('POST', '/auth/register', { body: admin });
  await getPool().query('UPDATE users SET role = ? WHERE username = ?', ['admin', admin.username]);
  const res = await api('POST', '/auth/login', { body: { email: admin.email, password: admin.password } });
  tokenAdmin = (await res.json()).token;
});

after(async () => {
  const pool = getPool();
  await pool.query('DELETE FROM movies WHERE title LIKE ?', [`% ${sufijo}`]);
  await pool.query('DELETE FROM users WHERE username = ?', [admin.username]);
  await pool.query('DELETE FROM categories WHERE id = ?', [categoryId]);
  server.close();
  await pool.end();
});

test('una pelicula sin trailer ni plataformas devuelve null y lista vacia', async () => {
  const res = await api('POST', '/movies', { token: tokenAdmin, body: pelicula({ title: titulo('Sin datos') }) });
  const { data } = await res.json();
  assert.strictEqual(res.status, 201);
  assert.strictEqual(data.trailerUrl, null);
  assert.deepStrictEqual(data.streaming, []);
});

test('guarda el trailer de YouTube y las plataformas, y se pueden editar y quitar', async () => {
  const streaming = [
    { platform: 'netflix', url: 'https://www.netflix.com/title/70305903' },
    { platform: 'prime', url: 'https://www.primevideo.com/detail/0ABC' },
  ];
  const res = await api('POST', '/movies', {
    token: tokenAdmin,
    body: pelicula({ trailerUrl: 'https://www.youtube.com/watch?v=abcDEF12345', streaming }),
  });
  const { data } = await res.json();
  assert.strictEqual(res.status, 201);
  assert.strictEqual(data.trailerUrl, 'https://www.youtube.com/watch?v=abcDEF12345');
  assert.deepStrictEqual(data.streaming, streaming);

  // El detalle publico tambien los trae
  const detalle = await (await api('GET', `/movies/${data.id}`)).json();
  assert.deepStrictEqual(detalle.data.streaming, streaming);

  const edit = await api('PUT', `/movies/${data.id}`, {
    token: tokenAdmin,
    body: { trailerUrl: 'https://youtu.be/abcDEF12345', streaming: [{ platform: 'max', url: 'https://play.max.com/movie/x' }] },
  });
  const editada = (await edit.json()).data;
  assert.strictEqual(edit.status, 200);
  assert.strictEqual(editada.trailerUrl, 'https://youtu.be/abcDEF12345');
  assert.deepStrictEqual(editada.streaming, [{ platform: 'max', url: 'https://play.max.com/movie/x' }]);

  const quita = await api('PUT', `/movies/${data.id}`, { token: tokenAdmin, body: { trailerUrl: null, streaming: null } });
  const sin = (await quita.json()).data;
  assert.strictEqual(sin.trailerUrl, null);
  assert.deepStrictEqual(sin.streaming, []);
});

test('rechaza trailers que no son de YouTube y plataformas invalidas', async () => {
  const trailersMalos = ['https://vimeo.com/123', 'javascript:alert(1)', 'https://www.youtube.com/watch?v=corto', 5];
  for (const trailerUrl of trailersMalos) {
    const res = await api('POST', '/movies', { token: tokenAdmin, body: pelicula({ title: titulo('Mal trailer'), trailerUrl }) });
    assert.strictEqual(res.status, 422, JSON.stringify(trailerUrl));
  }

  const streamingMalos = [
    'netflix',
    [{ platform: 'blockbuster', url: 'https://x.com' }],
    [{ platform: 'netflix', url: 'javascript:alert(1)' }],
    [{ platform: 'netflix', url: 'https://a.com' }, { platform: 'netflix', url: 'https://b.com' }],
    [null],
  ];
  for (const streaming of streamingMalos) {
    const res = await api('POST', '/movies', { token: tokenAdmin, body: pelicula({ title: titulo('Mal stream'), streaming }) });
    assert.strictEqual(res.status, 422, JSON.stringify(streaming));
  }
});

test('?q= busca por titulo sin distinguir mayusculas y trata % y _ como texto', async () => {
  await api('POST', '/movies', { token: tokenAdmin, body: pelicula({ title: titulo('Buscable Zorro') }) });
  await api('POST', '/movies', { token: tokenAdmin, body: pelicula({ title: titulo('Otra 100% real') }) });

  const encontrada = await (await api('GET', `/movies?q=${encodeURIComponent(`buscable zorro ${sufijo}`)}`)).json();
  assert.strictEqual(encontrada.pagination.total, 1);
  assert.strictEqual(encontrada.data[0].title, titulo('Buscable Zorro'));

  const porcentaje = await (await api('GET', `/movies?q=${encodeURIComponent('100%')}&limit=100`)).json();
  assert.ok(porcentaje.data.every((m) => m.title.includes('100%')));
  assert.ok(porcentaje.data.some((m) => m.title === titulo('Otra 100% real')));

  const nada = await (await api('GET', `/movies?q=${encodeURIComponent(`no existe ${sufijo}`)}`)).json();
  assert.strictEqual(nada.pagination.total, 0);

  const larga = await api('GET', `/movies?q=${'a'.repeat(101)}`);
  assert.strictEqual(larga.status, 422);
});

test('imdbRating se guarda con un decimal, valida el rango y ordena con sort=internet', async () => {
  const alta = await (await api('POST', '/movies', { token: tokenAdmin, body: pelicula({ title: titulo('Nota alta'), imdbRating: 8.86 }) })).json();
  assert.strictEqual(alta.data.imdbRating, 8.9);
  const baja = await (await api('POST', '/movies', { token: tokenAdmin, body: pelicula({ title: titulo('Nota baja'), imdbRating: 3 }) })).json();
  assert.strictEqual(baja.data.imdbRating, 3);

  for (const imdbRating of [0, 11, 'ocho', -1]) {
    const res = await api('POST', '/movies', { token: tokenAdmin, body: pelicula({ title: titulo('Nota mala'), imdbRating }) });
    assert.strictEqual(res.status, 422, JSON.stringify(imdbRating));
  }

  const lista = await (await api('GET', `/movies?sort=internet&limit=100&q=${encodeURIComponent(`Nota `)}`)).json();
  const mias = lista.data.filter((m) => m.title.endsWith(String(sufijo))).map((m) => m.title);
  assert.deepStrictEqual(mias, [titulo('Nota alta'), titulo('Nota baja')]);

  const quita = await (await api('PUT', `/movies/${alta.data.id}`, { token: tokenAdmin, body: { imdbRating: null } })).json();
  assert.strictEqual(quita.data.imdbRating, null);
});
