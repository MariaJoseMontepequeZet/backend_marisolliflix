const express = require('express');
const { authenticate, optionalAuthenticate } = require('../middlewares/auth');
const { validateCreateReview, validateListReviews } = require('../middlewares/reviewValidation');
const { reviewController } = require('../controllers/ReviewController');

const router = express.Router();

// Reseñas de una pelicula (se montan bajo /movies): /movies/:id/reviews
router.get('/:id/reviews', optionalAuthenticate, validateListReviews, reviewController.listarPorPelicula);
router.post('/:id/reviews', authenticate, validateCreateReview, reviewController.crear);

module.exports = router;
