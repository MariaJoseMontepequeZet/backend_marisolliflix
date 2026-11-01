const { movieRepository } = require('../repositories/MovieRepository');
const { reviewRepository } = require('../repositories/ReviewRepository');
const { watchlistRepository } = require('../repositories/WatchlistRepository');
const AppError = require('../utils/AppError');

// Alias aceptados en ?sort=
const ALIAS_SORT = { popularity: 'popularidad', year: 'anio' };

const MENSAJE_TITULO_REPETIDO = 'Ya existe una pelicula o serie con ese titulo';
const MENSAJE_NO_ENCONTRADA = 'Pelicula o serie no encontrada';

// Reglas del catalogo: quien puede ver, proponer y aprobar peliculas y series
class MovieService {
  #peliculas;
  #resenas;
  #lista;

  constructor(peliculas = movieRepository, resenas = reviewRepository, lista = watchlistRepository) {
    this.#peliculas = peliculas;
    this.#resenas = resenas;
    this.#lista = lista;
  }

  // Un usuario propone (queda pending); el admin publica directo (approved)
  async crear(datos, usuario) {
    try {
      await this.#validarCategoria(datos.categoryId);
      const status = usuario.esAdmin ? 'approved' : 'pending';
      return await this.#peliculas.create({ ...datos, status }, usuario.id);
    } catch (error) {
      throw this.#traducirErrorDeBd(error);
    }
  }

  // El publico ve solo las aprobadas; el admin puede filtrar por ?status=
  async listar(query, usuario) {
    // category, popularity y year son alias de categoryId, popularidad y anio
    const categoryId = query.categoryId || query.category;
    const sort = ALIAS_SORT[query.sort] || query.sort;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;

    const status = usuario && usuario.esAdmin ? query.status : 'approved';
    const { total, movies } = await this.#peliculas.findAll(
      { categoryId, type: query.type, q: query.q, status },
      { limit, offset: (page - 1) * limit, sort }
    );
    return { movies, total, page, limit };
  }

  // Si no esta aprobada solo la ven el admin y quien la propuso. Devuelve { movie, reviews, inWatchlist }
  async obtener(id, usuario) {
    const movie = await this.#peliculas.findById(id);
    if (!movie || !movie.puedeVerla(usuario)) throw new AppError(MENSAJE_NO_ENCONTRADA, 404);
    const [reviews, inWatchlist] = await Promise.all([
      this.#resenas.findByMovie(movie.id, usuario ? usuario.id : null),
      usuario ? this.#lista.tiene(usuario.id, movie.id) : false,
    ]);
    return { movie, reviews, inWatchlist };
  }

  // Las aprobadas con mejor ranking
  async ranking(query) {
    const limit = Number(query.limit) || 10;
    const { total, movies } = await this.#peliculas.findAll(
      { status: 'approved', categoryId: query.categoryId, type: query.type },
      { limit, offset: 0, sort: 'ranking' }
    );
    return { movies, total };
  }

  // Cola de propuestas por revisar: las mas viejas primero
  async pendientes(query) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const { total, movies } = await this.#peliculas.findAll(
      { status: 'pending' },
      { limit, offset: (page - 1) * limit, oldestFirst: true }
    );
    return { movies, total, page, limit };
  }

  // Aprobar o rechazar
  async cambiarEstado(id, { status }) {
    await this.#existente(id);
    return this.#peliculas.update(id, { status });
  }

  async actualizar(id, cambios) {
    await this.#existente(id);
    try {
      if (cambios.categoryId !== undefined) await this.#validarCategoria(cambios.categoryId);
      return await this.#peliculas.update(id, cambios);
    } catch (error) {
      throw this.#traducirErrorDeBd(error);
    }
  }

  async eliminar(id) {
    if (!(await this.#peliculas.remove(id))) throw new AppError(MENSAJE_NO_ENCONTRADA, 404);
  }

  async #existente(id) {
    const movie = await this.#peliculas.findById(id);
    if (!movie) throw new AppError(MENSAJE_NO_ENCONTRADA, 404);
    return movie;
  }

  async #validarCategoria(categoryId) {
    if (!(await this.#peliculas.categoryExists(categoryId))) {
      throw new AppError('Datos invalidos', 422, [
        { field: 'categoryId', message: 'La categoria no existe' },
      ]);
    }
  }

  // El indice unico de title es la garantia final (evita carreras entre dos peticiones)
  #traducirErrorDeBd(error) {
    if (error.code === 'ER_DUP_ENTRY') return new AppError(MENSAJE_TITULO_REPETIDO, 409);
    return error;
  }
}

module.exports = { MovieService, movieService: new MovieService() };
