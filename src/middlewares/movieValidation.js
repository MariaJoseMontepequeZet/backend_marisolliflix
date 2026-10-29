const { body, param, query } = require('express-validator');
const { ORDENES } = require('../models/movieModel');
const validate = require('./validate');

const TIPOS = ['pelicula', 'serie', 'anime'];
const ESTADOS = ['pending', 'approved', 'rejected'];
const ANIO_MINIMO = 1888; // primera pelicula de la historia
const anioMaximo = () => new Date().getFullYear() + 5;

// Reglas de cada campo. En la creacion son obligatorias; en PUT son opcionales.
function reglasCampos(opcional) {
  const campo = (nombre) => {
    const regla = body(nombre);
    return opcional ? regla.optional() : regla;
  };

  return [
    campo('title').trim().notEmpty().withMessage('El titulo es requerido')
      .isLength({ max: 255 }).withMessage('El titulo no puede pasar de 255 caracteres'),
    campo('description').trim().notEmpty().withMessage('La descripcion es requerida'),
    campo('categoryId').isInt({ min: 1 }).withMessage('categoryId debe ser un entero positivo').toInt(),
    campo('year')
      .isInt({ min: ANIO_MINIMO, max: anioMaximo() })
      .withMessage(`El anio debe estar entre ${ANIO_MINIMO} y ${anioMaximo()}`)
      .toInt(),
    campo('type').isIn(TIPOS).withMessage(`El tipo debe ser: ${TIPOS.join(', ')}`),
    // imageUrl siempre es opcional (null para quitarla)
    body('imageUrl').optional({ values: 'null' }).isURL().withMessage('imageUrl debe ser una URL valida')
      .isLength({ max: 500 }).withMessage('imageUrl no puede pasar de 500 caracteres'),
  ];
}

const idParam = param('id').isInt({ min: 1 }).withMessage('El id debe ser un entero positivo').toInt();

const createMovieValidation = [...reglasCampos(false), validate];

const updateMovieValidation = [
  idParam,
  ...reglasCampos(true),
  body('status').optional().isIn(ESTADOS).withMessage(`El status debe ser: ${ESTADOS.join(', ')}`),
  validate,
];

const movieIdValidation = [idParam, validate];

// Aqui solo se puede aprobar o rechazar; volver a pending no esta permitido
const DECISIONES = ['approved', 'rejected'];
const movieStatusValidation = [
  idParam,
  body('status').isIn(DECISIONES).withMessage(`El status debe ser: ${DECISIONES.join(', ')}`),
  validate,
];

const listPendingValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('page debe ser un entero positivo').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit debe estar entre 1 y 100').toInt(),
  validate,
];

const listMoviesValidation = [
  query('categoryId').optional().isInt({ min: 1 }).withMessage('categoryId debe ser un entero positivo').toInt(),
  query('type').optional().isIn(TIPOS).withMessage(`El tipo debe ser: ${TIPOS.join(', ')}`),
  query('status').optional().isIn(ESTADOS).withMessage(`El status debe ser: ${ESTADOS.join(', ')}`),
  query('sort').optional().isIn(Object.keys(ORDENES)).withMessage(`sort debe ser: ${Object.keys(ORDENES).join(', ')}`),
  query('page').optional().isInt({ min: 1 }).withMessage('page debe ser un entero positivo').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit debe estar entre 1 y 100').toInt(),
  validate,
];

module.exports = {
  createMovieValidation,
  updateMovieValidation,
  movieIdValidation,
  movieStatusValidation,
  listMoviesValidation,
  listPendingValidation,
};
