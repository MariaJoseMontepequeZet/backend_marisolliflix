const Repository = require('./Repository');
const Movie = require('../models/entities/Movie');
const { SELECT_CON_STATS } = require('./MovieRepository');

// "Mi lista": las peliculas que cada usuario guarda para ver despues. La tabla no tiene `id`
// (su clave es user_id + movie_id), por eso hereda de Repository y no de RepositoryConId.
class WatchlistRepository extends Repository {
  constructor() {
    super('watchlist_items');
  }

  // Cada elemento de la lista es una pelicula con sus estadisticas
  hidratar(fila) {
    return Movie.fromRow(fila);
  }

  // Peliculas guardadas por el usuario, las ultimas agregadas primero.
  // Solo cuentan las aprobadas: si una se rechaza despues, deja de aparecer.
  async findByUser(userId, { limit, offset }) {
    const [[{ total }]] = await this.ejecutor().query(
      `SELECT COUNT(*) AS total FROM watchlist_items w
       JOIN movies m ON m.id = w.movie_id
       WHERE w.user_id = ? AND m.status = 'approved'`,
      [userId]
    );
    const [filas] = await this.ejecutor().query(
      `${SELECT_CON_STATS}
       JOIN watchlist_items w ON w.movie_id = m.id
       WHERE w.user_id = ? AND m.status = 'approved'
       ORDER BY w.created_at DESC, m.id DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    return { total, movies: filas.map((fila) => this.hidratar(fila)) };
  }

  async tiene(userId, movieId) {
    const [filas] = await this.ejecutor().query(
      'SELECT 1 FROM watchlist_items WHERE user_id = ? AND movie_id = ?',
      [userId, movieId]
    );
    return filas.length > 0;
  }

  // La clave primaria (user_id, movie_id) evita duplicados; devuelve false si ya estaba
  async agregar(userId, movieId) {
    const [result] = await this.ejecutor().query(
      'INSERT IGNORE INTO watchlist_items (user_id, movie_id) VALUES (?, ?)',
      [userId, movieId]
    );
    return result.affectedRows > 0;
  }

  async quitar(userId, movieId) {
    const [result] = await this.ejecutor().query(
      'DELETE FROM watchlist_items WHERE user_id = ? AND movie_id = ?',
      [userId, movieId]
    );
    return result.affectedRows > 0;
  }
}

module.exports = { WatchlistRepository, watchlistRepository: new WatchlistRepository() };
