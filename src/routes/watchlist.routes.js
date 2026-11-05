const { Router } = require('express');
const { watchlistController } = require('../controllers/WatchlistController');
const { authenticate } = require('../middlewares/auth');
const { movieIdParam, listWatchlistValidation } = require('../middlewares/watchlistValidation');

const router = Router();

// "Mi lista": cada usuario solo ve y cambia la suya
router.use(authenticate);
router.get('/', listWatchlistValidation, watchlistController.listar);
router.post('/:movieId', movieIdParam, watchlistController.agregar);
router.delete('/:movieId', movieIdParam, watchlistController.quitar);

module.exports = router;
