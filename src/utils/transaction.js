const { getPool } = require('../config/db');

// Ejecuta trabajos dentro de una transaccion de MySQL
class Transaccion {
  // Corre `trabajo(conexion)`: si algo falla se hace rollback y el error sigue su camino;
  // la conexion siempre se devuelve al pool.
  static async ejecutar(trabajo) {
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
}

module.exports = { Transaccion, conTransaccion: (trabajo) => Transaccion.ejecutar(trabajo) };
