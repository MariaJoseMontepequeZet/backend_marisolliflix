// Datos de entrada y salida de la gestion de usuarios (solo administradores).

// Crear un usuario: el admin tambien elige su rol (por defecto "user")
class CrearUsuarioDTO {
  constructor(body = {}) {
    this.username = body.username;
    this.email = body.email;
    this.password = body.password;
    this.role = body.role ?? 'user';
  }
}

// En la edicion solo viajan los campos que el cliente envio
class ActualizarUsuarioDTO {
  constructor(body = {}) {
    for (const campo of ['username', 'email', 'password', 'role']) {
      if (body[campo] !== undefined) this[campo] = body[campo];
    }
  }
}

// Lo que ve el admin de cada usuario (nunca incluye la contraseña)
class UsuarioAdminDTO {
  constructor(usuario) {
    this.id = usuario.id;
    this.username = usuario.username;
    this.email = usuario.email;
    this.role = usuario.role;
    this.createdAt = usuario.createdAt;
  }
}

module.exports = { CrearUsuarioDTO, ActualizarUsuarioDTO, UsuarioAdminDTO };
