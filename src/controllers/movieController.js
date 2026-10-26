const Movie = require('../models/movieModel');
const AppError = require('../utils/AppError');

const MENSAJE_TITULO_REPETIDO = 'Ya existe una pelicula o serie con ese titulo';

// El indice unico de title es la garantia final (evita carreras entre dos peticiones)
function manejarErrorDeBd(error, next) {
  if (error.code === 'ER_DUP_ENTRY') {
    return next(new AppError(MENSAJE_TITULO_REPETIDO, 409));
  }
  return next(error);
}

async function validarCategoria(categoryId) {
  if (!(await Movie.categoryExists(categoryId))) {
    throw new AppError('Datos invalidos', 422, [
      { field: 'categoryId', message: 'La categoria no existe' },
    ]);
  }
}

// POST /api/v1/movies -> usuario: queda pending; admin: queda approved
const createMovie = async (req, res, next) => {
  try {
    await validarCategoria(req.body.categoryId);
    const status = req.user.role === 'admin' ? 'approved' : 'pending';
    const movie = await Movie.create({ ...req.body, status }, req.user.id);
    return res.status(201).json({ status: 'success', data: movie });
  } catch (error) {
    return manejarErrorDeBd(error, next);
  }
};

// GET /api/v1/movies -> publico ve solo approved; admin puede filtrar por ?status=
const getMovies = async (req, res, next) => {
  try {
    const { categoryId, type, status } = req.query;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const esAdmin = req.user && req.user.role === 'admin';
    const filtros = { categoryId, type, status: esAdmin ? status : 'approved' };

    const { total, movies } = await Movie.findAll(filtros, { limit, offset: (page - 1) * limit });
    return res.status(200).json({
      status: 'success',
      data: movies,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return next(error);
  }
};

// GET /api/v1/movies/:id -> si no esta approved solo la ven el admin y quien la propuso
const getMovie = async (req, res, next) => {
  try {
    const movie = await Movie.findById(req.params.id);
    const puedeVer =
      movie &&
      (movie.status === 'approved' ||
        (req.user && (req.user.role === 'admin' || req.user.id === movie.createdBy)));

    if (!puedeVer) {
      return next(new AppError('Pelicula o serie no encontrada', 404));
    }
    return res.status(200).json({ status: 'success', data: movie });
  } catch (error) {
    return next(error);
  }
};

// PUT /api/v1/movies/:id -> solo admin. Acepta los campos que quieras cambiar
// (incluido status para aprobar o rechazar).
const updateMovie = async (req, res, next) => {
  try {
    if (!(await Movie.findById(req.params.id))) {
      return next(new AppError('Pelicula o serie no encontrada', 404));
    }
    if (req.body.categoryId !== undefined) {
      await validarCategoria(req.body.categoryId);
    }
    const movie = await Movie.update(req.params.id, req.body);
    return res.status(200).json({ status: 'success', data: movie });
  } catch (error) {
    return manejarErrorDeBd(error, next);
  }
};

// DELETE /api/v1/movies/:id -> solo admin
const deleteMovie = async (req, res, next) => {
  try {
    if (!(await Movie.remove(req.params.id))) {
      return next(new AppError('Pelicula o serie no encontrada', 404));
    }
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

module.exports = { createMovie, getMovies, getMovie, updateMovie, deleteMovie };
