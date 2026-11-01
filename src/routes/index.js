const { Router } = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./authRoutes');
const movieRoutes = require('./movie.routes');
const categoryRoutes = require('./category.routes');
const { loginLimiter } = require('../middlewares/rateLimit');
const reviewRoutes = require('./reviewRoutes');
const reviewsRoutes = require('./reviews.routes');
const watchlistRoutes = require('./watchlist.routes');

const router = Router();

router.use('/health', healthRoutes);

// Limite estricto para el login, antes de montar las rutas de auth
router.use('/auth/login', loginLimiter);
router.use('/auth', authRoutes);

router.use('/movies', movieRoutes);
router.use('/categories', categoryRoutes);
router.use('/movies', reviewRoutes);
router.use('/reviews', reviewsRoutes);
router.use('/watchlist', watchlistRoutes);

module.exports = router;
