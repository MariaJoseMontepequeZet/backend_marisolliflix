const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const { connectDB } = require('../src/config/db');
const { resenas, likes } = require('./data/resenas_demo.json');

const USUARIOS = [
  { username: 'Majo', email: 'majo@marisolliflix.demo' },
  { username: 'Allis', email: 'allis@marisolliflix.demo' },
  { username: 'José', email: 'jose@marisolliflix.demo' },
  { username: 'Marcos', email: 'marcos@marisolliflix.demo' },
];

// Cuentas de demostración: la contraseña es aleatoria y no se guarda en ningún lado.
// Si ya hay una cuenta real con ese nombre (por ejemplo, alguien del equipo se registró
// como "Allis"), NO se usa: las reseñas de demostración nunca se escriben en cuentas reales,
// y ese usuario simplemente se omite.
async function obtenerUsuario(connection, { username, email }) {
  const [[demo]] = await connection.query('SELECT id FROM users WHERE email = ?', [email]);
  if (demo) return { id: demo.id, esDemo: true };
  const [[real]] = await connection.query('SELECT id, email FROM users WHERE username = ?', [username]);
  if (real) {
    console.log(`Se omite a "${username}": ya existe una cuenta real (${real.email}) y no se le escriben reseñas de demostración.`);
    return { id: null, esDemo: false };
  }
  const hash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
  const [r] = await connection.query(
    'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
    [username, email, hash, 'user']
  );
  return { id: r.insertId, esDemo: true };
}

async function seedResenas() {
  const pool = await connectDB();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Versión anterior del catálogo: reseñas firmadas por "IMDb_referencia"
    await connection.query("DELETE FROM users WHERE username = 'IMDb_referencia'");

    const idUsuario = new Map();
    const esDemo = new Map();
    for (const usuario of USUARIOS) {
      const { id, esDemo: demo } = await obtenerUsuario(connection, usuario);
      idUsuario.set(usuario.username, id);
      esDemo.set(usuario.username, demo);
    }

    const [peliculas] = await connection.query('SELECT id, title FROM movies');
    const idPelicula = new Map(peliculas.map((p) => [p.title, p.id]));

    let guardadas = 0;
    const faltantes = new Set();
    for (const { titulo, resenas: lista } of resenas) {
      const movieId = idPelicula.get(titulo);
      if (!movieId) {
        faltantes.add(titulo);
        continue;
      }
      for (const r of lista) {
        if (!idUsuario.get(r.usuario)) continue;
        const insertar = `INSERT INTO reviews (user_id, movie_id, title, rating, comment, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, NOW() - INTERVAL ? DAY, NOW() - INTERVAL ? DAY)`;
        const sql = `${insertar} ON DUPLICATE KEY UPDATE title = VALUES(title), rating = VALUES(rating), comment = VALUES(comment)`;
        const [resultado] = await connection.query(
          sql,
          [idUsuario.get(r.usuario), movieId, r.titulo, r.nota, r.comentario, r.haceDias, r.haceDias]
        );
        if (resultado.affectedRows) guardadas += 1;
      }
    }

    let votos = 0;
    for (const { titulo, autor, usuario } of likes) {
      const movieId = idPelicula.get(titulo);
      if (!movieId || !idUsuario.get(autor) || !idUsuario.get(usuario)) continue;
      const [[resena]] = await connection.query(
        'SELECT id FROM reviews WHERE movie_id = ? AND user_id = ?',
        [movieId, idUsuario.get(autor)]
      );
      if (!resena) continue;
      const [r] = await connection.query(
        'INSERT IGNORE INTO review_votes (review_id, user_id, value) VALUES (?, ?, 1)',
        [resena.id, idUsuario.get(usuario)]
      );
      votos += r.affectedRows;
    }

    await connection.commit();
    console.log(`Reseñas creadas o actualizadas: ${guardadas}`);
    console.log(`Likes nuevos: ${votos}`);
    if (faltantes.size) {
      console.log(`No están en la base (corre antes npm run seed:peliculas): ${[...faltantes].join(', ')}`);
    }
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

seedResenas().catch((error) => {
  console.error('No se pudieron cargar las reseñas:', error.message);
  process.exit(1);
});
