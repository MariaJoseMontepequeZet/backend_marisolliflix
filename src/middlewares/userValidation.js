const { body, param, query } = require('express-validator');
const validate = require('./validate');

const ROLES = ['user', 'admin'];
const CAMPOS_EDITABLES = ['username', 'email', 'password', 'role'];

const idParam = param('id').isInt({ min: 1 }).withMessage('El id debe ser un entero positivo').toInt();

// Reglas de cada campo; en la edicion son opcionales pero, si vienen, deben ser validas
function reglasCampos(opcional) {
  const campo = (nombre) => {
    const regla = body(nombre);
    return opcional ? regla.optional() : regla;
  };

  return [
    campo('username').isString().withMessage('El username debe ser texto').bail()
      .trim().notEmpty().withMessage('El username es requerido')
      .isLength({ max: 50 }).withMessage('El username no puede pasar de 50 caracteres'),
    campo('email').isEmail().withMessage('Debe ser un email válido')
      .isLength({ max: 255 }).withMessage('El email no puede pasar de 255 caracteres')
      .normalizeEmail(),
    // bcrypt solo usa los primeros 72 bytes
    campo('password').isString().withMessage('La contraseña debe ser texto').bail()
      .isLength({ min: 8, max: 72 }).withMessage('La contraseña debe tener entre 8 y 72 caracteres'),
    // El rol siempre es opcional: si no viene al crear, queda "user"
    body('role').optional().isIn(ROLES).withMessage('El rol debe ser "user" o "admin"'),
  ];
}

const listUsersValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('page debe ser un entero positivo').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit debe estar entre 1 y 100').toInt(),
  query('q').optional().isString().trim().isLength({ max: 100 }).withMessage('q no puede pasar de 100 caracteres'),
  query('role').optional().isIn(ROLES).withMessage('role debe ser "user" o "admin"'),
  validate,
];

const userIdValidation = [idParam, validate];
const createUserValidation = [...reglasCampos(false), validate];

// Al editar hay que mandar al menos un campo
const updateUserValidation = [
  idParam,
  ...reglasCampos(true),
  body().custom((cuerpo) => {
    if (!cuerpo || !CAMPOS_EDITABLES.some((c) => cuerpo[c] !== undefined)) {
      throw new Error(`Envía al menos uno de estos campos: ${CAMPOS_EDITABLES.join(', ')}`);
    }
    return true;
  }),
  validate,
];

module.exports = { listUsersValidation, userIdValidation, createUserValidation, updateUserValidation };
