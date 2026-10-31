const { getPool } = require('../config/db');

// Clase base de los repositorios: sabe hablar con MySQL y obliga a cada repositorio concreto
// a decir como convierte una fila en su entidad (hidratar). Lo que es igual para todas las
// tablas (buscar por id, borrar) se hereda; lo que es propio de cada una se sobrescribe.
class Repository {
  #tabla;

  constructor(tabla) {
    if (new.target === Repository) {
      throw new Error('Repository es una clase abstracta: usa uno de sus repositorios concretos');
    }
    this.#tabla = tabla;
  }

  get tabla() {
    return this.#tabla;
  }

  // Dentro de una transaccion se pasa su conexion; fuera de ella se usa el pool
  ejecutor(conexion) {
    return conexion || getPool();
  }

  hidratar() {
    throw new Error(`${this.constructor.name} debe implementar hidratar()`);
  }

  async findById(id, conexion) {
    const [filas] = await this.ejecutor(conexion).query(`SELECT * FROM ${this.#tabla} WHERE id = ?`, [id]);
    return filas.length ? this.hidratar(filas[0]) : null;
  }

  async remove(id, conexion) {
    const [result] = await this.ejecutor(conexion).query(`DELETE FROM ${this.#tabla} WHERE id = ?`, [id]);
    return result.affectedRows > 0;
  }
}

module.exports = Repository;
