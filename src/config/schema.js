// Crea las tablas si no existen. Todas son InnoDB para poder usar transacciones.
// Los titulos usan una collation case-insensitive, asi el indice unico
// tambien bloquea "Matrix" y "matrix" como repetidos.
const tablas = [
  `CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_users_email (email),
    UNIQUE KEY uq_users_username (username)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

];

async function initSchema(pool) {
  for (const sql of tablas) {
    await pool.query(sql);
  }
}

module.exports = initSchema;
