const { userRepository } = require('../repositories/UserRepository');
const { movieRepository } = require('../repositories/MovieRepository');
const AppError = require('../utils/AppError');
const PasswordHasher = require('../utils/PasswordHasher');
const { conTransaccion } = require('../utils/transaction');

const MENSAJE_NO_ENCONTRADO = 'Usuario no encontrado';
const MENSAJE_REPETIDO = 'El email o username ya se encuentra registrado';

// Reglas de la gestion de usuarios (solo para administradores). Un admin no puede quitarse
// su propio rol ni borrarse a si mismo, asi siempre queda al menos un administrador.
class UserService {
  #usuarios;
  #peliculas;

  constructor(usuarios = userRepository, peliculas = movieRepository) {
    this.#usuarios = usuarios;
    this.#peliculas = peliculas;
  }

  async listar(query) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const { total, users } = await this.#usuarios.findAll(
      { q: query.q, role: query.role },
      { limit, offset: (page - 1) * limit }
    );
    return { users, total, page, limit };
  }

  async obtener(id) {
    const usuario = await this.#usuarios.findById(id);
    if (!usuario) throw new AppError(MENSAJE_NO_ENCONTRADO, 404);
    return usuario;
  }

  // Crea un usuario normal o un administrador, segun el rol que llegue
  async crear({ username, email, password, role }) {
    await this.#validarDisponible(email, username);
    const passwordHash = await PasswordHasher.hash(password);
    try {
      return await this.#usuarios.create({ username, email, passwordHash, role });
    } catch (error) {
      throw this.#traducirErrorDeBd(error);
    }
  }

  async actualizar(id, { password, ...cambios }, admin) {
    const usuario = await this.obtener(id);
    if (cambios.role !== undefined && cambios.role !== usuario.role && usuario.id === admin.id) {
      throw new AppError('No puedes cambiar tu propio rol', 403);
    }
    if (cambios.email !== undefined || cambios.username !== undefined) {
      await this.#validarDisponible(cambios.email, cambios.username, id);
    }
    if (password !== undefined) cambios.passwordHash = await PasswordHasher.hash(password);

    try {
      return await this.#usuarios.update(id, cambios);
    } catch (error) {
      throw this.#traducirErrorDeBd(error);
    }
  }

  // Sus reseñas y votos se borran con el (ON DELETE CASCADE); las peliculas que propuso
  // pasan al admin que lo elimina para no perder el catalogo.
  async eliminar(id, admin) {
    if (id === admin.id) throw new AppError('No puedes eliminar tu propia cuenta', 403);
    await this.obtener(id);

    await conTransaccion(async (conexion) => {
      await this.#peliculas.reasignarAutor(conexion, id, admin.id);
      await this.#usuarios.remove(id, conexion);
    });
  }

  async #validarDisponible(email, username, excluirId) {
    if (await this.#usuarios.existsByEmailOrUsername(email, username, excluirId)) {
      throw new AppError(MENSAJE_REPETIDO, 409);
    }
  }

  // Los indices unicos son la garantia final contra dos peticiones simultaneas
  #traducirErrorDeBd(error) {
    if (error.code === 'ER_DUP_ENTRY') return new AppError(MENSAJE_REPETIDO, 409);
    return error;
  }
}

module.exports = { UserService, userService: new UserService() };
