const { getPool } = require('../config/db');
const Review = require('./entities/Review');

// Reseñas de una pelicula con el autor y sus votos (las mas recientes primero).
// Si se indica `viewerId`, cada reseña trae `myVote` (1 like, -1 dislike, 0 sin voto).
async function findByMovie(movieId, viewerId = null) {
  const [filas] = await getPool().query(
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
  return filas.map(Review.fromRow);
}

// Lee una reseña bloqueando su fila (usar dentro de una transaccion)
async function findByIdForUpdate(conexion, id) {
  const [filas] = await conexion.query('SELECT * FROM reviews WHERE id = ? FOR UPDATE', [id]);
  return filas[0] || null;
}

// Estadisticas de la pelicula, calculadas por las vistas movie_stats / review_weights
async function movieStats(conexion, movieId) {
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
async function votos(conexion, reviewId) {
  const [filas] = await conexion.query(
    `SELECT COALESCE(SUM(value = 1), 0) AS likes, COALESCE(SUM(value = -1), 0) AS dislikes
     FROM review_votes WHERE review_id = ?`,
    [reviewId]
  );
  return { likes: Number(filas[0].likes), dislikes: Number(filas[0].dislikes) };
}

module.exports = { findByMovie, findByIdForUpdate, movieStats, votos };
