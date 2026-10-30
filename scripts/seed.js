const { connectDB } = require('../src/config/db');
const { seedAdmin } = require('../src/config/adminSeeder');
const CATEGORIAS = ['Anime', 'Ciencia Ficción', 'Superhéroes', 'Fantasía'];

async function runSeed() {
    const pool = await connectDB();
    const connection = await pool.getConnection();

    try {
        console.log('Iniciando seeders...');

        // 1. Seed de categorías
        const [result] = await connection.query(
            'INSERT IGNORE INTO categories (name) VALUES ?',
            [CATEGORIAS.map((nombre) => [nombre])]
        );
        console.log(`Categorías nuevas: ${result.affectedRows} de ${CATEGORIAS.length}`);

        // 2. Seed de Administrador (HU-03)
        await seedAdmin(connection);

        connection.release();
        await pool.end();
        console.log('¡Todos los seeders se ejecutaron con éxito!');
        process.exit(0);

    } catch (error) {
        if (connection) connection.release();
        if (pool) await pool.end();
        console.error('Error al ejecutar los seeders:', error.message);
        process.exit(1);
    }
}

runSeed();
