const { body, param } = require('express-validator');
const validate = require('./validate');

const validateCreateReview = [
    param('id').isInt({ min: 1 }).withMessage('El ID de la película debe ser un entero válido'),
    body('title')
        .trim()
        .notEmpty()
        .withMessage('El título es obligatorio')
        .isLength({ max: 255 })
        .withMessage('El título no puede exceder los 255 caracteres'),
    body('rating')
        .isInt({ min: 1, max: 10 })
        .withMessage('El rating debe ser un número entero entre 1 y 10'),
    body('comment')
        .trim()
        .notEmpty()
        .withMessage('El comentario es obligatorio')
        .isLength({ max: 1000 })
        .withMessage('El comentario no puede exceder los 1000 caracteres'), // <-- Añadido según feedback de Majo
    validate
];

module.exports = {
    validateCreateReview
};