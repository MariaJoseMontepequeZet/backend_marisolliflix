const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { connectDB, getPool } = require('../src/config/db');

before(async () => {
  await connectDB();
});

after(async () => {
  await getPool().end();
});

const consultar = async (sql, valores = []) => (await getPool().query(sql, valores))[0];

test('movies no guarda datos derivados de reseñas ni votos', async () => {
  const columnas = (await consultar('SHOW COLUMNS FROM movies')).map((c) => c.Field);
  for (const derivada of ['review_count', 'avg_rating', 'likes', 'dislikes', 'ranking_score']) {
    assert.ok(!columnas.includes(derivada), `movies no debe tener ${derivada}`);
  }
});

test('review_votes tiene clave primaria (review_id, user_id)', async () => {
  const pk = await consultar(
    `SELECT COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'review_votes' AND CONSTRAINT_NAME = 'PRIMARY'
     ORDER BY ORDINAL_POSITION`
  );
  assert.deepStrictEqual(pk.map((c) => c.COLUMN_NAME), ['review_id', 'user_id']);
});

test('la base rechaza una calificacion fuera de 1-10 y un voto distinto de 1 o -1', async () => {
  await assert.rejects(
    getPool().query('INSERT INTO reviews (user_id, movie_id, title, rating, comment) VALUES (0, 0, "x", 11, "x")'),
    (e) => e.code === 'ER_CHECK_CONSTRAINT_VIOLATED'
  );
  await assert.rejects(
    getPool().query('INSERT INTO review_votes (review_id, user_id, value) VALUES (0, 0, 5)'),
    (e) => e.code === 'ER_CHECK_CONSTRAINT_VIOLATED'
  );
});

test('movie_stats calcula las estadisticas desde reviews y review_votes', async () => {
  const pool = getPool();
  const sufijo = Date.now();
  const [u1] = await pool.query('INSERT INTO users (username, email, password) VALUES (?, ?, "x")', [`n1_${sufijo}`, `n1_${sufijo}@t.com`]);
  const [u2] = await pool.query('INSERT INTO users (username, email, password) VALUES (?, ?, "x")', [`n2_${sufijo}`, `n2_${sufijo}@t.com`]);
  const [cat] = await pool.query('INSERT INTO categories (name) VALUES (?)', [`cat_${sufijo}`]);
  const [mov] = await pool.query(
    `INSERT INTO movies (title, description, category_id, year, type, status, created_by)
     VALUES (?, "d", ?, 2020, "pelicula", "approved", ?)`,
    [`peli_${sufijo}`, cat.insertId, u1.insertId]
  );
  try {
    const [r1] = await pool.query('INSERT INTO reviews (user_id, movie_id, title, rating, comment) VALUES (?, ?, "a", 10, "c")', [u1.insertId, mov.insertId]);
    await pool.query('INSERT INTO reviews (user_id, movie_id, title, rating, comment) VALUES (?, ?, "b", 6, "c")', [u2.insertId, mov.insertId]);
    await pool.query('INSERT INTO review_votes (review_id, user_id, value) VALUES (?, ?, 1)', [r1.insertId, u2.insertId]);

    const [s] = await consultar('SELECT * FROM movie_stats WHERE movie_id = ?', [mov.insertId]);
    // Un voto sobre una reseña no debe alterar el promedio (8.00) ni el conteo
    assert.strictEqual(Number(s.review_count), 2);
    assert.strictEqual(Number(s.avg_rating), 8);
    assert.strictEqual(Number(s.likes), 1);
    assert.strictEqual(Number(s.dislikes), 0);
    // pesos: 1.2 (la de 10, con un like) y 1 (la de 6) => (18 + 11) / (2.2 + 2 + ...) = 29 / 4.2
    assert.ok(Math.abs(Number(s.ranking_score) - 29 / 4.2) < 0.01, `ranking_score=${s.ranking_score}`);
  } finally {
    await pool.query('DELETE FROM movies WHERE id = ?', [mov.insertId]);
    await pool.query('DELETE FROM categories WHERE id = ?', [cat.insertId]);
    await pool.query('DELETE FROM users WHERE id IN (?, ?)', [u1.insertId, u2.insertId]);
  }
});
