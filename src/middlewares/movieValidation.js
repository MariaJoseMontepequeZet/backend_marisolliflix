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

// Trailer: solo enlaces de YouTube (el frontend los muestra con el reproductor de YouTube)
const TRAILER_YOUTUBE = /^https:\/\/(www\.|m\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\/)[A-Za-z0-9_-]{11}([?&#].*)?$/;

// Plataformas de streaming que se pueden registrar para un titulo
const PLATAFORMAS = [
  'netflix', 'prime', 'disney', 'max', 'appletv', 'paramount', 'crunchyroll', 'vix', 'mubi', 'youtube', 'otra',
];
const MAX_PLATAFORMAS = PLATAFORMAS.length;

function esUrlWeb(valor) {
  try {
    const url = new URL(valor);
    return ['http:', 'https:'].includes(url.protocol) && url.hostname.includes('.');
  } catch {
    return false;
  }
}

// streaming: lista de { platform, url } sin plataformas repetidas
function validarStreaming(lista) {
  if (!Array.isArray(lista)) throw new Error('streaming debe ser una lista');
  if (lista.length > MAX_PLATAFORMAS) throw new Error(`streaming admite hasta ${MAX_PLATAFORMAS} plataformas`);
  const vistas = new Set();
  for (const item of lista) {
    if (!item || typeof item !== 'object') throw new Error('Cada plataforma debe ser un objeto { platform, url }');
    if (!PLATAFORMAS.includes(item.platform)) {
      throw new Error(`platform debe ser: ${PLATAFORMAS.join(', ')}`);
    }
    if (vistas.has(item.platform)) throw new Error(`La plataforma ${item.platform} esta repetida`);
    vistas.add(item.platform);
    if (typeof item.url !== 'string' || item.url.length > 500 || !esUrlWeb(item.url)) {
      throw new Error(`La URL de ${item.platform} debe ser http o https (maximo 500 caracteres)`);
    }
  }
  return true;
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
    // trailerUrl y streaming siempre son opcionales (null para quitarlos)
    body('trailerUrl').optional({ values: 'null' })
      .isString().withMessage('trailerUrl debe ser texto').bail()
      .trim()
      .isLength({ max: 500 }).withMessage('trailerUrl no puede pasar de 500 caracteres').bail()
      .matches(TRAILER_YOUTUBE).withMessage('trailerUrl debe ser un enlace de YouTube (youtube.com/watch?v=... o youtu.be/...)'),
    body('streaming').optional({ values: 'null' }).custom(validarStreaming),
    // Calificacion de IMDb: de 1 a 10 con un decimal (null la quita)
    body('imdbRating').optional({ values: 'null' })
      .isFloat({ min: 1, max: 10 }).withMessage('imdbRating debe ser un numero entre 1 y 10').bail()
      .toFloat()
      .customSanitizer((n) => Math.round(n * 10) / 10),
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
  query('q').optional().isString().trim().isLength({ max: 100 }).withMessage('q no puede pasar de 100 caracteres'),
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
  PLATAFORMAS,
  createMovieValidation,
  updateMovieValidation,
  movieIdValidation,
  movieStatusValidation,
  listMoviesValidation,
  listPendingValidation,
  rankingValidation,
};
