const { query, validationResult } = require('express-validator');

const validarBusqueda = [
    query('categoria').optional().trim().isLength({ min: 1, max: 50 }),
    query('minRating').optional().isFloat({ min: 0, max: 5 }).withMessage('minRating debe estar entre 0 y 5'),
    query('maxRating').optional().isFloat({ min: 0, max: 5 }).withMessage('maxRating debe estar entre 0 y 5'),
    query('anioDesde').optional().isInt({ min: 1888, max: 2100 }).withMessage('anioDesde inválido'),
    query('anioHasta').optional().isInt({ min: 1888, max: 2100 }).withMessage('anioHasta inválido'),
    (req, res, next) => {
        const errores = validationResult(req);
        if (!errores.isEmpty()) return res.status(400).json({ errores: errores.array() });

        const { minRating, maxRating, anioDesde, anioHasta } = req.query;
        if (minRating && maxRating && Number(minRating) > Number(maxRating))
            return res.status(400).json({ mensaje: 'minRating no puede ser mayor que maxRating' });

        if (anioDesde && anioHasta && Number(anioDesde) > Number(anioHasta))
            return res.status(400).json({ mensaje: 'anioDesde no puede ser mayor que anioHasta' });
        next();
    },
];

// Encuentra la petición de la busqueda para validar los datos solicitados

module.exports = validarBusqueda;