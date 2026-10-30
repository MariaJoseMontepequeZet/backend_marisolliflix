const Repository = require('./Repository');
const Review = require('../models/entities/Review');

// Las operaciones que cambian datos reciben la `conexion` de la transaccion del servicio,
// para que todo se confirme (o se deshaga) junto.
class ReviewRepository extends Repository {
  constructor() {
    super('reviews');
  }

  hidratar(fila) {
    return Review.fromRow(fila);
  }

  // Reseñas de una pelicula con el autor y sus votos (las mas recientes primero).
  // Si se indica `viewerId`, cada reseña trae `myVote` (1 like, -1 dislike, 0 sin voto).
  async findByMovie(movieId, viewerId = null) {
    const [filas] = await this.ejecutor().query(
      `SELECT r.id, r.title, r.rating, r.comment, r.created_at, r.updated_at, u.id AS user_id, u.username,
              COALESCE(SUM(v.value = 1), 0) AS likes, COALESCE(SUM(v.value = -1), 0) AS dislikes,
              COALESCE(MAX(CASE WHEN v.user_id = ? THEN v.value END), 0) AS my_vote
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       LEFT JOIN review_votes v ON v.review_id = r.id
       WHERE r.movie_id = ?
       GROUP BY r.id, r.title, r.rating, r.comment, r.created_at, r.updated_at, u.id, u.username
       ORDER BY r.created_at DESC, r.id DESC`,
      [viewerId, movieId]
    );
    return filas.map((fila) => this.hidratar(fila));
  }

  // Lee una reseña bloqueando su fila (usar dentro de una transaccion)
  async findByIdForUpdate(conexion, id) {
    const [filas] = await conexion.query('SELECT * FROM reviews WHERE id = ? FOR UPDATE', [id]);
    return filas[0] || null;
  }

  // Devuelve el id de la reseña creada
  async insert(conexion, { userId, movieId, title, rating, comment }) {
    const [result] = await conexion.query(
      'INSERT INTO reviews (user_id, movie_id, title, rating, comment) VALUES (?, ?, ?, ?, ?)',
      [userId, movieId, title, rating, comment]
    );
    return result.insertId;
  }

  async updateFields(conexion, id, cambios) {
    const columnas = Object.keys(cambios);
    await conexion.query(
      `UPDATE reviews SET ${columnas.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
      [...columnas.map((c) => cambios[c]), id]
    );
  }

  async deleteById(conexion, id) {
    await conexion.query('DELETE FROM reviews WHERE id = ?', [id]);
  }

  // Estadisticas de la pelicula, calculadas por las vistas movie_stats / review_weights
  async movieStats(conexion, movieId) {
    const [filas] = await conexion.query(
      'SELECT review_count, avg_rating, ranking_score FROM movie_stats WHERE movie_id = ?',
      [movieId]
    );
    const fila = filas[0];
    return {
      reviewCount: Number(fila.review_count),
      avgRating: Number(fila.avg_rating).toFixed(2),
      rankingScore: Number(fila.ranking_score),
    };
  }

  // Likes y dislikes de una reseña, calculados desde review_votes
  async votos(conexion, reviewId) {
    const [filas] = await conexion.query(
      `SELECT COALESCE(SUM(value = 1), 0) AS likes, COALESCE(SUM(value = -1), 0) AS dislikes
       FROM review_votes WHERE review_id = ?`,
      [reviewId]
    );
    return { likes: Number(filas[0].likes), dislikes: Number(filas[0].dislikes) };
  }

  // Voto de un usuario en una reseña: 1, -1 o null si no ha votado
  async votoDe(conexion, reviewId, userId) {
    const [filas] = await conexion.query(
      'SELECT value FROM review_votes WHERE review_id = ? AND user_id = ?',
      [reviewId, userId]
    );
    return filas.length ? filas[0].value : null;
  }

  async crearVoto(conexion, reviewId, userId, valor) {
    await conexion.query(
      'INSERT INTO review_votes (review_id, user_id, value) VALUES (?, ?, ?)',
      [reviewId, userId, valor]
    );
  }

  async cambiarVoto(conexion, reviewId, userId, valor) {
    await conexion.query(
      'UPDATE review_votes SET value = ? WHERE review_id = ? AND user_id = ?',
      [valor, reviewId, userId]
    );
  }

  async quitarVoto(conexion, reviewId, userId) {
    await conexion.query('DELETE FROM review_votes WHERE review_id = ? AND user_id = ?', [reviewId, userId]);
  }
}

module.exports = { ReviewRepository, reviewRepository: new ReviewRepository() };
