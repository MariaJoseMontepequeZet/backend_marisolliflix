const Repository = require('./Repository');

// Repositorio de una tabla con columna `id`: aporta buscar por id y borrar por id.
// Las tablas sin `id` (reseñas con votos, "mi lista") heredan directo de Repository.
class RepositoryConId extends Repository {
  async findById(id, conexion) {
    const [filas] = await this.ejecutor(conexion).query(`SELECT * FROM ${this.tabla} WHERE id = ?`, [id]);
    return filas.length ? this.hidratar(filas[0]) : null;
  }

  async remove(id, conexion) {
    const [result] = await this.ejecutor(conexion).query(`DELETE FROM ${this.tabla} WHERE id = ?`, [id]);
    return result.affectedRows > 0;
  }
}

module.exports = RepositoryConId;
