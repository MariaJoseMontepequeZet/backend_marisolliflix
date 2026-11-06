const { query } = require('express-validator');
const validate = require('./validate');
const { ACCIONES } = require('../models/entities/Actividad');

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

const fechaValida = (valor) => FECHA.test(valor) && !Number.isNaN(Date.parse(`${valor}T00:00:00Z`))
  && new Date(`${valor}T00:00:00Z`).toISOString().startsWith(valor);

const listHistorialValidation = [
  query('action').optional().isIn(ACCIONES)
    .withMessage(`action debe ser uno de: ${ACCIONES.join(', ')}`),
  query('from').optional().custom(fechaValida)
    .withMessage('from debe ser una fecha válida con formato AAAA-MM-DD'),
  query('to').optional().custom(fechaValida)
    .withMessage('to debe ser una fecha válida con formato AAAA-MM-DD')
    .bail()
    .custom((valor, { req }) => !req.query.from || !fechaValida(req.query.from) || req.query.from <= valor)
    .withMessage('to no puede ser anterior a from'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('order debe ser asc o desc'),
  query('page').optional().isInt({ min: 1 }).withMessage('page debe ser un entero positivo').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit debe estar entre 1 y 100').toInt(),
  validate,
];

module.exports = { listHistorialValidation };
