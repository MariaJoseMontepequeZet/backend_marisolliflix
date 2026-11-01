const { getPool } = require('../config/db');

// Clase base de los repositorios: sabe hablar con MySQL y obliga a cada repositorio concreto
// a decir como convierte una fila en su entidad (hidratar).
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
}

module.exports = Repository;
