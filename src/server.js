const env = require('./config/env');
const app = require('./app');
const { connectDB } = require('./config/db');
const { API_PREFIX, API_VERSION } = require('./utils/version');

async function start() {
  try {
    await connectDB();
    app.listen(env.PORT, () => {
      console.log(`Servidor v${API_VERSION} corriendo en http://localhost:${env.PORT}${API_PREFIX}`);
    });
  } catch (error) {
    console.error('No se pudo iniciar el servidor:', error.message);
    process.exit(1);
  }
}

start();
