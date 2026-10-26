const express = require('express');
const passport = require('passport');
const { register, login, getMe } = require('../controllers/authController');
const { registerValidation } = require('../middlewares/validate');

const router = express.Router();

// POST /api/v1/auth/register
router.post('/register', registerValidation, register);

// POST /api/v1/auth/login
router.post('/login', login);

// GET /api/v1/auth/me
router.get('/me', passport.authenticate('jwt', { session: false }), getMe);

module.exports = router;