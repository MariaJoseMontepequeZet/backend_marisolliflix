const { authService } = require('../services/AuthService');
const { RegistroDTO, CredencialesDTO, UsuarioPublicoDTO } = require('../dtos/auth.dto');

// POST /api/v1/auth/register
const register = async (req, res, next) => {
  try {
    const usuario = await authService.registrar(new RegistroDTO(req.body));
    return res.status(201).json({
      status: 'success',
      message: 'Usuario registrado exitosamente',
      data: new UsuarioPublicoDTO(usuario),
    });
  } catch (error) {
    return next(error);
  }
};

// POST /api/v1/auth/login
const login = async (req, res, next) => {
  try {
    const { token, usuario } = await authService.iniciarSesion(new CredencialesDTO(req.body));
    return res.status(200).json({ status: 'success', token, user: new UsuarioPublicoDTO(usuario) });
  } catch (error) {
    return next(error);
  }
};

// GET /api/v1/auth/me
const getMe = async (req, res) => {
  return res.status(200).json({ status: 'success', user: req.user });
};

module.exports = { register, login, getMe };
