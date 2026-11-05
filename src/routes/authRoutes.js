const express = require('express');
const { authController } = require('../controllers/AuthController');
const { registerValidation, loginValidation } = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);
router.get('/me', authenticate, authController.getMe);

module.exports = router;
