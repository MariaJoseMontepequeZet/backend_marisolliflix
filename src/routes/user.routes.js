const { Router } = require('express');
const { userController } = require('../controllers/UserController');
const { authenticate, authorize } = require('../middlewares/auth');
const {
  listUsersValidation, userIdValidation, createUserValidation, updateUserValidation,
} = require('../middlewares/userValidation');

const router = Router();

// Gestion de usuarios: solo administradores
router.use(authenticate, authorize('admin'));

router.get('/', listUsersValidation, userController.listar);
router.get('/:id', userIdValidation, userController.obtener);
router.post('/', createUserValidation, userController.crear);
router.put('/:id', updateUserValidation, userController.actualizar);
router.delete('/:id', userIdValidation, userController.eliminar);

module.exports = router;
