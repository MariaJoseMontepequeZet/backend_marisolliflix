const { query } = require('express-validator');
const validate = require('./validate');

const ANIO_MINIMO = 1888; // primera pelicula de la historia
const ANIO_MAXIMO = 2100;

// Revisa que el minimo no sea mayor que el maximo (si vienen los dos)
const noMayorQue = (campoMaximo, mensaje) => (valor, { req }) => {
  const maximo = req.query[campoMaximo];
  if (maximo !== undefined && maximo !== '' && Number(valor) > Number(maximo)) throw new Error(mensaje);
  return true;
};

// Las calificaciones van de 0 a 5 estrellas
const searchMoviesValidation = [
  query('categoria').optional().trim().isLength({ min: 1, max: 50 })
    .withMessage('categoria debe tener entre 1 y 50 caracteres'),
  query('minRating').optional().isFloat({ min: 0, max: 5 }).withMessage('minRating debe estar entre 0 y 5')
    .bail().custom(noMayorQue('maxRating', 'minRating no puede ser mayor que maxRating')),
  query('maxRating').optional().isFloat({ min: 0, max: 5 }).withMessage('maxRating debe estar entre 0 y 5'),
  query('anioDesde').optional().isInt({ min: ANIO_MINIMO, max: ANIO_MAXIMO }).withMessage('anioDesde inválido')
    .bail().custom(noMayorQue('anioHasta', 'anioDesde no puede ser mayor que anioHasta')),
  query('anioHasta').optional().isInt({ min: ANIO_MINIMO, max: ANIO_MAXIMO }).withMessage('anioHasta inválido'),
  validate,
];

module.exports = { searchMoviesValidation };
