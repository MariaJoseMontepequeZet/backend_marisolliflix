const CAMPOS_PELICULA = ['title', 'description', 'categoryId', 'year', 'imageUrl', 'type'];

class CrearPeliculaDTO {
  constructor(body = {}) {
    for (const campo of CAMPOS_PELICULA) this[campo] = body[campo];
  }
}

// En la edicion solo viajan los campos que el cliente envio (status incluido, para aprobar o rechazar)
class ActualizarPeliculaDTO {
  constructor(body = {}) {
    for (const campo of [...CAMPOS_PELICULA, 'status']) {
      if (body[campo] !== undefined) this[campo] = body[campo];
    }
  }
}

class CambiarEstadoDTO {
  constructor(body = {}) {
    this.status = body.status;
  }
}

module.exports = { CrearPeliculaDTO, ActualizarPeliculaDTO, CambiarEstadoDTO };
