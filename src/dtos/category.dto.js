// Crear y editar una categoria llevan los mismos datos: el nombre
class CategoriaDTO {
  constructor(body = {}) {
    this.name = body.name;
  }
}

module.exports = { CategoriaDTO };
