const env = require('./env');
const AppError = require('../utils/AppError');

// Solo se permite el frontend configurado en FRONT_URL.
// Las peticiones sin origin (Postman, curl, servidor a servidor) si pasan.
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
