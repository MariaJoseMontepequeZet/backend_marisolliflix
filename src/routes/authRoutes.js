const express = require('express');
const { register, login, getMe } = require('../controllers/authController');
const { registerValidation, loginValidation } = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/me', authenticate, getMe);

module.exports = router;
