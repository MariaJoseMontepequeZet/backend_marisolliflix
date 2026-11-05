const { Router } = require('express');
const { healthController } = require('../controllers/HealthController');

const router = Router();

router.get('/', healthController.estado);

module.exports = router;
