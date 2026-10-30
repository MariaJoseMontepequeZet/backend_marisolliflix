const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { validateUpdateReview, validateReviewId, validateReaction } = require('../middlewares/reviewValidation');
const { updateReview, deleteReview, reactToReview, removeReaction } = require('../controllers/reviewController');

// Acciones sobre una reseña concreta (se montan bajo /reviews): /reviews/:id
router.put('/:id', authenticate, validateUpdateReview, updateReview);
router.delete('/:id', authenticate, validateReviewId, deleteReview);

// Like / dislike (toggle) y quitar el voto
router.post('/:id/reaction', authenticate, validateReaction, reactToReview);
router.delete('/:id/reaction', authenticate, validateReviewId, removeReaction);

module.exports = router;
