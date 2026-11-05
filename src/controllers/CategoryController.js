const Controller = require('./Controller');
const { categoryService } = require('../services/CategoryService');
const { CategoriaDTO } = require('../dtos/category.dto');

class CategoryController extends Controller {
  #servicio;

  constructor(servicio = categoryService) {
    super();
    this.#servicio = servicio;
  }

  // GET /api/v1/categories -> publico
  async listar(req, res) {
    res.status(200).json({ status: 'success', data: await this.#servicio.listar() });
  }

  // GET /api/v1/categories/:id -> publico
  async obtener(req, res) {
    res.status(200).json({ status: 'success', data: await this.#servicio.obtener(req.params.id) });
  }

  // POST /api/v1/categories -> solo admin
  async crear(req, res) {
    const categoria = await this.#servicio.crear(new CategoriaDTO(req.body));
    res.status(201).json({ status: 'success', data: categoria });
  }

  // PUT /api/v1/categories/:id -> solo admin
  async actualizar(req, res) {
    const categoria = await this.#servicio.actualizar(req.params.id, new CategoriaDTO(req.body));
    res.status(200).json({ status: 'success', data: categoria });
  }

  // DELETE /api/v1/categories/:id -> solo admin. No se borra si tiene peliculas.
  async eliminar(req, res) {
    await this.#servicio.eliminar(req.params.id);
    res.status(204).send();
  }
}

module.exports = { CategoryController, categoryController: new CategoryController() };
