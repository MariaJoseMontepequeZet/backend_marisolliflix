const Controller = require('./Controller');
const { historialService } = require('../services/HistorialService');

class HistorialController extends Controller {
  #servicio;

  constructor(servicio = historialService) {
    super();
    this.#servicio = servicio;
  }

  async listar(req, res) {
    const { actividades, total, page, limit, filtros, resumen } = await this.#servicio.listar(req.user, req.query);
    res.status(200).json({
      status: 'success',
      results: actividades.length,
      filters: {
        action: filtros.action ?? null,
        from: filtros.from ?? null,
        to: filtros.to ?? null,
        order: filtros.order,
      },
      summary: resumen,
      data: actividades,
      pagination: Controller.paginacion({ page, limit, total }),
    });
  }
}

module.exports = { HistorialController, historialController: new HistorialController() };
