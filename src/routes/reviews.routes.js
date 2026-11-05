const express = require('express');
const { authenticate } = require('../middlewares/auth');
const { validateUpdateReview, validateReviewId, validateReaction } = require('../middlewares/reviewValidation');
const { reviewController } = require('../controllers/ReviewController');

const router = express.Router();

// Acciones sobre una reseña concreta (se montan bajo /reviews): /reviews/:id
router.put('/:id', authenticate, validateUpdateReview, reviewController.editar);
router.delete('/:id', authenticate, validateReviewId, reviewController.eliminar);

// Like / dislike (toggle) y quitar el voto
router.post('/:id/reaction', authenticate, validateReaction, reviewController.reaccionar);
router.delete('/:id/reaction', authenticate, validateReviewId, reviewController.quitarReaccion);

module.exports = router;
