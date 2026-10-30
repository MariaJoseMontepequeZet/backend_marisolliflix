const { movieRepository } = require('../repositories/MovieRepository');
const { reviewRepository } = require('../repositories/ReviewRepository');
const AppError = require('../utils/AppError');
const { conTransaccion } = require('../utils/transaction');

const NOMBRE_REACCION = { 1: 'like', '-1': 'dislike' };

// Reglas de las reseñas y sus reacciones. Todo lo que cambia datos corre dentro de una
// transaccion para que la reseña, los votos y el ranking queden siempre consistentes.
class ReviewService {
  #peliculas;
  #resenas;

  constructor(peliculas = movieRepository, resenas = reviewRepository) {
    this.#peliculas = peliculas;
    this.#resenas = resenas;
  }

  // Solo en peliculas aprobadas, y una reseña por usuario y pelicula
  crear(movieId, { title, rating, comment }, usuario) {
    return conTransaccion(async (conexion) => {
      const pelicula = await this.#peliculas.estadoParaActualizar(conexion, movieId);
      if (!pelicula) throw new AppError('La película no existe.', 404);
      if (pelicula.status !== 'approved') {
        throw new AppError('La película no está aprobada para recibir reseñas.', 404);
      }

      let reviewId;
      try {
        reviewId = await this.#resenas.insert(conexion, { userId: usuario.id, movieId, title, rating, comment });
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          throw new AppError('Ya has registrado una reseña para esta película.', 409);
        }
        throw error;
      }

      const stats = await this.#resenas.movieStats(conexion, movieId);
      return { reviewId, movieId, title, rating, comment, ...stats };
    });
  }

  // Publico para peliculas aprobadas; las demas solo las ven el admin y quien las propuso
  async listarPorPelicula(movieId, usuario) {
    const movie = await this.#peliculas.findById(movieId);
    if (!movie || !movie.puedeVerla(usuario)) throw new AppError('La película no existe.', 404);
    return this.#resenas.findByMovie(movie.id, usuario ? usuario.id : null);
  }

  // Solo el autor edita su reseña (title, rating y/o comment)
  editar(reviewId, cambios, usuario) {
    return conTransaccion(async (conexion) => {
      const review = await this.#propia(conexion, reviewId, usuario, 'Solo el autor puede editar esta reseña');
      await this.#resenas.updateFields(conexion, reviewId, cambios);

      const stats = await this.#resenas.movieStats(conexion, review.movie_id);
      return {
        reviewId,
        movieId: review.movie_id,
        title: cambios.title ?? review.title,
        rating: cambios.rating ?? review.rating,
        comment: cambios.comment ?? review.comment,
        ...stats,
      };
    });
  }

  // Solo el autor elimina su reseña. Sus likes y dislikes se borran con ella
  // (ON DELETE CASCADE en review_votes) y el ranking se recalcula solo.
  eliminar(reviewId, usuario) {
    return conTransaccion(async (conexion) => {
      const review = await this.#propia(conexion, reviewId, usuario, 'Solo el autor puede eliminar esta reseña');
      await this.#resenas.deleteById(conexion, reviewId);

      const stats = await this.#resenas.movieStats(conexion, review.movie_id);
      return { reviewId, movieId: review.movie_id, ...stats };
    });
  }

  // like/dislike: sin voto previo lo crea; repetir el mismo tipo lo quita (toggle); el otro tipo lo cambia
  reaccionar(reviewId, valor, usuario) {
    return conTransaccion(async (conexion) => {
      const review = await this.#votable(conexion, reviewId, usuario);

      const previo = await this.#resenas.votoDe(conexion, reviewId, usuario.id);
      let reaccion = valor;
      if (previo === null) {
        await this.#resenas.crearVoto(conexion, reviewId, usuario.id, valor);
      } else if (previo === valor) {
        await this.#resenas.quitarVoto(conexion, reviewId, usuario.id);
        reaccion = 0;
      } else {
        await this.#resenas.cambiarVoto(conexion, reviewId, usuario.id, valor);
      }

      return this.#resumenReaccion(conexion, review, NOMBRE_REACCION[reaccion] || null);
    });
  }

  // Quita el voto del usuario (si no tenia, no pasa nada)
  quitarReaccion(reviewId, usuario) {
    return conTransaccion(async (conexion) => {
      const review = await this.#votable(conexion, reviewId, usuario);
      await this.#resenas.quitarVoto(conexion, reviewId, usuario.id);
      return this.#resumenReaccion(conexion, review, null);
    });
  }

  async #existente(conexion, reviewId) {
    const review = await this.#resenas.findByIdForUpdate(conexion, reviewId);
    if (!review) throw new AppError('Reseña no encontrada', 404);
    return review;
  }

  async #propia(conexion, reviewId, usuario, mensajeSiNoEsSuya) {
    const review = await this.#existente(conexion, reviewId);
    if (review.user_id !== usuario.id) throw new AppError(mensajeSiNoEsSuya, 403);
    return review;
  }

  // No se vota lo propio
  async #votable(conexion, reviewId, usuario) {
    const review = await this.#existente(conexion, reviewId);
    if (review.user_id === usuario.id) {
      throw new AppError('No puedes dar like ni dislike a tu propia reseña', 403);
    }
    return review;
  }

  // Respuesta comun de las reacciones: voto actual, contadores y ranking de la pelicula
  async #resumenReaccion(conexion, review, reaccion) {
    const contadores = await this.#resenas.votos(conexion, review.id);
    const { rankingScore } = await this.#resenas.movieStats(conexion, review.movie_id);
    return { reviewId: review.id, movieId: review.movie_id, reaction: reaccion, ...contadores, rankingScore };
  }
}

module.exports = { ReviewService, reviewService: new ReviewService() };
