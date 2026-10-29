require('dotenv').config();

// Variables que el servidor necesita si o si para arrancar
const requeridas = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'];

requeridas.forEach((nombre) => {
  if (!process.env[nombre]) {
    console.error(`Falta la variable de entorno ${nombre}, revisa tu archivo .env`);
    process.exit(1);
  }
});

module.exports = {
  PORT: process.env.PORT || 3000,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: Number(process.env.DB_PORT) || 3306,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_NAME: process.env.DB_NAME,
  // En true se conecta con SSL (Aiven lo exige)
  DB_SSL: process.env.DB_SSL === 'true',
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES: process.env.JWT_EXPIRES || '1h',
  FRONT_URL: process.env.FRONT_URL || 'http://localhost:5500',
};
