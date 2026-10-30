const { movieService } = require('../services/MovieService');
const { CrearPeliculaDTO, ActualizarPeliculaDTO, CambiarEstadoDTO } = require('../dtos/movie.dto');

const paginacion = ({ page, limit, total }) => ({ page, limit, total, pages: Math.ceil(total / limit) });

// POST /api/v1/movies -> usuario: queda pending; admin: queda approved
const createMovie = async (req, res, next) => {
  try {
    const movie = await movieService.crear({ ...new CrearPeliculaDTO(req.body) }, req.user);
    return res.status(201).json({ status: 'success', data: movie });
  } catch (error) {
    return next(error);
  }
};

// GET /api/v1/movies -> publico ve solo approved; admin puede filtrar por ?status=
const getMovies = async (req, res, next) => {
  try {
    const resultado = await movieService.listar(req.query, req.user);
    return res.status(200).json({ status: 'success', data: resultado.movies, pagination: paginacion(resultado) });
  } catch (error) {
    return next(error);
  }
};

// GET /api/v1/movies/:id -> si no esta approved solo la ven el admin y quien la propuso
const getMovie = async (req, res, next) => {
  try {
    const { movie, reviews } = await movieService.obtener(req.params.id, req.user);
    return res.status(200).json({ status: 'success', data: { ...movie.toJSON(), reviews } });
  } catch (error) {
    return next(error);
  }
};

// GET /api/v1/movies/ranking -> publico: las aprobadas con mejor ranking (?limit=, ?categoryId=, ?type=)
const getRanking = async (req, res, next) => {
  try {
    const { movies, total } = await movieService.ranking(req.query);
    return res.status(200).json({ status: 'success', data: movies, total });
  } catch (error) {
    return next(error);
  }
};

// GET /api/v1/movies/pending -> solo admin: cola de propuestas por revisar (las mas viejas primero)
const getPendingMovies = async (req, res, next) => {
  try {
    const resultado = await movieService.pendientes(req.query);
    return res.status(200).json({ status: 'success', data: resultado.movies, pagination: paginacion(resultado) });
  } catch (error) {
    return next(error);
  }
};

// PATCH /api/v1/movies/:id/status -> solo admin: aprueba o rechaza
const updateMovieStatus = async (req, res, next) => {
  try {
    const movie = await movieService.cambiarEstado(req.params.id, new CambiarEstadoDTO(req.body));
    return res.status(200).json({ status: 'success', data: movie });
  } catch (error) {
    return next(error);
  }
};

// PUT /api/v1/movies/:id -> solo admin. Acepta los campos que quieras cambiar
// (incluido status para aprobar o rechazar).
const updateMovie = async (req, res, next) => {
  try {
    const movie = await movieService.actualizar(req.params.id, { ...new ActualizarPeliculaDTO(req.body) });
    return res.status(200).json({ status: 'success', data: movie });
  } catch (error) {
    return next(error);
  }
};

// DELETE /api/v1/movies/:id -> solo admin
const deleteMovie = async (req, res, next) => {
  try {
    await movieService.eliminar(req.params.id);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createMovie, getMovies, getRanking, getPendingMovies, getMovie, updateMovie, updateMovieStatus, deleteMovie,
};
