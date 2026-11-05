const mysql = require('mysql2/promise');
const env = require('./env');
const { EsquemaBD } = require('./schema');

// Conexion a MySQL con el driver oficial mysql2 (sin ORM). Las tablas son InnoDB
// para poder usar transacciones en las operaciones criticas.
class Database {
  #pool = null;

  // Crea la base de datos si no existe, abre el pool y prepara las tablas
  async connectDB() {
    const conexion = await mysql.createConnection({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
    });
    await conexion.query(`CREATE DATABASE IF NOT EXISTS \`${env.DB_NAME}\``);
    await conexion.end();

    this.#pool = mysql.createPool({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
    });

    await this.#pool.query('SELECT 1');
    await new EsquemaBD(this.#pool).preparar();
    console.log(`Conectado a MySQL, base de datos: ${env.DB_NAME}`);
    return this.#pool;
  }

  getPool() {
    if (!this.#pool) {
      throw new Error('La base de datos no esta conectada, llama primero a connectDB()');
    }
    return this.#pool;
  }
}

const database = new Database();

module.exports = {
  Database,
  connectDB: database.connectDB.bind(database),
  getPool: database.getPool.bind(database),
};
