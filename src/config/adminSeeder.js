const bcrypt = require('bcryptjs');
const { connectDB } = require('./db');

const seedAdmin = async () => {
    try {
        const adminEmail = process.env.ADMIN_EMAIL;
        const db = await connectDB();
        
        // Verificar si ya existe en la base de datos
        const [existing] = await db.query('SELECT * FROM users WHERE email = ?', [adminEmail]);
        
        if (existing.length > 0) {
            console.log('El usuario administrador ya existe.');
            return;
        }

        // Si no existe, lo creamos tomando los datos del .env
        const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
        
        await db.query(
            'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
            [process.env.ADMIN_NAME, adminEmail, hashedPassword, 'admin']
        );

        console.log('Usuario administrador creado exitosamente desde el .env');
    } catch (error) {
        console.error('Error al ejecutar el seed del administrador:', error);
    }
};

module.exports = { seedAdmin };