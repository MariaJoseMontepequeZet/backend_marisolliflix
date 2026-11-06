const ACCIONES = ['review_created', 'review_updated', 'review_deleted'];

const NOMBRE_ACCION = {
  review_created: 'Reseña creada',
  review_updated: 'Reseña editada',
  review_deleted: 'Reseña eliminada',
};

function leerDetalles(valor) {
  if (!valor) return {};
  if (typeof valor !== 'string') return valor;
  try {
    return JSON.parse(valor);
  } catch {
    return {};
  }
}

class Actividad {
  #id;
  #userId;
  #action;
  #reviewId;
  #movieId;
  #details;
  #createdAt;

  constructor({ id, userId, action, reviewId, movieId, details, createdAt }) {
    this.#id = id;
    this.#userId = userId;
    this.#action = action;
    this.#reviewId = reviewId;
    this.#movieId = movieId;
    this.#details = details;
    this.#createdAt = createdAt;
  }

  static fromRow(fila) {
    return new Actividad({
      id: fila.id,
      userId: fila.user_id,
      action: fila.action,
      reviewId: fila.review_id,
      movieId: fila.movie_id,
      details: leerDetalles(fila.details),
      createdAt: fila.created_at,
    });
  }

  get id() { return this.#id; }
  get userId() { return this.#userId; }
  get action() { return this.#action; }
  get reviewId() { return this.#reviewId; }
  get movieId() { return this.#movieId; }
  get details() { return { ...this.#details }; }
  get createdAt() { return this.#createdAt; }

  get descripcion() {
    const pelicula = this.#details.movieTitle ? `"${this.#details.movieTitle}"` : 'una película eliminada';
    if (this.#action === 'review_created') {
      return `Publicaste una reseña de ${pelicula} con ${this.#details.rating}/10`;
    }
    if (this.#action === 'review_updated') {
      return `Editaste tu reseña de ${pelicula}`;
    }
    return `Eliminaste tu reseña de ${pelicula}`;
  }

  toJSON() {
    const datos = {
      id: this.#id,
      action: this.#action,
      actionLabel: NOMBRE_ACCION[this.#action],
      description: this.descripcion,
      review: {
        id: this.#reviewId,
        title: this.#details.reviewTitle ?? null,
        rating: this.#details.rating ?? null,
      },
      movie: {
        id: this.#movieId,
        title: this.#details.movieTitle ?? null,
      },
      createdAt: this.#createdAt,
    };
    if (this.#details.changes) datos.changes = this.#details.changes;
    return datos;
  }
}

module.exports = Actividad;
module.exports.ACCIONES = ACCIONES;
