const { Router } = require('express');
const { getPool } = require('../config/db');
const { API_VERSION } = require('../utils/version');

const router = Router();

// GET /api/v1/health -> revisa que el API y la base de datos respondan
router.get('/', async (req, res) => {
  let database = 'ok';
  try {
    await getPool().query('SELECT 1');
  } catch (error) {
    database = 'error';
  }

  const status = database === 'ok' ? 200 : 503;
  res.status(status).json({
    status: database === 'ok' ? 'ok' : 'error',
    version: API_VERSION,
    database,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
