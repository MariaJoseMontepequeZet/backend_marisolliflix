const { Router } = require('express');
const {
  getCategories, getCategory, createCategory, updateCategory, deleteCategory,
} = require('../controllers/categoryController');
const { authenticate, authorize } = require('../middlewares/auth');
const {
  categoryIdValidation, createCategoryValidation, updateCategoryValidation,
} = require('../middlewares/categoryValidation');

const router = Router();

// Lectura publica
router.get('/', getCategories);
router.get('/:id', categoryIdValidation, getCategory);

// Solo admin
router.post('/', authenticate, authorize('admin'), createCategoryValidation, createCategory);
router.put('/:id', authenticate, authorize('admin'), updateCategoryValidation, updateCategory);
router.delete('/:id', authenticate, authorize('admin'), categoryIdValidation, deleteCategory);

module.exports = router;
