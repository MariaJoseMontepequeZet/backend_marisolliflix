const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { validateCreateReview } = require('../middlewares/reviewValidation');
const { 
    createReview, 
    getReviewsByMovieId, 
    updateReview, 
    deleteReview 
} = require('../controllers/reviewController');

// Rutas públicas / de lectura
router.get('/:id/reviews', getReviewsByMovieId);

// Rutas protegidas (Requieren autenticación)
router.post('/:id/reviews', authenticate, validateCreateReview, createReview);
router.put('/reviews/:id', authenticate, updateReview);
router.delete('/reviews/:id', authenticate, deleteReview);

module.exports = router;