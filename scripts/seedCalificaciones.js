const { connectDB } = require('../src/config/db');
const calificaciones = require('./data/calificaciones_imdb.json');

async function seedCalificaciones() {
  const pool = await connectDB();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    let actualizadas = 0;
    const faltantes = [];
    for (const { titulo, imdb } of calificaciones) {
      const [r] = await connection.query('UPDATE movies SET imdb_rating = ? WHERE title = ?', [imdb, titulo]);
      if (r.affectedRows) actualizadas += 1;
      else faltantes.push(titulo);
    }
    await connection.commit();
    console.log(`Películas con calificación de IMDb: ${actualizadas} de ${calificaciones.length}`);
    if (faltantes.length) {
      console.log(`No están en la base (corre antes npm run seed:peliculas): ${faltantes.join(', ')}`);
    }
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

seedCalificaciones().catch((error) => {
  console.error('No se pudieron cargar las calificaciones:', error.message);
  process.exit(1);
});
