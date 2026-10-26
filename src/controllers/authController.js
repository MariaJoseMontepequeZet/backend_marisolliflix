const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../config/db');
const AppError = require('../utils/AppError');
const env = require('../config/env');

// POST /api/v1/auth/register
const register = async (req, res, next) => {
  const { username, email, password } = req.body;

  try {
    const db = getDb();
    const usersCollection = db.collection('users');

    const existingUser = await usersCollection.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return next(new AppError('El email o username ya se encuentra registrado', 409));
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = {
      username,
      email,
      password: hashedPassword,
      role: 'user',
      createdAt: new Date()
    };

    const result = await usersCollection.insertOne(newUser);

    return res.status(201).json({
      status: 'success',
      message: 'Usuario registrado exitosamente',
      data: {
        id: result.insertedId,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt
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
    const db = getDb();
    const user = await db.collection('users').findOne({ email });

    if (!user) {
      return next(new AppError('Credenciales inválidas', 401));
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return next(new AppError('Credenciales inválidas', 401));
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      env.JWT_SECRET || 'secret_key',
      { expiresIn: '8h' }
    );

    return res.status(200).json({
      status: 'success',
      token: `Bearer ${token}`,
      user: {
        id: user._id,
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