const Controller = require('./Controller');
const { authService } = require('../services/AuthService');
const { RegistroDTO, CredencialesDTO, UsuarioPublicoDTO } = require('../dtos/auth.dto');

class AuthController extends Controller {
  #servicio;

  constructor(servicio = authService) {
    super();
    this.#servicio = servicio;
  }

  // POST /api/v1/auth/register
  async register(req, res) {
    const usuario = await this.#servicio.registrar(new RegistroDTO(req.body));
    res.status(201).json({
      status: 'success',
      message: 'Usuario registrado exitosamente',
      data: new UsuarioPublicoDTO(usuario),
    });
  }

  // POST /api/v1/auth/login
  async login(req, res) {
    const { token, usuario } = await this.#servicio.iniciarSesion(new CredencialesDTO(req.body));
    res.status(200).json({ status: 'success', token, user: new UsuarioPublicoDTO(usuario) });
  }

  // GET /api/v1/auth/me
  async getMe(req, res) {
    res.status(200).json({ status: 'success', user: req.user });
  }
}

module.exports = { AuthController, authController: new AuthController() };
