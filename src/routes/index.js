const { Router } = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./authRoutes');
const { loginLimiter } = require('../middlewares/rateLimit');

const router = Router();

router.use('/health', healthRoutes);

// Limite estricto para el login, antes de montar las rutas de auth
router.use('/auth/login', loginLimiter);
router.use('/auth', authRoutes);

module.exports = router;
