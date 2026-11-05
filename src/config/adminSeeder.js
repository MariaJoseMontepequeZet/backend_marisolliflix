const PasswordHasher = require('../utils/PasswordHasher');

// Crea el administrador con los datos del .env si todavia no existe.
// Usa la conexion que recibe en vez de abrir otra.
class AdminSeeder {
  #db;

  constructor(db) {
    this.#db = db;
  }

  async sembrar() {
    const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
    if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
      throw new Error('Faltan ADMIN_NAME, ADMIN_EMAIL o ADMIN_PASSWORD en el .env');
    }

    const [existentes] = await this.#db.query('SELECT id FROM users WHERE email = ?', [ADMIN_EMAIL]);
    if (existentes.length > 0) {
      console.log('El usuario administrador ya existe.');
      return;
    }

    const passwordHash = await PasswordHasher.hash(ADMIN_PASSWORD);
    await this.#db.query(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [ADMIN_NAME, ADMIN_EMAIL, passwordHash, 'admin']
    );
    console.log('Usuario administrador creado exitosamente desde el .env');
  }
}

module.exports = { AdminSeeder };
