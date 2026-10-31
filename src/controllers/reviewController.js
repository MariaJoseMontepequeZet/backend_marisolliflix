const { reviewService } = require('../services/ReviewService');
const { CrearResenaDTO, ActualizarResenaDTO, ReaccionDTO } = require('../dtos/review.dto');

// POST /api/v1/movies/:id/reviews -> crea una reseña (solo en peliculas aprobadas)
const createReview = async (req, res, next) => {
  try {
    const data = await reviewService.crear(Number(req.params.id), new CrearResenaDTO(req.body), req.user);
    return res.status(201).json({ status: 'success', message: 'Reseña creada exitosamente', data });
  } catch (error) {
    return next(error);
  }
};

// GET /api/v1/movies/:id/reviews -> publico para peliculas aprobadas; las demas
// solo las ven el admin y quien las propuso (igual que el detalle de la pelicula)
const getReviewsByMovieId = async (req, res, next) => {
  try {
    const reviews = await reviewService.listarPorPelicula(req.params.id, req.user);
    return res.status(200).json({ status: 'success', results: reviews.length, data: reviews });
  } catch (error) {
    return next(error);
  }
};

// PUT /api/v1/reviews/:id -> solo el autor edita su reseña (title, rating y/o comment)
const updateReview = async (req, res, next) => {
  try {
    const cambios = { ...new ActualizarResenaDTO(req.body) };
    const data = await reviewService.editar(Number(req.params.id), cambios, req.user);
    return res.status(200).json({ status: 'success', message: 'Reseña actualizada exitosamente', data });
  } catch (error) {
    return next(error);
  }
};

// DELETE /api/v1/reviews/:id -> solo el autor elimina su reseña
const deleteReview = async (req, res, next) => {
  try {
    const data = await reviewService.eliminar(Number(req.params.id), req.user);
    return res.status(200).json({ status: 'success', message: 'Reseña eliminada exitosamente', data });
  } catch (error) {
    return next(error);
  }
};

// POST /api/v1/reviews/:id/reaction { type: 'like' | 'dislike' }
const reactToReview = async (req, res, next) => {
  try {
    const { valor } = new ReaccionDTO(req.body);
    const data = await reviewService.reaccionar(Number(req.params.id), valor, req.user);
    const mensaje = data.reaction ? `Reacción registrada: ${data.reaction}` : 'Reacción eliminada';
    return res.status(200).json({ status: 'success', message: mensaje, data });
  } catch (error) {
    return next(error);
  }
};

// DELETE /api/v1/reviews/:id/reaction -> quita el voto del usuario (si no tenia, no pasa nada)
const removeReaction = async (req, res, next) => {
  try {
    const data = await reviewService.quitarReaccion(Number(req.params.id), req.user);
    return res.status(200).json({ status: 'success', message: 'Reacción eliminada', data });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createReview, getReviewsByMovieId, updateReview, deleteReview, reactToReview, removeReaction,
};
