const Controller = require('./Controller');
const { getPool } = require('../config/db');
const { API_VERSION } = require('../utils/version');

class HealthController extends Controller {
  // GET /api/v1/health -> revisa que el API y la base de datos respondan
  async estado(req, res) {
    let database = 'ok';
    try {
      await getPool().query('SELECT 1');
    } catch (error) {
      database = 'error';
    }

    const funciona = database === 'ok';
    res.status(funciona ? 200 : 503).json({
      status: funciona ? 'ok' : 'error',
      version: API_VERSION,
      database,
      timestamp: new Date().toISOString(),
    });
  }
}

module.exports = { HealthController, healthController: new HealthController() };
