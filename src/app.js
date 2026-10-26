const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const routes = require('./routes');
const { API_PREFIX } = require('./utils/version');

const app = express();

app.use(cors({ origin: env.FRONT_URL }));
app.use(express.json());

app.use(API_PREFIX, routes);

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({ message: `Ruta ${req.method} ${req.originalUrl} no encontrada` });
});

module.exports = app;
