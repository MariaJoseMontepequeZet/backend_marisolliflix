const { Router } = require('express');
const { movieController, buscar } = require('../controllers/MovieController'); // Examen: se agrega buscar
const { authenticate, optionalAuthenticate, authorize } = require('../middlewares/auth');
const {
  createMovieValidation, updateMovieValidation, movieIdValidation, movieStatusValidation,
  listMoviesValidation, listPendingValidation, rankingValidation,
} = require('../middlewares/movieValidation');
const validarBusqueda = require('../middlewares/sharevalidation'); // Examen

const router = Router();

// Lectura publica (si mandas token, el admin y el autor ven tambien las no aprobadas)
router.get('/', optionalAuthenticate, listMoviesValidation, movieController.listar);

// Deben ir antes de /:id, si no "ranking" y "pending" se leerian como un id
router.get('/ranking', rankingValidation, movieController.ranking);
router.get('/pending', authenticate, authorize('admin'), listPendingValidation, movieController.pendientes);
// Examen - Buscador avanzado (publico): ?categoria=&minRating=&maxRating=&anioDesde=&anioHasta=
router.get('/search', validarBusqueda, buscar);
router.get('/:id', optionalAuthenticate, movieIdValidation, movieController.obtener);

// Cualquier usuario autenticado puede proponer
router.post('/', authenticate, createMovieValidation, movieController.crear);

// Solo admin
router.patch('/:id/status', authenticate, authorize('admin'), movieStatusValidation, movieController.cambiarEstado);
router.put('/:id', authenticate, authorize('admin'), updateMovieValidation, movieController.actualizar);
router.delete('/:id', authenticate, authorize('admin'), movieIdValidation, movieController.eliminar);

module.exports = router;