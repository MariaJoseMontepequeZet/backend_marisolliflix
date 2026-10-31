const { categoryRepository } = require('../repositories/CategoryRepository');
const AppError = require('../utils/AppError');

const MENSAJE_NO_ENCONTRADA = 'Categoria no encontrada';
const MENSAJE_EN_USO = 'No se puede eliminar una categoria que tiene peliculas asociadas';

class CategoryService {
  #categorias;

  constructor(categorias = categoryRepository) {
    this.#categorias = categorias;
  }

  listar() {
    return this.#categorias.findAll();
  }

  async obtener(id) {
    const categoria = await this.#categorias.findById(id);
    if (!categoria) throw new AppError(MENSAJE_NO_ENCONTRADA, 404);
    return categoria;
  }

  async crear({ name }) {
    try {
      return await this.#categorias.create(name);
    } catch (error) {
      throw this.#traducirErrorDeBd(error);
    }
  }

  async actualizar(id, { name }) {
    await this.obtener(id);
    try {
      return await this.#categorias.update(id, name);
    } catch (error) {
      throw this.#traducirErrorDeBd(error);
    }
  }

  // No se borra si tiene peliculas
  async eliminar(id) {
    await this.obtener(id);
    if ((await this.#categorias.countMovies(id)) > 0) throw new AppError(MENSAJE_EN_USO, 409);
    try {
      await this.#categorias.remove(id);
    } catch (error) {
      // Una pelicula pudo asociarse justo despues del conteo: la llave foranea lo frena
      if (error.code === 'ER_ROW_IS_REFERENCED_2') throw new AppError(MENSAJE_EN_USO, 409);
      throw error;
    }
  }

  // El indice unico de name es la garantia final contra duplicados simultaneos
  #traducirErrorDeBd(error) {
    if (error.code === 'ER_DUP_ENTRY') return new AppError('Ya existe una categoria con ese nombre', 409);
    return error;
  }
}

module.exports = { CategoryService, categoryService: new CategoryService() };
