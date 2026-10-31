// Datos de entrada y salida de la autenticacion. Cada DTO se queda solo con los campos
// que le corresponden, aunque el cuerpo de la peticion traiga otros.

class RegistroDTO {
  constructor(body = {}) {
    this.username = body.username;
    this.email = body.email;
    this.password = body.password;
  }
}

class CredencialesDTO {
  constructor(body = {}) {
    this.email = body.email;
    this.password = body.password;
  }
}

// Lo que se responde al registrarse o iniciar sesion (nunca incluye la contraseña)
class UsuarioPublicoDTO {
  constructor(usuario) {
    this.id = usuario.id;
    this.username = usuario.username;
    this.email = usuario.email;
    this.role = usuario.role;
  }
}

module.exports = { RegistroDTO, CredencialesDTO, UsuarioPublicoDTO };
