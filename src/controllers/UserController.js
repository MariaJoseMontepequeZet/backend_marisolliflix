const Controller = require('./Controller');
const { userService } = require('../services/UserService');
const { CrearUsuarioDTO, ActualizarUsuarioDTO, UsuarioAdminDTO } = require('../dtos/user.dto');

// Gestion de usuarios: todas las rutas son solo para administradores
class UserController extends Controller {
  #servicio;

  constructor(servicio = userService) {
    super();
    this.#servicio = servicio;
  }

  // GET /api/v1/users -> lista paginada (?q=, ?role=)
  async listar(req, res) {
    const resultado = await this.#servicio.listar(req.query);
    res.status(200).json({
      status: 'success',
      data: resultado.users.map((usuario) => new UsuarioAdminDTO(usuario)),
      pagination: Controller.paginacion(resultado),
    });
  }

  // GET /api/v1/users/:id
  async obtener(req, res) {
    const usuario = await this.#servicio.obtener(req.params.id);
    res.status(200).json({ status: 'success', data: new UsuarioAdminDTO(usuario) });
  }

  // POST /api/v1/users -> crea un usuario normal o un administrador
  async crear(req, res) {
    const usuario = await this.#servicio.crear(new CrearUsuarioDTO(req.body));
    res.status(201).json({ status: 'success', data: new UsuarioAdminDTO(usuario) });
  }

  // PUT /api/v1/users/:id -> cambia nombre, correo, contraseña y/o rol
  async actualizar(req, res) {
    const cambios = { ...new ActualizarUsuarioDTO(req.body) };
    const usuario = await this.#servicio.actualizar(req.params.id, cambios, req.user);
    res.status(200).json({ status: 'success', data: new UsuarioAdminDTO(usuario) });
  }

  // DELETE /api/v1/users/:id
  async eliminar(req, res) {
    await this.#servicio.eliminar(req.params.id, req.user);
    res.status(204).send();
  }
}

module.exports = { UserController, userController: new UserController() };
