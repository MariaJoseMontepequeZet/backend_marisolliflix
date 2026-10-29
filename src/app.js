const express = require('express');
const cors = require('cors');
const passport = require('passport');
const configurePassport = require('./config/passport');
const corsOptions = require('./config/cors');
const env = require('./config/env');
const routes = require('./routes');
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

app.use(API_PREFIX, routes);

// Siempre al final: primero el 404 y luego el manejador de errores
app.use(notFound);
app.use(errorHandler);

module.exports = app;
