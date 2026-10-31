// Una categoria del catalogo (Anime, Ciencia Ficcion, Superheroes...)
class Category {
  #id;
  #name;
  #createdAt;

  constructor({ id, name, createdAt }) {
    this.#id = id;
    this.#name = name;
    this.#createdAt = createdAt;
  }

  static fromRow(fila) {
    return new Category({ id: fila.id, name: fila.name, createdAt: fila.created_at });
  }

  get id() { return this.#id; }
  get name() { return this.#name; }
  get createdAt() { return this.#createdAt; }

  toJSON() {
    return { id: this.#id, name: this.#name, createdAt: this.#createdAt };
  }
}

module.exports = Category;
