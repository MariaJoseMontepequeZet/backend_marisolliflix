const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { connectDB, getPool } = require('../src/config/db');

const sufijo = Date.now();
let categoryId;
let creadorId;
let usuarios = [];
let n = 0;

const ranking = async (movieId) => {
  const [[fila]] = await getPool().query('SELECT ranking_score FROM movie_stats WHERE movie_id = ?', [movieId]);
  return Number(fila.ranking_score);
};

async function nuevaPelicula() {
  n += 1;
  const [r] = await getPool().query(
    `INSERT INTO movies (title, description, category_id, year, type, status, created_by)
     VALUES (?, 'd', ?, 2020, 'pelicula', 'approved', ?)`,
    [`rk${n} ${sufijo}`, categoryId, creadorId]
  );
  return r.insertId;
}

// Crea una reseña de usuarios[indice]; diasAtras mueve su fecha al pasado
async function resena(movieId, indice, rating, diasAtras = 0) {
  const [r] = await getPool().query(
    `INSERT INTO reviews (user_id, movie_id, title, rating, comment, created_at)
     VALUES (?, ?, 't', ?, 'c', DATE_SUB(NOW(), INTERVAL ? DAY))`,
    [usuarios[indice], movieId, rating, diasAtras]
  );
  return r.insertId;
}

const votar = (reviewId, indice, value) =>
  getPool().query('INSERT INTO review_votes (review_id, user_id, value) VALUES (?, ?, ?)', [reviewId, usuarios[indice], value]);

before(async () => {
  await connectDB();
  const pool = getPool();
  const [cat] = await pool.query('INSERT INTO categories (name) VALUES (?)', [`RkCat ${sufijo}`]);
  categoryId = cat.insertId;
  for (let i = 0; i < 6; i += 1) {
    const [u] = await pool.query(`INSERT INTO users (username, email, password) VALUES (?, ?, 'x')`, [`rk${i}_${sufijo}`, `rk${i}_${sufijo}@t.com`]);
    usuarios.push(u.insertId);
  }
  creadorId = usuarios[5];
});

after(async () => {
  const pool = getPool();
  await pool.query('DELETE FROM movies WHERE title LIKE ?', [`% ${sufijo}`]);
  await pool.query('DELETE FROM users WHERE username LIKE ?', [`rk%_${sufijo}`]);
  await pool.query('DELETE FROM categories WHERE id = ?', [categoryId]);
  await pool.end();
});

test('una pelicula sin reseñas tiene ranking 0', async () => {
  assert.strictEqual(await ranking(await nuevaPelicula()), 0);
});

test('mas calificacion da mas ranking', async () => {
  const alta = await nuevaPelicula();
  const baja = await nuevaPelicula();
  await resena(alta, 0, 9);
  await resena(baja, 0, 4);
  assert.ok((await ranking(alta)) > (await ranking(baja)));
});

test('los likes suben el ranking y los dislikes lo bajan', async () => {
  const base = await nuevaPelicula();
  const conLikes = await nuevaPelicula();
  const conDislikes = await nuevaPelicula();
  // dos reseñas de distinto valor para que el peso de cada una importe
  const [b1, b2] = [await resena(base, 0, 10), await resena(base, 1, 2)];
  const [l1, l2] = [await resena(conLikes, 0, 10), await resena(conLikes, 1, 2)];
  const [d1, d2] = [await resena(conDislikes, 0, 10), await resena(conDislikes, 1, 2)];
  await votar(l1, 2, 1);
  await votar(l1, 3, 1);
  await votar(d1, 2, -1);
  await votar(d1, 3, -1);
  assert.ok(b1 && b2 && l2 && d2);
  const [rBase, rLikes, rDislikes] = [await ranking(base), await ranking(conLikes), await ranking(conDislikes)];
  assert.ok(rLikes > rBase, `likes ${rLikes} > base ${rBase}`);
  assert.ok(rDislikes < rBase, `dislikes ${rDislikes} < base ${rBase}`);
});

test('una reseña antigua pesa menos que una reciente', async () => {
  const antiguaBaja = await nuevaPelicula(); // la mala es vieja
  const recienteBaja = await nuevaPelicula(); // la mala es reciente
  await resena(antiguaBaja, 0, 10);
  await resena(antiguaBaja, 1, 2, 730);
  await resena(recienteBaja, 0, 10);
  await resena(recienteBaja, 1, 2, 0);
  assert.ok((await ranking(antiguaBaja)) > (await ranking(recienteBaja)));
});

test('con pocas reseñas el ranking se acerca al promedio general (5.5)', async () => {
  const una = await nuevaPelicula();
  await resena(una, 0, 10);
  const r = await ranking(una);
  assert.ok(r > 5.5 && r < 10, `ranking=${r}`);
});
