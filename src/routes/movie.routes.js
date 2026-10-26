const { Router } = require('express');
const {
  createMovie, getMovies, getMovie, updateMovie, deleteMovie,
} = require('../controllers/movieController');
const { authenticate, optionalAuthenticate, authorize } = require('../middlewares/auth');
const {
  createMovieValidation, updateMovieValidation, movieIdValidation, listMoviesValidation,
} = require('../middlewares/movieValidation');

const router = Router();

// Lectura publica (si mandas token, el admin y el autor ven tambien las no aprobadas)
router.get('/', optionalAuthenticate, listMoviesValidation, getMovies);
router.get('/:id', optionalAuthenticate, movieIdValidation, getMovie);

// Cualquier usuario autenticado puede proponer
router.post('/', authenticate, createMovieValidation, createMovie);

// Solo admin
router.put('/:id', authenticate, authorize('admin'), updateMovieValidation, updateMovie);
router.delete('/:id', authenticate, authorize('admin'), movieIdValidation, deleteMovie);

module.exports = router;
