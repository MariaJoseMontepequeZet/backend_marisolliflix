const { historialRepository } = require('../repositories/HistorialRepository');
const { movieRepository } = require('../repositories/MovieRepository');
const { ACCIONES } = require('../models/entities/Actividad');

const CAMPOS_RESENA = ['title', 'rating', 'comment'];

class HistorialService {
  #historial;
  #peliculas;

  constructor(historial = historialRepository, peliculas = movieRepository) {
    this.#historial = historial;
    this.#peliculas = peliculas;
  }

  async #registrar(conexion, usuario, action, { reviewId, movieId, reviewTitle, rating, changes }) {
    const movieTitle = await this.#peliculas.tituloDe(conexion, movieId);
    const details = { movieTitle, reviewTitle, rating };
    if (changes) details.changes = changes;
    return this.#historial.registrar(conexion, { userId: usuario.id, action, reviewId, movieId, details });
  }

  resenaCreada(conexion, usuario, { reviewId, movieId, title, rating }) {
    return this.#registrar(conexion, usuario, 'review_created', { reviewId, movieId, reviewTitle: title, rating });
  }

  resenaEditada(conexion, usuario, anterior, cambios) {
    const changes = {};
    for (const campo of CAMPOS_RESENA) {
      if (cambios[campo] !== undefined && cambios[campo] !== anterior[campo]) {
        changes[campo] = { from: anterior[campo], to: cambios[campo] };
      }
    }
    return this.#registrar(conexion, usuario, 'review_updated', {
      reviewId: anterior.id,
      movieId: anterior.movie_id,
      reviewTitle: cambios.title ?? anterior.title,
      rating: cambios.rating ?? anterior.rating,
      changes,
    });
  }

  resenaEliminada(conexion, usuario, anterior) {
    return this.#registrar(conexion, usuario, 'review_deleted', {
      reviewId: anterior.id,
      movieId: anterior.movie_id,
      reviewTitle: anterior.title,
      rating: anterior.rating,
    });
  }

  async listar(usuario, query) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const order = query.order === 'asc' ? 'asc' : 'desc';
    const filtros = {
      action: ACCIONES.includes(query.action) ? query.action : undefined,
      from: query.from || undefined,
      to: query.to || undefined,
    };
    const [{ total, actividades }, totales] = await Promise.all([
      this.#historial.findByUser(usuario.id, filtros, { limit, offset: (page - 1) * limit, order }),
      this.#historial.totalesPorAccion(usuario.id, filtros),
    ]);
    const resumen = Object.fromEntries(ACCIONES.map((accion) => [accion, totales[accion] || 0]));
    return { actividades, total, page, limit, filtros: { ...filtros, order }, resumen };
  }
}

module.exports = { HistorialService, historialService: new HistorialService() };
