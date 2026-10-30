// Carga el catalogo inicial de 400 peliculas (scripts/data/peliculas.json).
// Se puede correr varias veces: las categorias y titulos que ya existen se saltan
// (INSERT IGNORE + indices unicos). Las peliculas quedan aprobadas y a nombre del admin.
// Uso: npm run seed:peliculas
const { connectDB } = require('../src/config/db');
const { seedAdmin } = require('../src/config/adminSeeder');
const peliculas = require('./data/peliculas.json');

const TAMANO_LOTE = 100;

async function seedPeliculas() {
  const pool = await connectDB();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Admin dueno de las peliculas (se crea desde el .env si todavia no existe)
    await seedAdmin(connection);
    const [[admin]] = await connection.query('SELECT id FROM users WHERE email = ?', [process.env.ADMIN_EMAIL]);

    // 2. Categorias. El nombre es unico sin distinguir mayusculas, asi que
    // "Ciencia ficcion" reutiliza la que ya existe como "Ciencia Ficcion".
    const generos = [...new Set(peliculas.map((p) => p.genero))];
    const [catsNuevas] = await connection.query('INSERT IGNORE INTO categories (name) VALUES ?', [
      generos.map((g) => [g]),
    ]);
    const [categorias] = await connection.query('SELECT id, name FROM categories');
    const idPorNombre = new Map(categorias.map((c) => [c.name.toLowerCase(), c.id]));

    // 3. Peliculas, en lotes
    const filas = peliculas.map((p) => [
      p.titulo,
      p.descripcion,
      idPorNombre.get(p.genero.toLowerCase()),
      p.anio,
      p.genero === 'Anime' ? 'anime' : 'pelicula',
      'approved',
      admin.id,
    ]);
    let nuevas = 0;
    for (let i = 0; i < filas.length; i += TAMANO_LOTE) {
      const [r] = await connection.query(
        'INSERT IGNORE INTO movies (title, description, category_id, year, type, status, created_by) VALUES ?',
        [filas.slice(i, i + TAMANO_LOTE)]
      );
      nuevas += r.affectedRows;
    }

    await connection.commit();
    console.log(`Categorias nuevas: ${catsNuevas.affectedRows} de ${generos.length}`);
    console.log(`Peliculas nuevas: ${nuevas} de ${peliculas.length} (las ${peliculas.length - nuevas} restantes ya existian)`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

seedPeliculas().catch((error) => {
  console.error('No se pudo cargar el catalogo:', error.message);
  process.exit(1);
});
