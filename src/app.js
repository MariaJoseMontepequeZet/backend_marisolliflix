const express = require('express');
const cors = require('cors');
const passport = require('passport');
const configurePassport = require('./config/passport');
const corsOptions = require('./config/cors');
const env = require('./config/env');
const swaggerUi = require('swagger-ui-express');
const routes = require('./routes');
const openapi = require('./docs/openapi');
const { API_PREFIX } = require('./utils/version');
const { globalLimiter } = require('./middlewares/rateLimit');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

configurePassport(passport);

app.set('trust proxy', env.TRUST_PROXY);

app.use(cors(corsOptions));
app.use(passport.initialize());
app.use(globalLimiter);
app.use(express.json());

// Documentacion Swagger: interfaz en /api/v1/docs y especificacion en /api/v1/docs.json
app.get(`${API_PREFIX}/docs.json`, (req, res) => res.json(openapi));
app.use(
  `${API_PREFIX}/docs`,
  swaggerUi.serve,
  swaggerUi.setup(openapi, { customSiteTitle: 'MarisolliFlix API', swaggerOptions: { persistAuthorization: true } })
);

app.use(API_PREFIX, routes);

// Siempre al final: primero el 404 y luego el manejador de errores
app.use(notFound);
app.use(errorHandler);

module.exports = app;
