const bcrypt = require('bcryptjs');

// Crea el administrador con los datos del .env si todavia no existe.
// Usa la conexion que recibe en vez de abrir otra.
const seedAdmin = async (db) => {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('Faltan ADMIN_NAME, ADMIN_EMAIL o ADMIN_PASSWORD en el .env');
  }

  const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [ADMIN_EMAIL]);
  if (existing.length > 0) {
    console.log('El usuario administrador ya existe.');
    return;
  }

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await db.query(
    'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
    [ADMIN_NAME, ADMIN_EMAIL, hashedPassword, 'admin']
  );
  console.log('Usuario administrador creado exitosamente desde el .env');
};

module.exports = { seedAdmin };
