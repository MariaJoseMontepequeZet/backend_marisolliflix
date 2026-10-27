const { Router } = require('express');
const {
  createMovie, getMovies, getPendingMovies, getMovie, updateMovie, updateMovieStatus, deleteMovie,
} = require('../controllers/movieController');
const { authenticate, optionalAuthenticate, authorize } = require('../middlewares/auth');
const {
  createMovieValidation, updateMovieValidation, movieIdValidation, movieStatusValidation,
  listMoviesValidation, listPendingValidation,
} = require('../middlewares/movieValidation');

const router = Router();

// Lectura publica (si mandas token, el admin y el autor ven tambien las no aprobadas)
router.get('/', optionalAuthenticate, listMoviesValidation, getMovies);

// Debe ir antes de /:id, si no "pending" se leeria como un id
router.get('/pending', authenticate, authorize('admin'), listPendingValidation, getPendingMovies);
router.get('/:id', optionalAuthenticate, movieIdValidation, getMovie);

// Cualquier usuario autenticado puede proponer
router.post('/', authenticate, createMovieValidation, createMovie);

// Solo admin
router.patch('/:id/status', authenticate, authorize('admin'), movieStatusValidation, updateMovieStatus);
router.put('/:id', authenticate, authorize('admin'), updateMovieValidation, updateMovie);
router.delete('/:id', authenticate, authorize('admin'), movieIdValidation, deleteMovie);

module.exports = router;
