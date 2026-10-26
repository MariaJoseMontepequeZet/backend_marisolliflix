const mysql = require('mysql2/promise');
const env = require('./env');

let pool = null;

// Crea la base de datos si no existe y luego abre el pool de conexiones.
// Se usa el driver oficial mysql2 (sin ORM). Las tablas deben ser InnoDB
// para poder usar transacciones en las operaciones criticas.
async function connectDB() {
  const conexion = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
  });
  await conexion.query(`CREATE DATABASE IF NOT EXISTS \`${env.DB_NAME}\``);
  await conexion.end();

  pool = mysql.createPool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
  });

  await pool.query('SELECT 1');
  console.log(`Conectado a MySQL, base de datos: ${env.DB_NAME}`);
  return pool;
}

function getPool() {
  if (!pool) {
    throw new Error('La base de datos no esta conectada, llama primero a connectDB()');
  }
  return pool;
}

module.exports = { connectDB, getPool };
