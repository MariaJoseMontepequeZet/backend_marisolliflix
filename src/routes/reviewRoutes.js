const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { validateCreateReview } = require('../middlewares/reviewValidation');
const { createReview } = require('../controllers/reviewController');

router.post('/:id/reviews', authenticate, validateCreateReview, createReview);

module.exports = router;