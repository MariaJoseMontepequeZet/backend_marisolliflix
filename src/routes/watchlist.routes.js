const { Router } = require('express');
const { getWatchlist, addToWatchlist, removeFromWatchlist } = require('../controllers/watchlistController');
const { authenticate } = require('../middlewares/auth');
const { movieIdParam, listWatchlistValidation } = require('../middlewares/watchlistValidation');

const router = Router();

// "Mi lista": cada usuario solo ve y cambia la suya
router.use(authenticate);
router.get('/', listWatchlistValidation, getWatchlist);
router.post('/:movieId', movieIdParam, addToWatchlist);
router.delete('/:movieId', movieIdParam, removeFromWatchlist);

module.exports = router;
