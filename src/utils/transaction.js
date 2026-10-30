const { getPool } = require('../config/db');

// Ejecuta `trabajo(conexion)` dentro de una transaccion: si algo falla se hace
// rollback y el error sigue su camino; la conexion siempre se devuelve al pool.
async function conTransaccion(trabajo) {
  const conexion = await getPool().getConnection();
  try {
    await conexion.beginTransaction();
    const resultado = await trabajo(conexion);
    await conexion.commit();
    return resultado;
  } catch (error) {
    await conexion.rollback().catch(() => {});
    throw error;
  } finally {
    conexion.release();
  }
}

module.exports = { conTransaccion };
