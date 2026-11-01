const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { connectDB, getPool } = require('../src/config/db');
const catalogo = require('../scripts/data/peliculas.json');
const original = require('../scripts/data/catalogo_original.json');
const { SOBRANTES, buscarSobrantes, borrar } = require('../scripts/limpiarCatalogo');

const GENEROS = [
  'Acción, aventura y bélica', 'Animación', 'Anime', 'Ciencia ficción', 'Comedia', 'Crimen y gánsters',
  'Drama', 'Fantasía', 'Romance', 'Superhéroes', 'Suspenso / thriller', 'Terror',
];

// ---------- Datos del catalogo (no necesitan base de datos) ----------

test('el catalogo tiene 112 peliculas, sin repetidas y con los 12 generos', () => {
  assert.strictEqual(catalogo.length, 112);
  assert.strictEqual(new Set(catalogo.map((p) => p.titulo.toLowerCase())).size, 112);
  assert.deepStrictEqual([...new Set(catalogo.map((p) => p.genero))].sort(), [...GENEROS].sort());
});

test('cada pelicula tiene titulo, año, sinopsis y portada con el formato correcto', () => {
  for (const p of catalogo) {
    assert.ok(p.titulo && p.titulo.length <= 255, `titulo: ${p.titulo}`);
    assert.ok(Number.isInteger(p.anio) && p.anio >= 1888, `anio: ${p.titulo}`);
    assert.ok(p.descripcion && p.descripcion.length <= 5000, `descripcion: ${p.titulo}`);
    assert.match(p.imagen, /^\/assets\/img\/portadas\/[a-z0-9-]+\.jpg$/, `imagen: ${p.titulo}`);
  }
  assert.strictEqual(new Set(catalogo.map((p) => p.imagen)).size, 112, 'portadas repetidas');
});

test('todas las del catalogo vienen de la lista original de 400 y los sobrantes son 288', () => {
  assert.strictEqual(original.length, 400);
  const titulosOriginal = new Set(original.map((p) => p.titulo.toLowerCase()));
  for (const p of catalogo) assert.ok(titulosOriginal.has(p.titulo.toLowerCase()), p.titulo);
  assert.strictEqual(SOBRANTES.length, 288);
});

// ---------- Limpieza de sobrantes (con base de datos) ----------

const sufijo = Date.now();
let categoryId;
let userId;
const ids = {};
let omitir = false;

before(async () => {
  await connectDB();
  const pool = getPool();
  const [existentes] = await pool.query('SELECT id FROM movies WHERE title IN (?, ?)', [SOBRANTES[0], SOBRANTES[1]]);
  // Si la base ya trae el catalogo original no se inventan datos encima de datos reales
  omitir = existentes.length > 0;
  if (omitir) return;

  const [cat] = await pool.query('INSERT INTO categories (name) VALUES (?)', [`LimpCat ${sufijo}`]);
  categoryId = cat.insertId;
  const [u] = await pool.query('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [`lim_${sufijo}`, `lim_${sufijo}@t.com`, 'x']);
  userId = u.insertId;

  const crear = async (titulo) => (await pool.query(
    `INSERT INTO movies (title, description, category_id, year, type, status, created_by)
     VALUES (?, 'd', ?, 2000, 'pelicula', 'approved', ?)`,
    [titulo, categoryId, userId]
  ))[0].insertId;
  ids.sobrante = await crear(SOBRANTES[0]);
  ids.conResenas = await crear(SOBRANTES[1]);
  ids.conservada = await crear(catalogo[0].titulo);
  ids.deUsuario = await crear(`Propuesta de un usuario ${sufijo}`);
  await pool.query('INSERT INTO reviews (user_id, movie_id, title, rating, comment) VALUES (?, ?, ?, ?, ?)', [userId, ids.conResenas, 't', 7, 'c']);
});

after(async () => {
  const pool = getPool();
  if (!omitir) {
    await pool.query('DELETE FROM movies WHERE id IN (?, ?, ?, ?)', [ids.sobrante, ids.conResenas, ids.conservada, ids.deUsuario]);
    await pool.query('DELETE FROM users WHERE id = ?', [userId]);
    await pool.query('DELETE FROM categories WHERE id = ?', [categoryId]);
  }
  await pool.end();
});

test('buscarSobrantes separa las borrables, las protegidas y no toca las demas', async (t) => {
  if (omitir) return t.skip('la base ya trae el catalogo original');
  const { candidatas, protegidas } = await buscarSobrantes(getPool());
  assert.ok(candidatas.some((c) => c.id === ids.sobrante), 'la sobrante sin reseñas debe ser candidata');
  assert.ok(protegidas.some((c) => c.id === ids.conResenas), 'la sobrante con reseñas debe quedar protegida');
  const todas = [...candidatas, ...protegidas].map((c) => c.id);
  assert.ok(!todas.includes(ids.conservada), 'una pelicula del catalogo nuevo no es sobrante');
  assert.ok(!todas.includes(ids.deUsuario), 'una propuesta de usuario nunca es sobrante');
});

test('borrar elimina solo las ids indicadas y conserva reseñas, catalogo y propuestas', async (t) => {
  if (omitir) return t.skip('la base ya trae el catalogo original');
  const pool = getPool();
  assert.strictEqual(await borrar(pool, []), 0);
  assert.strictEqual(await borrar(pool, [ids.sobrante]), 1);

  const [restantes] = await pool.query('SELECT id FROM movies WHERE id IN (?, ?, ?, ?)', [ids.sobrante, ids.conResenas, ids.conservada, ids.deUsuario]);
  assert.deepStrictEqual(restantes.map((r) => r.id).sort(), [ids.conResenas, ids.conservada, ids.deUsuario].sort());
  const [[{ resenas }]] = await pool.query('SELECT COUNT(*) AS resenas FROM reviews WHERE movie_id = ?', [ids.conResenas]);
  assert.strictEqual(resenas, 1);
});

test('ninguna pelicula del catalogo conserva la sinopsis de relleno y todas citan su fuente', () => {
  for (const p of catalogo) {
    assert.ok(!/pendiente de agregar/i.test(p.descripcion), `sinopsis de relleno: ${p.titulo}`);
    assert.match(p.fuente, /^https:\/\/es\.wikipedia\.org\/wiki\//, `fuente: ${p.titulo}`);
  }
});
