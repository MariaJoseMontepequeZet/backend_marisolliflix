const Controller = require('./Controller');
const { watchlistService } = require('../services/WatchlistService');

class WatchlistController extends Controller {
  #servicio;

  constructor(servicio = watchlistService) {
    super();
    this.#servicio = servicio;
  }

  // GET /api/v1/watchlist -> peliculas guardadas por el usuario (paginado)
  async listar(req, res) {
    const { movies, total, page, limit } = await this.#servicio.listar(req.user, req.query);
    res.status(200).json({
      status: 'success',
      data: movies,
      pagination: Controller.paginacion({ page, limit, total }),
    });
  }

  // POST /api/v1/watchlist/:movieId -> 201 si se agrego, 200 si ya estaba
  async agregar(req, res) {
    const { movieId, agregada } = await this.#servicio.agregar(req.params.movieId, req.user);
    res.status(agregada ? 201 : 200).json({
      status: 'success',
      message: agregada ? 'Agregada a tu lista' : 'Ya estaba en tu lista',
      data: { movieId, inWatchlist: true },
    });
  }

  // DELETE /api/v1/watchlist/:movieId
  async quitar(req, res) {
    await this.#servicio.quitar(req.params.movieId, req.user);
    res.status(204).send();
  }
}

module.exports = { WatchlistController, watchlistController: new WatchlistController() };
