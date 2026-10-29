const { getPool } = require('../config/db');

// Reseñas de una pelicula con el autor y sus votos (las mas recientes primero)
async function findByMovie(movieId) {
  const [filas] = await getPool().query(
    `SELECT r.id, r.title, r.rating, r.comment, r.created_at, u.id AS user_id, u.username,
            COALESCE(SUM(v.value = 1), 0) AS likes, COALESCE(SUM(v.value = -1), 0) AS dislikes
     FROM reviews r
     JOIN users u ON u.id = r.user_id
     LEFT JOIN review_votes v ON v.review_id = r.id
     WHERE r.movie_id = ?
     GROUP BY r.id, r.title, r.rating, r.comment, r.created_at, u.id, u.username
     ORDER BY r.created_at DESC, r.id DESC`,
    [movieId]
  );
  return filas.map((fila) => ({
    id: fila.id,
    title: fila.title,
    rating: fila.rating,
    comment: fila.comment,
    author: { id: fila.user_id, username: fila.username },
    likes: Number(fila.likes),
    dislikes: Number(fila.dislikes),
    createdAt: fila.created_at,
  }));
}

module.exports = { findByMovie };
