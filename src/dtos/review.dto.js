class CrearResenaDTO {
  constructor(body = {}) {
    this.title = body.title;
    this.rating = body.rating;
    this.comment = body.comment;
  }
}

// En la edicion solo viajan los campos que el cliente envio
class ActualizarResenaDTO {
  constructor(body = {}) {
    for (const campo of ['title', 'rating', 'comment']) {
      if (body[campo] !== undefined) this[campo] = body[campo];
    }
  }
}

const VALOR_REACCION = { like: 1, dislike: -1 };

class ReaccionDTO {
  constructor(body = {}) {
    this.type = body.type;
  }

  // like = 1, dislike = -1 (es el numero que se guarda en review_votes)
  get valor() {
    return VALOR_REACCION[this.type];
  }
}

module.exports = { CrearResenaDTO, ActualizarResenaDTO, ReaccionDTO };
