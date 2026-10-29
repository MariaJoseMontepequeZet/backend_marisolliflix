const { body, param } = require('express-validator');
const validate = require('./validate');

const idParam = param('id').isInt({ min: 1 }).withMessage('El id debe ser un entero positivo').toInt();

const nameRule = body('name')
  .trim()
  .notEmpty().withMessage('El nombre es requerido')
  .isLength({ max: 100 }).withMessage('El nombre no puede pasar de 100 caracteres');

const categoryIdValidation = [idParam, validate];
const createCategoryValidation = [nameRule, validate];
const updateCategoryValidation = [idParam, nameRule, validate];

module.exports = { categoryIdValidation, createCategoryValidation, updateCategoryValidation };
