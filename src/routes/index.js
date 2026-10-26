const { Router } = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./authRoutes');
const { loginLimiter } = require('../middlewares/rateLimit');

const router = Router();

router.use('/health', healthRoutes);

// Límite estricto para el login (rate-limit que dejó Majo)
router.use('/auth/login', loginLimiter);

// Rutas principales de autenticación (/auth/register, etc.)
router.use('/auth', authRoutes);

module.exports = router;
