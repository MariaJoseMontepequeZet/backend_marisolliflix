const { getPool } = require('../config/db');
const Review = require('../models/reviewModel');
const AppError = require('../utils/AppError');
const { conTransaccion } = require('../utils/transaction');

// POST /api/v1/movies/:id/reviews -> crea una reseña (solo en peliculas aprobadas)
const createReview = async (req, res, next) => {
  const movieId = Number(req.params.id);
  const { title, rating, comment } = req.body;

  try {
    const data = await conTransaccion(async (conexion) => {
      const [movies] = await conexion.query(
        'SELECT id, status FROM movies WHERE id = ? FOR UPDATE',
        [movieId]
      );
      if (movies.length === 0) throw new AppError('La película no existe.', 404);
      if (movies[0].status !== 'approved') {
        throw new AppError('La película no está aprobada para recibir reseñas.', 404);
      }

      let insertId;
      try {
        const [result] = await conexion.query(
          'INSERT INTO reviews (user_id, movie_id, title, rating, comment) VALUES (?, ?, ?, ?, ?)',
          [req.user.id, movieId, title, rating, comment]
        );
        insertId = result.insertId;
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          throw new AppError('Ya has registrado una reseña para esta película.', 409);
        }
        throw error;
      }

      const stats = await Review.movieStats(conexion, movieId);
      return { reviewId: insertId, movieId, title, rating, comment, ...stats };
    });

    return res.status(201).json({ status: 'success', message: 'Reseña creada exitosamente', data });
  } catch (error) {
    return next(error);
  }
};

// GET /api/v1/movies/:id/reviews -> publico para peliculas aprobadas; las demas
// solo las ven el admin y quien las propuso (igual que el detalle de la pelicula)
const getReviewsByMovieId = async (req, res, next) => {
  try {
    const [movies] = await getPool().query(
      'SELECT id, status, created_by FROM movies WHERE id = ?',
      [req.params.id]
    );
    const movie = movies[0];
    const puedeVer =
      movie &&
      (movie.status === 'approved' ||
        (req.user && (req.user.role === 'admin' || req.user.id === movie.created_by)));
    if (!puedeVer) throw new AppError('La película no existe.', 404);

    const reviews = await Review.findByMovie(movie.id, req.user ? req.user.id : null);
    return res.status(200).json({ status: 'success', results: reviews.length, data: reviews });
  } catch (error) {
    return next(error);
  }
};

// PUT /api/v1/reviews/:id -> solo el autor edita su reseña (title, rating y/o comment)
const updateReview = async (req, res, next) => {
  const reviewId = Number(req.params.id);
  const cambios = {};
  for (const campo of ['title', 'rating', 'comment']) {
    if (req.body[campo] !== undefined) cambios[campo] = req.body[campo];
  }

  try {
    const data = await conTransaccion(async (conexion) => {
      const review = await Review.findByIdForUpdate(conexion, reviewId);
      if (!review) throw new AppError('Reseña no encontrada', 404);
      if (review.user_id !== req.user.id) {
        throw new AppError('Solo el autor puede editar esta reseña', 403);
      }

      const columnas = Object.keys(cambios);
      await conexion.query(
        `UPDATE reviews SET ${columnas.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
        [...columnas.map((c) => cambios[c]), reviewId]
      );

      const stats = await Review.movieStats(conexion, review.movie_id);
      return {
        reviewId,
        movieId: review.movie_id,
        title: cambios.title ?? review.title,
        rating: cambios.rating ?? review.rating,
        comment: cambios.comment ?? review.comment,
        ...stats,
      };
    });

    return res.status(200).json({ status: 'success', message: 'Reseña actualizada exitosamente', data });
  } catch (error) {
    return next(error);
  }
};

// DELETE /api/v1/reviews/:id -> solo el autor elimina su reseña. Sus likes y dislikes
// se borran con ella (ON DELETE CASCADE en review_votes) y el ranking se recalcula solo.
const deleteReview = async (req, res, next) => {
  const reviewId = Number(req.params.id);

  try {
    const data = await conTransaccion(async (conexion) => {
      const review = await Review.findByIdForUpdate(conexion, reviewId);
      if (!review) throw new AppError('Reseña no encontrada', 404);
      if (review.user_id !== req.user.id) {
        throw new AppError('Solo el autor puede eliminar esta reseña', 403);
      }

      await conexion.query('DELETE FROM reviews WHERE id = ?', [reviewId]);

      const stats = await Review.movieStats(conexion, review.movie_id);
      return { reviewId, movieId: review.movie_id, ...stats };
    });

    return res.status(200).json({
      status: 'success',
      message: 'Reseña eliminada exitosamente',
      data,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { createReview, getReviewsByMovieId, updateReview, deleteReview };
