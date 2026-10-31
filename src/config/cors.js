const env = require('./env');
const AppError = require('../utils/AppError');

const corsOptions = {
  origin(origin, callback) {
    if (!origin || origin === env.FRONT_URL) {
      return callback(null, true);
    }
    return callback(new AppError(`Origen ${origin} no permitido por CORS`, 403));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

module.exports = corsOptions;
