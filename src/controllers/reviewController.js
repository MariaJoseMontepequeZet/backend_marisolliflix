const Movie = require('../models/movieModel');
const Review = require('../models/reviewModel');
const { CrearResenaDTO, ActualizarResenaDTO, ReaccionDTO } = require('../dtos/review.dto');
const AppError = require('../utils/AppError');
const { conTransaccion } = require('../utils/transaction');

// POST /api/v1/movies/:id/reviews -> crea una reseña (solo en peliculas aprobadas)
const createReview = async (req, res, next) => {
  const movieId = Number(req.params.id);
  const { title, rating, comment } = new CrearResenaDTO(req.body);

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
    const movie = await Movie.findById(req.params.id);
    if (!movie || !movie.puedeVerla(req.user)) throw new AppError('La película no existe.', 404);

    const reviews = await Review.findByMovie(movie.id, req.user ? req.user.id : null);
    return res.status(200).json({ status: 'success', results: reviews.length, data: reviews });
  } catch (error) {
    return next(error);
  }
};

// PUT /api/v1/reviews/:id -> solo el autor edita su reseña (title, rating y/o comment)
const updateReview = async (req, res, next) => {
  const reviewId = Number(req.params.id);
  const cambios = { ...new ActualizarResenaDTO(req.body) };

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

const NOMBRE_REACCION = { 1: 'like', '-1': 'dislike' };

// Comprueba que la reseña exista y no sea del propio usuario (no se vota lo propio)
async function resenaVotable(conexion, reviewId, userId) {
  const review = await Review.findByIdForUpdate(conexion, reviewId);
  if (!review) throw new AppError('Reseña no encontrada', 404);
  if (review.user_id === userId) {
    throw new AppError('No puedes dar like ni dislike a tu propia reseña', 403);
  }
  return review;
}

// Respuesta comun de las reacciones: voto actual, contadores y ranking de la pelicula
async function resumenReaccion(conexion, review, reaccion) {
  const contadores = await Review.votos(conexion, review.id);
  const { rankingScore } = await Review.movieStats(conexion, review.movie_id);
  return { reviewId: review.id, movieId: review.movie_id, reaction: reaccion, ...contadores, rankingScore };
}

// POST /api/v1/reviews/:id/reaction { type: 'like' | 'dislike' }
// Sin voto previo lo crea; repetir el mismo tipo lo quita (toggle); el otro tipo lo cambia.
const reactToReview = async (req, res, next) => {
  const reviewId = Number(req.params.id);
  const { valor } = new ReaccionDTO(req.body);

  try {
    const data = await conTransaccion(async (conexion) => {
      const review = await resenaVotable(conexion, reviewId, req.user.id);

      const [previos] = await conexion.query(
        'SELECT value FROM review_votes WHERE review_id = ? AND user_id = ?',
        [reviewId, req.user.id]
      );
      let reaccion = valor;
      if (previos.length === 0) {
        await conexion.query(
          'INSERT INTO review_votes (review_id, user_id, value) VALUES (?, ?, ?)',
          [reviewId, req.user.id, valor]
        );
      } else if (previos[0].value === valor) {
        await conexion.query('DELETE FROM review_votes WHERE review_id = ? AND user_id = ?', [reviewId, req.user.id]);
        reaccion = 0;
      } else {
        await conexion.query(
          'UPDATE review_votes SET value = ? WHERE review_id = ? AND user_id = ?',
          [valor, reviewId, req.user.id]
        );
      }

      return resumenReaccion(conexion, review, NOMBRE_REACCION[reaccion] || null);
    });

    const mensaje = data.reaction ? `Reacción registrada: ${data.reaction}` : 'Reacción eliminada';
    return res.status(200).json({ status: 'success', message: mensaje, data });
  } catch (error) {
    return next(error);
  }
};

// DELETE /api/v1/reviews/:id/reaction -> quita el voto del usuario (si no tenia, no pasa nada)
const removeReaction = async (req, res, next) => {
  const reviewId = Number(req.params.id);

  try {
    const data = await conTransaccion(async (conexion) => {
      const review = await resenaVotable(conexion, reviewId, req.user.id);
      await conexion.query('DELETE FROM review_votes WHERE review_id = ? AND user_id = ?', [reviewId, req.user.id]);
      return resumenReaccion(conexion, review, null);
    });

    return res.status(200).json({ status: 'success', message: 'Reacción eliminada', data });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createReview, getReviewsByMovieId, updateReview, deleteReview, reactToReview, removeReaction,
};
