const express = require('express');
const passport = require('passport');
const { register, login, getMe } = require('../controllers/authController');
const { registerValidation, loginValidation } = require('../middlewares/validate');

const router = express.Router();

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/me', passport.authenticate('jwt', { session: false }), getMe);

module.exports = router;