const bcrypt = require('bcryptjs');
const { getDb } = require('../config/db');
const AppError = require('../utils/AppError');

// POST /api/v1/auth/register
const register = async (req, res, next) => {
  const { username, email, password } = req.body;

  try {
    const db = getDb();
    const usersCollection = db.collection('users');

    // 1. Verificar si ya existe email o username
    const existingUser = await usersCollection.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return next(new AppError('El email o username ya se encuentra registrado', 409)); // CA: 409
    }

    // 2. Encriptar contraseña con bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Objeto de usuario
    const newUser = {
      username,
      email,
      password: hashedPassword,
      role: 'user', // CA: role='user'
      createdAt: new Date() // CA: createdAt
    };

    const result = await usersCollection.insertOne(newUser);

    // 4. Respuesta 201 al crear
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

module.exports = {
  register
};