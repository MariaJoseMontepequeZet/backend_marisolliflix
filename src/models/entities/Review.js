// Una reseña tal como se muestra en el detalle de una pelicula: con su autor y sus votos.
// myVote es el voto de quien mira: 1 like, -1 dislike, 0 sin voto.
class Review {
  #id;
  #title;
  #rating;
  #comment;
  #author;
  #likes;
  #dislikes;
  #myVote;
  #createdAt;
  #updatedAt;

  constructor({ id, title, rating, comment, author, likes, dislikes, myVote, createdAt, updatedAt }) {
    this.#id = id;
    this.#title = title;
    this.#rating = rating;
    this.#comment = comment;
    this.#author = author;
    this.#likes = likes;
    this.#dislikes = dislikes;
    this.#myVote = myVote;
    this.#createdAt = createdAt;
    this.#updatedAt = updatedAt;
  }

  static fromRow(fila) {
    return new Review({
      id: fila.id,
      title: fila.title,
      rating: fila.rating,
      comment: fila.comment,
      author: { id: fila.user_id, username: fila.username },
      likes: Number(fila.likes),
      dislikes: Number(fila.dislikes),
      myVote: Number(fila.my_vote),
      createdAt: fila.created_at,
      updatedAt: fila.updated_at,
    });
  }

  get id() { return this.#id; }
  get title() { return this.#title; }
  get rating() { return this.#rating; }
  get comment() { return this.#comment; }
  get author() { return { ...this.#author }; }
  get likes() { return this.#likes; }
  get dislikes() { return this.#dislikes; }
  get myVote() { return this.#myVote; }
  get createdAt() { return this.#createdAt; }
  get updatedAt() { return this.#updatedAt; }

  esDe(userId) {
    return this.#author.id === userId;
  }

  toJSON() {
    return {
      id: this.#id,
      title: this.#title,
      rating: this.#rating,
      comment: this.#comment,
      author: this.author,
      likes: this.#likes,
      dislikes: this.#dislikes,
      myVote: this.#myVote,
      createdAt: this.#createdAt,
      updatedAt: this.#updatedAt,
    };
  }
}

module.exports = Review;
