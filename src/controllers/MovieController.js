const Controller = require('./Controller');
const { movieService, buscarPeliculas } = require('../services/MovieService');
const { CrearPeliculaDTO, ActualizarPeliculaDTO, CambiarEstadoDTO } = require('../dtos/movie.dto');

class MovieController extends Controller {
  #servicio;

  constructor(servicio = movieService) {
    super();
    this.#servicio = servicio;
  }

  // POST /api/v1/movies -> usuario: queda pending; admin: queda approved
  async crear(req, res) {
    const movie = await this.#servicio.crear({ ...new CrearPeliculaDTO(req.body) }, req.user);
    res.status(201).json({ status: 'success', data: movie });
  }

  // GET /api/v1/movies -> publico ve solo approved; admin puede filtrar por ?status=; ?q= busca por titulo
  async listar(req, res) {
    const resultado = await this.#servicio.listar(req.query, req.user);
    res.status(200).json({
      status: 'success',
      data: resultado.movies,
      pagination: Controller.paginacion(resultado),
    });
  }

  // GET /api/v1/movies/:id -> si no esta approved solo la ven el admin y quien la propuso
  async obtener(req, res) {
    const { movie, reviews, inWatchlist } = await this.#servicio.obtener(req.params.id, req.user);
    res.status(200).json({ status: 'success', data: { ...movie.toJSON(), inWatchlist, reviews } });
  }

  // GET /api/v1/movies/ranking -> publico: las aprobadas con mejor ranking
  async ranking(req, res) {
    const { movies, total } = await this.#servicio.ranking(req.query);
    res.status(200).json({ status: 'success', data: movies, total });
  }

  // GET /api/v1/movies/pending -> solo admin: propuestas por revisar (las mas viejas primero)
  async pendientes(req, res) {
    const resultado = await this.#servicio.pendientes(req.query);
    res.status(200).json({
      status: 'success',
      data: resultado.movies,
      pagination: Controller.paginacion(resultado),
    });
  }

  // EXAMEN - GET /api/v1/movies/search -> publico: filtra por categoria, rango de calificacion y año
  // Ej: /api/v1/movies/search?categoria=accion&minRating=3&maxRating=5&anioDesde=2016
  async buscar(req, res) {
    const resultados = await buscarPeliculas(req.query);
    res.status(200).json({ status: 'success', total: resultados.length, data: resultados });
  }

  // PATCH /api/v1/movies/:id/status -> solo admin: aprueba o rechaza
  async cambiarEstado(req, res) {
    const movie = await this.#servicio.cambiarEstado(req.params.id, new CambiarEstadoDTO(req.body));
    res.status(200).json({ status: 'success', data: movie });
  }

  // PUT /api/v1/movies/:id -> solo admin. Acepta los campos que se quieran cambiar
  async actualizar(req, res) {
    const movie = await this.#servicio.actualizar(req.params.id, { ...new ActualizarPeliculaDTO(req.body) });
    res.status(200).json({ status: 'success', data: movie });
  }

  // DELETE /api/v1/movies/:id -> solo admin
  async eliminar(req, res) {
    await this.#servicio.eliminar(req.params.id);
    res.status(204).send();
  }
}

module.exports = { MovieController, movieController: new MovieController() };