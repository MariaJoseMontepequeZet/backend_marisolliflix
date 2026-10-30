const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { validateUpdateReview, validateReviewId } = require('../middlewares/reviewValidation');
const { updateReview, deleteReview } = require('../controllers/reviewController');

// Acciones sobre una reseña concreta (se montan bajo /reviews): /reviews/:id
router.put('/:id', authenticate, validateUpdateReview, updateReview);
router.delete('/:id', authenticate, validateReviewId, deleteReview);

module.exports = router;
