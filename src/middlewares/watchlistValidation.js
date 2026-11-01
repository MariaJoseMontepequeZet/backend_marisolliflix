const { param, query } = require('express-validator');
const validate = require('./validate');

const movieIdParam = [
  param('movieId').isInt({ min: 1 }).withMessage('movieId debe ser un entero positivo').toInt(),
  validate,
];

const listWatchlistValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('page debe ser un entero positivo').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit debe estar entre 1 y 100').toInt(),
  validate,
];

module.exports = { movieIdParam, listWatchlistValidation };
