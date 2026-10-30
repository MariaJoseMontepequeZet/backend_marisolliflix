const { categoryService } = require('../services/CategoryService');
const { CategoriaDTO } = require('../dtos/category.dto');

// GET /api/v1/categories -> publico
const getCategories = async (req, res, next) => {
  try {
    return res.status(200).json({ status: 'success', data: await categoryService.listar() });
  } catch (error) {
    return next(error);
  }
};

// GET /api/v1/categories/:id -> publico
const getCategory = async (req, res, next) => {
  try {
    return res.status(200).json({ status: 'success', data: await categoryService.obtener(req.params.id) });
  } catch (error) {
    return next(error);
  }
};

// POST /api/v1/categories -> solo admin
const createCategory = async (req, res, next) => {
  try {
    const category = await categoryService.crear(new CategoriaDTO(req.body));
    return res.status(201).json({ status: 'success', data: category });
  } catch (error) {
    return next(error);
  }
};

// PUT /api/v1/categories/:id -> solo admin
const updateCategory = async (req, res, next) => {
  try {
    const category = await categoryService.actualizar(req.params.id, new CategoriaDTO(req.body));
    return res.status(200).json({ status: 'success', data: category });
  } catch (error) {
    return next(error);
  }
};

// DELETE /api/v1/categories/:id -> solo admin. No se borra si tiene peliculas.
const deleteCategory = async (req, res, next) => {
  try {
    await categoryService.eliminar(req.params.id);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

module.exports = { getCategories, getCategory, createCategory, updateCategory, deleteCategory };
