const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { validateCreateReview } = require('../middlewares/reviewValidation');
const { createReview, getReviewsByMovieId } = require('../controllers/reviewController');

// Ruta para listar las reseñas de una película
router.get('/:id/reviews', getReviewsByMovieId);

// Ruta para crear reseña (requiere autenticación y validación)
router.post('/:id/reviews', authenticate, validateCreateReview, createReview);

module.exports = router;