const mysql = require('mysql2/promise');
const env = require('./env');
const initSchema = require('./schema');

let pool = null;

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
  await initSchema(pool);
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
