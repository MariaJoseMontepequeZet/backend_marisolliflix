const { getPool } = require('./db');
const bcrypt = require('bcrypt');

const seedAdmin = async () => {
    const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

    if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
        console.error('Error: Faltan las variables ADMIN_NAME, ADMIN_EMAIL o ADMIN_PASSWORD en el archivo .env');
        process.exit(1);
    }

    if (ADMIN_PASSWORD.length < 8) {
        console.error('Error: La contraseña del administrador en el .env debe tener al menos 8 caracteres.');
        process.exit(1);
    }

    let connection;
    try {
        const pool = await getPool();
        connection = await pool.getConnection();

        const [existing] = await connection.query('SELECT id FROM users WHERE email = ?', [ADMIN_EMAIL]);
        if (existing.length > 0) {
            console.log('ℹEl usuario administrador ya existe en la base de datos.');
            connection.release();
            process.exit(0);
        }

        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

        await connection.query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [ADMIN_NAME, ADMIN_EMAIL, hashedPassword, 'admin']
        );

        console.log('Administrador creado exitosamente desde el .env');
        connection.release();
        process.exit(0);

    } catch (error) {
        if (connection) connection.release();
        console.error('Error en el seeder de admin:', error.message);
        process.exit(1);
    }
};

seedAdmin();