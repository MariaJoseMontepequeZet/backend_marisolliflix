const Watchlist = require('../models/watchlistModel');
const Movie = require('../models/movieModel');
const AppError = require('../utils/AppError');

// GET /api/v1/watchlist -> peliculas guardadas por el usuario (paginado)
const getWatchlist = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 36;
    const { total, movies } = await Watchlist.findByUser(req.user.id, { limit, offset: (page - 1) * limit });
    return res.status(200).json({
      status: 'success',
      data: movies,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return next(error);
  }
};

// POST /api/v1/watchlist/:movieId -> 201 si se agrego, 200 si ya estaba
const addToWatchlist = async (req, res, next) => {
  try {
    const movie = await Movie.findById(req.params.movieId);
    if (!movie || movie.status !== 'approved') {
      return next(new AppError('Pelicula o serie no encontrada', 404));
    }
    const agregada = await Watchlist.add(req.user.id, movie.id);
    return res.status(agregada ? 201 : 200).json({
      status: 'success',
      message: agregada ? 'Agregada a tu lista' : 'Ya estaba en tu lista',
      data: { movieId: movie.id, inWatchlist: true },
    });
  } catch (error) {
    return next(error);
  }
};

// DELETE /api/v1/watchlist/:movieId
const removeFromWatchlist = async (req, res, next) => {
  try {
    if (!(await Watchlist.remove(req.user.id, req.params.movieId))) {
      return next(new AppError('La pelicula no esta en tu lista', 404));
    }
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

module.exports = { getWatchlist, addToWatchlist, removeFromWatchlist };
