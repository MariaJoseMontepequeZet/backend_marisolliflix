const Category = require('../models/categoryModel');
const { CategoriaDTO } = require('../dtos/category.dto');
const AppError = require('../utils/AppError');

// El indice unico de name es la garantia final contra duplicados simultaneos
function manejarErrorDeBd(error, next) {
  if (error.code === 'ER_DUP_ENTRY') {
    return next(new AppError('Ya existe una categoria con ese nombre', 409));
  }
  return next(error);
}

// GET /api/v1/categories -> publico
const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.findAll();
    return res.status(200).json({ status: 'success', data: categories });
  } catch (error) {
    return next(error);
  }
};

// GET /api/v1/categories/:id -> publico
const getCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return next(new AppError('Categoria no encontrada', 404));
    }
    return res.status(200).json({ status: 'success', data: category });
  } catch (error) {
    return next(error);
  }
};

// POST /api/v1/categories -> solo admin
const createCategory = async (req, res, next) => {
  try {
    const category = await Category.create(new CategoriaDTO(req.body).name);
    return res.status(201).json({ status: 'success', data: category });
  } catch (error) {
    return manejarErrorDeBd(error, next);
  }
};

// PUT /api/v1/categories/:id -> solo admin
const updateCategory = async (req, res, next) => {
  try {
    if (!(await Category.findById(req.params.id))) {
      return next(new AppError('Categoria no encontrada', 404));
    }
    const category = await Category.update(req.params.id, new CategoriaDTO(req.body).name);
    return res.status(200).json({ status: 'success', data: category });
  } catch (error) {
    return manejarErrorDeBd(error, next);
  }
};

// DELETE /api/v1/categories/:id -> solo admin. No se borra si tiene peliculas.
const deleteCategory = async (req, res, next) => {
  const mensajeEnUso = 'No se puede eliminar una categoria que tiene peliculas asociadas';
  try {
    if (!(await Category.findById(req.params.id))) {
      return next(new AppError('Categoria no encontrada', 404));
    }
    if ((await Category.countMovies(req.params.id)) > 0) {
      return next(new AppError(mensajeEnUso, 409));
    }
    await Category.remove(req.params.id);
    return res.status(204).send();
  } catch (error) {
    // Una pelicula pudo asociarse justo despues del conteo: la llave foranea lo frena
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return next(new AppError(mensajeEnUso, 409));
    }
    return next(error);
  }
};

module.exports = { getCategories, getCategory, createCategory, updateCategory, deleteCategory };
