const { Router } = require('express');
const { historialController } = require('../controllers/HistorialController');
const { authenticate } = require('../middlewares/auth');
const { listHistorialValidation } = require('../middlewares/historialValidation');

const router = Router();

router.get('/', authenticate, listHistorialValidation, historialController.listar);

module.exports = router;
