const { body, param, query } = require('express-validator');
const { MovieRepository } = require('../repositories/MovieRepository');

const { ORDENES } = MovieRepository;
const validate = require('./validate');

const TIPOS = ['pelicula', 'serie', 'anime'];
const ESTADOS = ['pending', 'approved', 'rejected'];
const ANIO_MINIMO = 1888; // primera pelicula de la historia
const anioMaximo = () => new Date().getFullYear() + 5;

// La imagen puede ser una URL completa o una ruta de las portadas del propio sitio
// (por ejemplo /assets/img/portadas/gladiador-2000.jpg). No se aceptan rutas con "..",
// "//" ni otros esquemas, para que no apunte fuera de esa carpeta.
const RUTA_PORTADA = /^\/assets\/img\/[A-Za-z0-9._/-]+$/;
function esImagenValida(valor) {
  if (typeof valor !== 'string') return false;
  if (RUTA_PORTADA.test(valor)) return !valor.includes('..') && !valor.includes('//');
  try {
    const url = new URL(valor);
    const hostValido = url.hostname.includes('.') || url.hostname === 'localhost';
    return ['http:', 'https:'].includes(url.protocol) && hostValido;
  } catch {
    return false;
  }
}

// Reglas de cada campo. En la creacion son obligatorias; en PUT son opcionales.
function reglasCampos(opcional) {
  const campo = (nombre) => {
    const regla = body(nombre);
    return opcional ? regla.optional() : regla;
  };

  return [
    campo('title').trim().notEmpty().withMessage('El titulo es requerido')
      .isLength({ max: 255 }).withMessage('El titulo no puede pasar de 255 caracteres'),
    campo('description').trim().notEmpty().withMessage('La descripcion es requerida')
      .isLength({ max: 5000 }).withMessage('La descripcion no puede pasar de 5000 caracteres'),
    campo('categoryId').isInt({ min: 1 }).withMessage('categoryId debe ser un entero positivo').toInt(),
    campo('year')
      .isInt({ min: ANIO_MINIMO, max: anioMaximo() })
      .withMessage(`El anio debe estar entre ${ANIO_MINIMO} y ${anioMaximo()}`)
      .toInt(),
    campo('type').isIn(TIPOS).withMessage(`El tipo debe ser: ${TIPOS.join(', ')}`),
    // imageUrl siempre es opcional (null para quitarla)
    body('imageUrl').optional({ values: 'null' })
      .custom(esImagenValida).withMessage('imageUrl debe ser una URL valida o una ruta /assets/img/...')
      .bail()
      .isLength({ max: 500 }).withMessage('imageUrl no puede pasar de 500 caracteres'),
  ];
}

// Ademas de los nombres internos se aceptan popularity y year
const SORTS_VALIDOS = [...Object.keys(ORDENES), 'popularity', 'year'];

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

const rankingValidation = [
  query('categoryId').optional().isInt({ min: 1 }).withMessage('categoryId debe ser un entero positivo').toInt(),
  query('type').optional().isIn(TIPOS).withMessage(`El tipo debe ser: ${TIPOS.join(', ')}`),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit debe estar entre 1 y 100').toInt(),
  validate,
];

const listMoviesValidation = [
  query('categoryId').optional().isInt({ min: 1 }).withMessage('categoryId debe ser un entero positivo').toInt(),
  query('type').optional().isIn(TIPOS).withMessage(`El tipo debe ser: ${TIPOS.join(', ')}`),
  query('status').optional().isIn(ESTADOS).withMessage(`El status debe ser: ${ESTADOS.join(', ')}`),
  query('category').optional().isInt({ min: 1 }).withMessage('category debe ser un entero positivo').toInt(),
  query('sort').optional().isIn(SORTS_VALIDOS).withMessage(`sort debe ser: ${SORTS_VALIDOS.join(', ')}`),
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
  rankingValidation,
};
