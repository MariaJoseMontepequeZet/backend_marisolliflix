const Controller = require('./Controller');
const { reviewService } = require('../services/ReviewService');
const { CrearResenaDTO, ActualizarResenaDTO, ReaccionDTO } = require('../dtos/review.dto');

class ReviewController extends Controller {
  #servicio;

  constructor(servicio = reviewService) {
    super();
    this.#servicio = servicio;
  }

  // POST /api/v1/movies/:id/reviews -> crea una reseña (solo en peliculas aprobadas)
  async crear(req, res) {
    const data = await this.#servicio.crear(Number(req.params.id), new CrearResenaDTO(req.body), req.user);
    res.status(201).json({ status: 'success', message: 'Reseña creada exitosamente', data });
  }

  // GET /api/v1/movies/:id/reviews -> publico para peliculas aprobadas; las demas
  // solo las ven el admin y quien las propuso (igual que el detalle de la pelicula)
  async listarPorPelicula(req, res) {
    const reviews = await this.#servicio.listarPorPelicula(req.params.id, req.user);
    res.status(200).json({ status: 'success', results: reviews.length, data: reviews });
  }

  // PUT /api/v1/reviews/:id -> solo el autor edita su reseña
  async editar(req, res) {
    const cambios = { ...new ActualizarResenaDTO(req.body) };
    const data = await this.#servicio.editar(Number(req.params.id), cambios, req.user);
    res.status(200).json({ status: 'success', message: 'Reseña actualizada exitosamente', data });
  }

  // DELETE /api/v1/reviews/:id -> solo el autor elimina su reseña
  async eliminar(req, res) {
    const data = await this.#servicio.eliminar(Number(req.params.id), req.user);
    res.status(200).json({ status: 'success', message: 'Reseña eliminada exitosamente', data });
  }

  // POST /api/v1/reviews/:id/reaction { type: 'like' | 'dislike' }
  async reaccionar(req, res) {
    const { valor } = new ReaccionDTO(req.body);
    const data = await this.#servicio.reaccionar(Number(req.params.id), valor, req.user);
    const mensaje = data.reaction ? `Reacción registrada: ${data.reaction}` : 'Reacción eliminada';
    res.status(200).json({ status: 'success', message: mensaje, data });
  }

  // DELETE /api/v1/reviews/:id/reaction -> quita el voto del usuario
  async quitarReaccion(req, res) {
    const data = await this.#servicio.quitarReaccion(Number(req.params.id), req.user);
    res.status(200).json({ status: 'success', message: 'Reacción eliminada', data });
  }
}

module.exports = { ReviewController, reviewController: new ReviewController() };
