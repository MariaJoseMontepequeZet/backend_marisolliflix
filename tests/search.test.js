const { test, before, after } = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const { connectDB, getPool } = require('../src/config/db');

let server;
let baseUrl;
let userId;
let categoryId;
let idsPeliculas = [];

// Sufijo unico para no chocar con datos que ya existan en la base
const sufijo = Date.now();
const categoria = `Busq${sufijo}`;
const titulo = (nombre) => `${nombre} ${sufijo}`;

const buscar = async (query) => {
  const res = await fetch(`${baseUrl}/movies/search?categoria=${categoria}${query}`);
  const json = await res.json();
  return { status: res.status, json, titulos: (json.data || []).map((p) => p.titulo) };
};

before(async () => {
  await connectDB();
  server = app.listen(0);
  baseUrl = `http://localhost:${server.address().port}/api/v1`;

  const pool = getPool();
  const [usuario] = await pool.query(
    "INSERT INTO users (username, email, password, role) VALUES (?, ?, 'x', 'user')",
    [`bq_${sufijo}`, `bq_${sufijo}@test.com`]
  );
  userId = usuario.insertId;
  const [cat] = await pool.query('INSERT INTO categories (name) VALUES (?)', [categoria]);
  categoryId = cat.insertId;

  // Tres peliculas: promedio 10 (5 estrellas), 6 (3 estrellas) y una sin reseñas
  const datos = [['Vieja', 2005, 'approved', 10], ['Media', 2018, 'approved', 6], ['SinNota', 2020, 'approved', null], ['Oculta', 2020, 'pending', null]];
  for (const [nombre, anio, status, nota] of datos) {
    const [r] = await pool.query(
      "INSERT INTO movies (title, description, category_id, year, type, status, created_by) VALUES (?, 'x', ?, ?, 'pelicula', ?, ?)",
      [titulo(nombre), categoryId, anio, status, userId]
    );
    idsPeliculas.push(r.insertId);
    if (nota) {
      await pool.query("INSERT INTO reviews (user_id, movie_id, title, rating, comment) VALUES (?, ?, 't', ?, 'c')", [userId, r.insertId, nota]);
    }
  }
});

after(async () => {
  const pool = getPool();
  await pool.query('DELETE FROM movies WHERE id IN (?)', [idsPeliculas]);
  await pool.query('DELETE FROM categories WHERE id = ?', [categoryId]);
  await pool.query('DELETE FROM users WHERE id = ?', [userId]);
  server.close();
  await pool.end();
});

test('busca por categoria: devuelve solo las aprobadas, de mejor a peor calificacion', async () => {
  const { status, json, titulos } = await buscar('');
  assert.strictEqual(status, 200);
  assert.deepStrictEqual(titulos, [titulo('Vieja'), titulo('Media'), titulo('SinNota')]);
  assert.strictEqual(json.total, 3);
  assert.deepStrictEqual(Object.keys(json.data[0]).sort(), ['anio', 'calificacion', 'categoria', 'id', 'titulo']);
});

test('la calificacion se muestra en estrellas (promedio entre 2)', async () => {
  const { json } = await buscar('');
  assert.deepStrictEqual(json.data.map((p) => p.calificacion), [5, 3, 0]);
});

test('filtra por rango de calificacion', async () => {
  assert.deepStrictEqual((await buscar('&minRating=3&maxRating=4')).titulos, [titulo('Media')]);
  assert.deepStrictEqual((await buscar('&minRating=4.5')).titulos, [titulo('Vieja')]);
});

test('filtra por año de estreno', async () => {
  assert.deepStrictEqual((await buscar('&anioDesde=2015')).titulos, [titulo('Media'), titulo('SinNota')]);
  assert.deepStrictEqual((await buscar('&anioHasta=2010')).titulos, [titulo('Vieja')]);
});

test('combina los filtros', async () => {
  const { titulos } = await buscar('&minRating=1&maxRating=5&anioDesde=2015');
  assert.deepStrictEqual(titulos, [titulo('Media')]);
});

test('una categoria que no existe devuelve una lista vacia', async () => {
  const res = await fetch(`${baseUrl}/movies/search?categoria=NoExiste${sufijo}`);
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual((await res.json()).data, []);
});

test('valores invalidos responden 422 con el formato de errores', async () => {
  for (const query of ['&minRating=9', '&minRating=4&maxRating=2', '&anioDesde=abc', '&anioDesde=2020&anioHasta=2010']) {
    const { status, json } = await buscar(query);
    assert.strictEqual(status, 422, query);
    assert.strictEqual(json.status, 'error');
    assert.ok(json.errors.length);
  }
});
