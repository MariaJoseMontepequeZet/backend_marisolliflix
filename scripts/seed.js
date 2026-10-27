// Carga las categorias iniciales. Se puede correr muchas veces: las que ya
// existen se saltan (INSERT IGNORE + indice unico en name).
// Uso: npm run seed
const { connectDB } = require('../src/config/db');

const CATEGORIAS = ['Anime', 'Ciencia Ficción', 'Superhéroes', 'Fantasía'];

async function seed() {
  const pool = await connectDB();
  const [result] = await pool.query('INSERT IGNORE INTO categories (name) VALUES ?', [
    CATEGORIAS.map((nombre) => [nombre]),
  ]);
  console.log(`Categorias nuevas: ${result.affectedRows} de ${CATEGORIAS.length}`);
  await pool.end();
}

seed().catch((error) => {
  console.error('No se pudo cargar el seed:', error.message);
  process.exit(1);
});
