const { Router } = require('express');
const healthRoutes = require('./health.routes');
const { loginLimiter } = require('../middlewares/rateLimit');

const router = Router();

router.use('/health', healthRoutes);

// Limite estricto para el login (la ruta de auth se agrega en su historia)
router.use('/auth/login', loginLimiter);

module.exports = router;
