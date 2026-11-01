const { movieRepository } = require('../repositories/MovieRepository');
const { watchlistRepository } = require('../repositories/WatchlistRepository');
const AppError = require('../utils/AppError');

// Reglas de "Mi lista": cada usuario solo ve y cambia la suya, y solo se guardan peliculas aprobadas
class WatchlistService {
  #peliculas;
  #lista;

  constructor(peliculas = movieRepository, lista = watchlistRepository) {
    this.#peliculas = peliculas;
    this.#lista = lista;
  }

  async listar(usuario, query) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 36;
    const { total, movies } = await this.#lista.findByUser(usuario.id, { limit, offset: (page - 1) * limit });
    return { movies, total, page, limit };
  }

  // Devuelve { movieId, agregada }: false si ya estaba en la lista
  async agregar(movieId, usuario) {
    const movie = await this.#peliculas.findById(movieId);
    if (!movie || !movie.aprobada) throw new AppError('Pelicula o serie no encontrada', 404);
    const agregada = await this.#lista.agregar(usuario.id, movie.id);
    return { movieId: movie.id, agregada };
  }

  async quitar(movieId, usuario) {
    if (!(await this.#lista.quitar(usuario.id, movieId))) {
      throw new AppError('La pelicula no esta en tu lista', 404);
    }
  }
}

module.exports = { WatchlistService, watchlistService: new WatchlistService() };
