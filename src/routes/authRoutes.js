const express = require('express');
const { register } = require('../controllers/authController');
const { registerValidation } = require('../middlewares/validate');

const router = express.Router();

// POST /api/v1/auth/register
router.post('/register', registerValidation, register);

module.exports = router;