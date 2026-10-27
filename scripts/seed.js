// Carga las categorías y el usuario administrador inicial.
const { connectDB } = require('../src/config/db');
const seedAdmin = require('../src/config/adminSeeder'); // Importamos tu seeder de admin

const CATEGORIAS = ['Anime', 'Ciencia Ficción', 'Superhéroes', 'Fantasía'];

async function seed() {
    const pool = await connectDB();
    
    // 1. Seed de categorías
    const [result] = await pool.query('INSERT IGNORE INTO categories (name) VALUES ?', [
        CATEGORIAS.map((nombre) => [nombre]),
    ]);
    console.log(`Categorias nuevas: ${result.affectedRows} de ${CATEGORIAS.length}`);

    // 2. Seed del administrador desde el .env
    await seedAdmin();

    await pool.end();
    process.exit(0);
}

seed().catch((error) => {
    console.error('No se pudo cargar el seed:', error.message);
    process.exit(1);
});
