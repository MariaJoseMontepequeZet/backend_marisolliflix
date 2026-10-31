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

    // 2. Categorias
    const generos = [...new Set(peliculas.map((p) => p.genero))];
    const [catsNuevas] = await connection.query('INSERT IGNORE INTO categories (name) VALUES ?', [
      generos.map((g) => [g]),
    ]);
    const [categorias] = await connection.query('SELECT id, name FROM categories');
    const idPorNombre = new Map(categorias.map((c) => [c.name.toLowerCase(), c.id]));

    // 3. Peliculas nuevas, en lotes
    const [existentes] = await connection.query('SELECT title FROM movies');
    const yaExisten = new Set(existentes.map((f) => f.title.toLowerCase()));
    const porCrear = peliculas.filter((p) => !yaExisten.has(p.titulo.toLowerCase()));
    const filas = porCrear.map((p) => [
      p.titulo,
      p.descripcion,
      idPorNombre.get(p.genero.toLowerCase()),
      p.anio,
      p.imagen,
      p.genero === 'Anime' ? 'anime' : 'pelicula',
      'approved',
      admin.id,
    ]);
    let nuevas = 0;
    for (let i = 0; i < filas.length; i += TAMANO_LOTE) {
      const [r] = await connection.query(
        'INSERT IGNORE INTO movies (title, description, category_id, year, image_url, type, status, created_by) VALUES ?',
        [filas.slice(i, i + TAMANO_LOTE)]
      );
      nuevas += r.affectedRows;
    }

    // 4. Las que ya existian y no tenian portada la reciben (nunca se pisa una portada puesta a mano)
    let conPortadaNueva = 0;
    for (const p of peliculas) {
      const [r] = await connection.query(
        'UPDATE movies SET image_url = ? WHERE title = ? AND image_url IS NULL',
        [p.imagen, p.titulo]
      );
      conPortadaNueva += r.affectedRows;
    }

    await connection.commit();
    console.log(`Categorias nuevas: ${catsNuevas.affectedRows} de ${generos.length}`);
    console.log(`Peliculas nuevas: ${nuevas} de ${peliculas.length}`);
    console.log(`Peliculas que ya existian y recibieron su portada: ${conPortadaNueva}`);
    console.log('Si venias del catalogo anterior de 400, quita las sobrantes con: npm run limpiar:catalogo');
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
