const { body, param } = require('express-validator');
const validate = require('./validate');

const reviewIdParam = param('id').isInt({ min: 1 }).withMessage('El id de la reseña debe ser un entero positivo').toInt();
const movieIdParam = param('id').isInt({ min: 1 }).withMessage('El id de la película debe ser un entero positivo').toInt();

// Reglas de cada campo; en la edicion son opcionales pero, si vienen, deben ser validas
function reglasCampos(opcional) {
  const campo = (nombre) => {
    const regla = body(nombre);
    return opcional ? regla.optional() : regla;
  };

  return [
    campo('title').isString().withMessage('El título debe ser texto').bail()
      .trim().notEmpty().withMessage('El título es obligatorio')
      .isLength({ max: 255 }).withMessage('El título no puede exceder los 255 caracteres'),
    campo('rating')
      .custom((valor) => typeof valor === 'number' || typeof valor === 'string')
      .withMessage('El rating debe ser un número entero entre 1 y 10').bail()
      .isInt({ min: 1, max: 10 }).withMessage('El rating debe ser un número entero entre 1 y 10').toInt(),
    campo('comment').isString().withMessage('El comentario debe ser texto').bail()
      .trim().notEmpty().withMessage('El comentario es obligatorio')
      .isLength({ max: 1000 }).withMessage('El comentario no puede exceder los 1000 caracteres'),
  ];
}

const validateListReviews = [movieIdParam, validate];

const validateCreateReview = [movieIdParam, ...reglasCampos(false), validate];

// Al editar hay que mandar al menos uno de los tres campos
const validateUpdateReview = [
  reviewIdParam,
  ...reglasCampos(true),
  body().custom((cuerpo) => {
    if (!cuerpo || !['title', 'rating', 'comment'].some((c) => cuerpo[c] !== undefined)) {
      throw new Error('Envía al menos uno de estos campos: title, rating, comment');
    }
    return true;
  }),
  validate,
];

const validateReviewId = [reviewIdParam, validate];

const validateReaction = [
  reviewIdParam,
  body('type')
    .custom((valor) => typeof valor === 'string' && ['like', 'dislike'].includes(valor))
    .withMessage('type debe ser "like" o "dislike"'),
  validate,
];

module.exports = {
  validateListReviews, validateCreateReview, validateUpdateReview, validateReviewId, validateReaction,
};
