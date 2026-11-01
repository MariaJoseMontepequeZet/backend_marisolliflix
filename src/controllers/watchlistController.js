const { watchlistService } = require('../services/WatchlistService');

// GET /api/v1/watchlist -> peliculas guardadas por el usuario (paginado)
const getWatchlist = async (req, res, next) => {
  try {
    const { movies, total, page, limit } = await watchlistService.listar(req.user, req.query);
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
    const { movieId, agregada } = await watchlistService.agregar(req.params.movieId, req.user);
    return res.status(agregada ? 201 : 200).json({
      status: 'success',
      message: agregada ? 'Agregada a tu lista' : 'Ya estaba en tu lista',
      data: { movieId, inWatchlist: true },
    });
  } catch (error) {
    return next(error);
  }
};

// DELETE /api/v1/watchlist/:movieId
const removeFromWatchlist = async (req, res, next) => {
  try {
    await watchlistService.quitar(req.params.movieId, req.user);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

module.exports = { getWatchlist, addToWatchlist, removeFromWatchlist };
