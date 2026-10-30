const express = require('express');
const router = express.Router();
const { authenticate, optionalAuthenticate } = require('../middlewares/auth');
const { validateCreateReview, validateListReviews } = require('../middlewares/reviewValidation');
const { createReview, getReviewsByMovieId } = require('../controllers/reviewController');

// Reseñas de una pelicula (se montan bajo /movies): /movies/:id/reviews
router.get('/:id/reviews', optionalAuthenticate, validateListReviews, getReviewsByMovieId);
router.post('/:id/reviews', authenticate, validateCreateReview, createReview);

module.exports = router;
