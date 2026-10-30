const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const { RegistroDTO, CredencialesDTO, UsuarioPublicoDTO } = require('../dtos/auth.dto');
const AppError = require('../utils/AppError');
const env = require('../config/env');

// POST /api/v1/auth/register
const register = async (req, res, next) => {
  const { username, email, password } = new RegistroDTO(req.body);

  try {
    // 1. Verificar si ya existe el usuario o email
    if (await userModel.existsByEmailOrUsername(email, username)) {
      return next(new AppError('El email o username ya se encuentra registrado', 409));
    }

    // 2. Encriptar contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 3. Guardar el usuario en MySQL
    const user = await userModel.create({ username, email, passwordHash });

    return res.status(201).json({
      status: 'success',
      message: 'Usuario registrado exitosamente',
      data: new UsuarioPublicoDTO(user)
    });
  } catch (error) {
    // Dos registros simultaneos pueden pasar el SELECT; el indice unico los frena
    if (error.code === 'ER_DUP_ENTRY') {
      return next(new AppError('El email o username ya se encuentra registrado', 409));
    }
    next(error);
  }
};

// POST /api/v1/auth/login
const login = async (req, res, next) => {
  const { email, password } = new CredencialesDTO(req.body);

  try {
    // 1. Buscar usuario por email
    const user = await userModel.findByEmail(email);
    if (!user) {
      return next(new AppError('Credenciales inválidas', 401));
    }

    // 2. Comparar contraseñas
    if (!(await user.passwordCoincide(password))) {
      return next(new AppError('Credenciales inválidas', 401));
    }

    // 3. Generar JWT usando variables de entorno oficiales
    const token = jwt.sign(
      { id: user.id, role: user.role },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES || '8h' }
    );

    return res.status(200).json({
      status: 'success',
      token,
      user: new UsuarioPublicoDTO(user)
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/auth/me
const getMe = async (req, res) => {
  return res.status(200).json({
    status: 'success',
    user: req.user
  });
};

module.exports = {
  register,
  login,
  getMe
};