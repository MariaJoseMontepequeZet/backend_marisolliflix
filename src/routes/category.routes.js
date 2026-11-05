const { Router } = require('express');
const { categoryController } = require('../controllers/CategoryController');
const { authenticate, authorize } = require('../middlewares/auth');
const {
  categoryIdValidation, createCategoryValidation, updateCategoryValidation,
} = require('../middlewares/categoryValidation');

const router = Router();

// Lectura publica
router.get('/', categoryController.listar);
router.get('/:id', categoryIdValidation, categoryController.obtener);

// Solo admin
router.post('/', authenticate, authorize('admin'), createCategoryValidation, categoryController.crear);
router.put('/:id', authenticate, authorize('admin'), updateCategoryValidation, categoryController.actualizar);
router.delete('/:id', authenticate, authorize('admin'), categoryIdValidation, categoryController.eliminar);

module.exports = router;
