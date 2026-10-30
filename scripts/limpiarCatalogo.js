// Quita las peliculas del catalogo anterior de 400 que ya no estan en el de 112.
//
//   npm run limpiar:catalogo              -> solo muestra que se borraria (no cambia nada)
//   npm run limpiar:catalogo -- --aplicar -> las borra
//
// Reglas de seguridad:
//   - Solo se consideran los titulos del catalogo original (scripts/data/catalogo_original.json)
//     que no estan en el nuevo (scripts/data/peliculas.json): nunca las que propuso un usuario.
//   - Una pelicula con reseñas NO se borra (se avisa y se conserva), para no perder opiniones.
const conservar = require('./data/peliculas.json');
const original = require('./data/catalogo_original.json');

const clave = (titulo) => titulo.toLowerCase();
const CONSERVADOS = new Set(conservar.map((p) => clave(p.titulo)));
const SOBRANTES = original.filter((p) => !CONSERVADOS.has(clave(p.titulo))).map((p) => p.titulo);

// Devuelve { candidatas, protegidas }: las que se pueden borrar y las que tienen reseñas
async function buscarSobrantes(db) {
  const [filas] = await db.query(
    `SELECT m.id, m.title, (SELECT COUNT(*) FROM reviews r WHERE r.movie_id = m.id) AS resenas
     FROM movies m WHERE m.title IN (?) ORDER BY m.title`,
    [SOBRANTES]
  );
  return {
    candidatas: filas.filter((f) => Number(f.resenas) === 0),
    protegidas: filas.filter((f) => Number(f.resenas) > 0),
  };
}

async function borrar(db, ids) {
  if (!ids.length) return 0;
  const [r] = await db.query('DELETE FROM movies WHERE id IN (?)', [ids]);
  return r.affectedRows;
}

async function main() {
  const { connectDB } = require('../src/config/db');
  const aplicar = process.argv.includes('--aplicar');
  const pool = await connectDB();
  try {
    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM movies');
    const { candidatas, protegidas } = await buscarSobrantes(pool);

    console.log(`Peliculas en la base: ${total}`);
    console.log(`Catalogo que se conserva: ${conservar.length} | sobrantes del catalogo anterior: ${SOBRANTES.length}`);
    console.log(`Sobrantes que existen en la base: ${candidatas.length + protegidas.length} (${candidatas.length} sin reseñas, ${protegidas.length} con reseñas)`);
    if (protegidas.length) {
      console.log('Con reseñas, se conservan:', protegidas.map((p) => `${p.title} (${p.resenas})`).join(', '));
    }

    if (!aplicar) {
      console.log(`\nNo se borro nada. Para borrar las ${candidatas.length} sin reseñas: npm run limpiar:catalogo -- --aplicar`);
      return;
    }
    const borradas = await borrar(pool, candidatas.map((c) => c.id));
    console.log(`\nBorradas: ${borradas}. Quedan ${total - borradas} peliculas.`);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('No se pudo limpiar el catalogo:', error.message);
    process.exit(1);
  });
}

module.exports = { SOBRANTES, CONSERVADOS, buscarSobrantes, borrar };
