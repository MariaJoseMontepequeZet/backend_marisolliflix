const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool } = require('../config/db');
const AppError = require('../utils/AppError');
const env = require('../config/env');

// POST /api/v1/auth/register
const register = async (req, res, next) => {
  const { username, email, password } = req.body;

  try {
    const pool = getPool();

    // 1. Verificar si ya existe el usuario o email
    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );

    if (existingUsers.length > 0) {
      return next(new AppError('El email o username ya se encuentra registrado', 409));
    }

    // 2. Encriptar contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Insertar usuario en MySQL
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password, role, created_at) VALUES (?, ?, ?, ?, NOW())',
      [username, email, hashedPassword, 'user']
    );

    return res.status(201).json({
      status: 'success',
      message: 'Usuario registrado exitosamente',
      data: {
        id: result.insertId,
        username,
        email,
        role: 'user'
      }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/auth/login
const login = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const pool = getPool();

    // 1. Buscar usuario por email
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return next(new AppError('Credenciales inválidas', 401));
    }

    const user = users[0];

    // 2. Comparar contraseñas
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
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
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
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