// Una pelicula, serie o anime del catalogo. Los datos son privados: se leen con getters
// y la clase sabe responder preguntas sobre si misma (aprobada, quien puede verla).
class Movie {
  #id;
  #title;
  #description;
  #categoryId;
  #year;
  #imageUrl;
  #type;
  #status;
  #stats;
  #createdBy;
  #createdAt;
  #updatedAt;

  constructor({ id, title, description, categoryId, year, imageUrl, type, status, stats, createdBy, createdAt, updatedAt }) {
    this.#id = id;
    this.#title = title;
    this.#description = description;
    this.#categoryId = categoryId;
    this.#year = year;
    this.#imageUrl = imageUrl;
    this.#type = type;
    this.#status = status;
    this.#stats = stats;
    this.#createdBy = createdBy;
    this.#createdAt = createdAt;
    this.#updatedAt = updatedAt;
  }

  // Convierte una fila de MySQL (movies + movie_stats) en una instancia
  static fromRow(fila) {
    return new Movie({
      id: fila.id,
      title: fila.title,
      description: fila.description,
      categoryId: fila.category_id,
      year: fila.year,
      imageUrl: fila.image_url,
      type: fila.type,
      status: fila.status,
      stats: {
        reviewCount: Number(fila.review_count),
        avgRating: Number(fila.avg_rating),
        likes: Number(fila.likes),
        dislikes: Number(fila.dislikes),
        rankingScore: Number(fila.ranking_score),
      },
      createdBy: fila.created_by,
      createdAt: fila.created_at,
      updatedAt: fila.updated_at,
    });
  }

  get id() { return this.#id; }
  get title() { return this.#title; }
  get description() { return this.#description; }
  get categoryId() { return this.#categoryId; }
  get year() { return this.#year; }
  get imageUrl() { return this.#imageUrl; }
  get type() { return this.#type; }
  get status() { return this.#status; }
  get stats() { return { ...this.#stats }; }
  get createdBy() { return this.#createdBy; }
  get createdAt() { return this.#createdAt; }
  get updatedAt() { return this.#updatedAt; }

  get aprobada() {
    return this.#status === 'approved';
  }

  // Las aprobadas las ve cualquiera; las demas, solo el admin y quien las propuso
  puedeVerla(usuario) {
    if (this.aprobada) return true;
    return Boolean(usuario && (usuario.esAdmin || usuario.id === this.#createdBy));
  }

  // Forma que se envia en la API
  toJSON() {
    return {
      id: this.#id,
      title: this.#title,
      description: this.#description,
      categoryId: this.#categoryId,
      year: this.#year,
      imageUrl: this.#imageUrl,
      type: this.#type,
      status: this.#status,
      stats: this.stats,
      createdBy: this.#createdBy,
      createdAt: this.#createdAt,
      updatedAt: this.#updatedAt,
    };
  }
}

module.exports = Movie;
