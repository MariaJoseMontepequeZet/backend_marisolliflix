const { body, param, validationResult } = require('express-validator');

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

const validateCreateReview = [
    param('id').isInt({ min: 1 }).withMessage('El ID de la película debe ser un entero válido'),
    body('title')
        .trim()
        .notEmpty()
        .withMessage('El título es obligatorio'),
    body('rating')
        .isInt({ min: 1, max: 10 })
        .withMessage('El rating debe ser un número entero entre 1 y 10'),
    body('comment')
        .trim()
        .notEmpty()
        .withMessage('El comentario es obligatorio'),
    validate
];

module.exports = {
    validateCreateReview
};