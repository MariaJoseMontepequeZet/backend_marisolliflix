const { API_VERSION, API_PREFIX } = require('../utils/version');

// Especificacion OpenAPI 3 del API, escrita a mano y servida con swagger-ui-express
// en /api/v1/docs (la especificacion en JSON esta en /api/v1/docs.json).

const ref = (nombre) => ({ $ref: `#/components/schemas/${nombre}` });
const contenido = (esquema, ejemplo) => ({
  'application/json': { schema: esquema, ...(ejemplo !== undefined && { example: ejemplo }) },
});
const respuesta = (descripcion, esquema, ejemplo) => ({
  description: descripcion,
  ...(esquema && { content: contenido(esquema, ejemplo) }),
});
const error = (descripcion, ejemplo) => respuesta(descripcion, ref('Error'), ejemplo);

const e401 = error('Token inválido o ausente', { status: 'error', message: 'Token invalido o ausente' });
const e403 = error('No tienes permisos', { status: 'error', message: 'No tienes permisos para esta accion' });
const e404 = (que) => error(`${que} no encontrada`, { status: 'error', message: `${que} no encontrada` });
const e422 = error('Datos inválidos', {
  status: 'error',
  message: 'Datos inválidos',
  errors: [{ field: 'campo', message: 'Descripción del problema' }],
});
const e429 = error('Demasiadas peticiones', { status: 'error', message: 'Demasiadas peticiones, intenta de nuevo en unos minutos' });

const seguridad = [{ bearerAuth: [] }];
const idPath = (descripcion) => ({
  name: 'id', in: 'path', required: true, description: descripcion, schema: { type: 'integer', minimum: 1 },
});
const queryPagina = [
  { name: 'page', in: 'query', description: 'Página (por defecto 1)', schema: { type: 'integer', minimum: 1, default: 1 } },
  { name: 'limit', in: 'query', description: 'Resultados por página (1 a 100, por defecto 10)', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } },
];
const cuerpo = (esquema, ejemplo) => ({ required: true, content: contenido(esquema, ejemplo) });

const ejemploPelicula = {
  id: 25,
  title: 'Gladiador',
  description: 'Un general romano traicionado busca venganza.',
  categoryId: 3,
  year: 2000,
  imageUrl: null,
  type: 'pelicula',
  status: 'approved',
  stats: { reviewCount: 2, avgRating: 8.5, likes: 3, dislikes: 0, rankingScore: 7.1 },
  createdBy: 1,
  createdAt: '2026-10-29T14:33:32.000Z',
  updatedAt: '2026-10-29T14:33:32.000Z',
};
const ejemploResena = {
  id: 7,
  title: 'Excelente',
  rating: 9,
  comment: 'Me encantó la trama.',
  author: { id: 4, username: 'ana' },
  likes: 2,
  dislikes: 0,
  myVote: 0,
  createdAt: '2026-10-29T15:00:00.000Z',
  updatedAt: '2026-10-29T15:00:00.000Z',
};
const ejemploStats = { reviewCount: 2, avgRating: '8.50', rankingScore: 7.1 };

const orden = {
  name: 'sort',
  in: 'query',
  description: 'Orden del listado: `recientes` (por defecto), `ranking`, `popularidad`, `titulo` o `anio`. También se aceptan los alias `popularity` y `year`.',
  schema: { type: 'string', enum: ['recientes', 'ranking', 'popularidad', 'titulo', 'anio', 'popularity', 'year'] },
};

// Campos de una película (al crearla son obligatorios; al editarla, opcionales)
const propiedadesPelicula = {
  title: { type: 'string', maxLength: 255, description: 'Único, sin distinguir mayúsculas' },
  description: { type: 'string', maxLength: 5000 },
  categoryId: { type: 'integer', minimum: 1 },
  year: { type: 'integer', minimum: 1888, description: 'Entre 1888 y el año actual + 5' },
  type: { type: 'string', enum: ['pelicula', 'serie', 'anime'] },
  imageUrl: { type: 'string', nullable: true, maxLength: 500, description: 'URL completa (http/https) o ruta del sitio, por ejemplo /assets/img/portadas/gladiador-2000.jpg', example: '/assets/img/portadas/gladiador-2000.jpg' },
};

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'MarisolliFlix API',
    version: API_VERSION,
    description:
      'API REST para registrar, calificar y rankear películas, animes y series.\n\n' +
      '**Autenticación:** inicia sesión en `POST /auth/login`, copia el `token` y pulsa **Authorize** ' +
      '(se envía como `Authorization: Bearer <token>`).\n\n' +
      '**Límite de peticiones:** 100 cada 3 minutos por IP (después responde 429 con el tiempo de espera en `Retry-After`).\n\n' +
      '**Formato de errores:** todos los errores responden `{ "status": "error", "message": "...", "errors": [...] }`; ' +
      '`errors` solo aparece en los 422 y lista los campos inválidos.',
  },
  servers: [{ url: API_PREFIX, description: 'Servidor actual' }],
  tags: [
    { name: 'Salud', description: 'Estado del servicio' },
    { name: 'Autenticación', description: 'Registro, inicio de sesión y usuario actual' },
    { name: 'Categorías', description: 'Consulta pública; crear, editar y borrar solo el administrador' },
    { name: 'Películas', description: 'Películas, series y animes. Las propuestas de usuarios quedan pendientes hasta que un administrador las aprueba' },
    { name: 'Reseñas', description: 'Reseñas con calificación de 1 a 10 y reacciones (like/dislike)' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'error' },
          message: { type: 'string' },
          errors: {
            type: 'array',
            items: { type: 'object', properties: { field: { type: 'string' }, message: { type: 'string' } } },
          },
        },
      },
      Usuario: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 4 },
          username: { type: 'string', example: 'ana' },
          email: { type: 'string', format: 'email', example: 'ana@correo.com' },
          role: { type: 'string', enum: ['user', 'admin'] },
        },
      },
      Categoria: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Anime' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Paginacion: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 10 },
          total: { type: 'integer', example: 400 },
          pages: { type: 'integer', example: 40 },
        },
      },
      Estadisticas: {
        type: 'object',
        description: 'Se calculan a partir de las reseñas y sus votos; no se guardan en la película.',
        properties: {
          reviewCount: { type: 'integer' },
          avgRating: { type: 'number', description: 'Promedio simple de calificaciones (0 si no hay reseñas)' },
          likes: { type: 'integer' },
          dislikes: { type: 'integer' },
          rankingScore: { type: 'number', description: 'Ranking ponderado por calificación, likes/dislikes y fecha de la reseña (0 sin reseñas)' },
        },
      },
      Pelicula: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          title: { type: 'string', maxLength: 255 },
          description: { type: 'string', maxLength: 5000 },
          categoryId: { type: 'integer' },
          year: { type: 'integer', example: 2000 },
          imageUrl: { type: 'string', nullable: true, description: 'URL completa o ruta del sitio (/assets/img/portadas/...)' },
          type: { type: 'string', enum: ['pelicula', 'serie', 'anime'] },
          status: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
          stats: ref('Estadisticas'),
          createdBy: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      PeliculaNueva: {
        type: 'object',
        required: ['title', 'description', 'categoryId', 'year', 'type'],
        properties: propiedadesPelicula,
      },
      Resena: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          title: { type: 'string', maxLength: 255 },
          rating: { type: 'integer', minimum: 1, maximum: 10 },
          comment: { type: 'string', maxLength: 1000 },
          author: { type: 'object', properties: { id: { type: 'integer' }, username: { type: 'string' } } },
          likes: { type: 'integer' },
          dislikes: { type: 'integer' },
          myVote: { type: 'integer', enum: [-1, 0, 1], description: 'Voto del usuario autenticado: 1 like, -1 dislike, 0 sin voto' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ResenaNueva: {
        type: 'object',
        required: ['title', 'rating', 'comment'],
        properties: {
          title: { type: 'string', maxLength: 255 },
          rating: { type: 'integer', minimum: 1, maximum: 10 },
          comment: { type: 'string', maxLength: 1000 },
        },
      },
      EstadisticasResena: {
        type: 'object',
        properties: {
          reviewCount: { type: 'integer' },
          avgRating: { type: 'string', example: '8.50' },
          rankingScore: { type: 'number' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Salud'],
        summary: 'Estado del API y de la base de datos',
        responses: {
          200: respuesta('Todo funciona', null, { status: 'ok', version: API_VERSION, database: 'ok', timestamp: '2026-10-29T16:00:00.000Z' }),
          503: respuesta('La base de datos no responde', null, { status: 'error', version: API_VERSION, database: 'error' }),
        },
      },
    },

    '/auth/register': {
      post: {
        tags: ['Autenticación'],
        summary: 'Registrar un usuario (rol user)',
        requestBody: cuerpo(
          {
            type: 'object',
            required: ['username', 'email', 'password'],
            properties: {
              username: { type: 'string', maxLength: 50 },
              email: { type: 'string', format: 'email', maxLength: 255 },
              password: { type: 'string', minLength: 8, maxLength: 72 },
            },
          },
          { username: 'ana', email: 'ana@correo.com', password: '12345678' }
        ),
        responses: {
          201: respuesta('Usuario creado', null, { status: 'success', message: 'Usuario registrado exitosamente', data: { id: 4, username: 'ana', email: 'ana@correo.com', role: 'user' } }),
          409: error('El email o username ya existe', { status: 'error', message: 'El email o username ya se encuentra registrado' }),
          422: e422,
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Autenticación'],
        summary: 'Iniciar sesión',
        description: 'Máximo 5 intentos fallidos cada 15 minutos por IP (después responde 429).',
        requestBody: cuerpo(
          { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } } },
          { email: 'ana@correo.com', password: '12345678' }
        ),
        responses: {
          200: respuesta('Sesión iniciada', null, { status: 'success', token: 'eyJhbGciOi...', user: { id: 4, username: 'ana', email: 'ana@correo.com', role: 'user' } }),
          401: error('Credenciales inválidas', { status: 'error', message: 'Credenciales inválidas' }),
          422: e422,
          429: e429,
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Autenticación'],
        summary: 'Datos del usuario del token',
        security: seguridad,
        responses: {
          200: respuesta('Usuario autenticado', null, { status: 'success', user: { id: 4, username: 'ana', email: 'ana@correo.com', role: 'user', created_at: '2026-10-29T14:00:00.000Z' } }),
          401: e401,
        },
      },
    },

    '/categories': {
      get: {
        tags: ['Categorías'],
        summary: 'Listar las categorías (por nombre)',
        responses: { 200: respuesta('Lista de categorías', null, { status: 'success', data: [{ id: 1, name: 'Anime', createdAt: '2026-10-29T14:33:32.000Z' }] }) },
      },
      post: {
        tags: ['Categorías'],
        summary: 'Crear una categoría (solo administrador)',
        security: seguridad,
        requestBody: cuerpo({ type: 'object', required: ['name'], properties: { name: { type: 'string', maxLength: 100 } } }, { name: 'Terror' }),
        responses: {
          201: respuesta('Categoría creada', null, { status: 'success', data: { id: 9, name: 'Terror' } }),
          401: e401,
          403: e403,
          409: error('Ya existe una categoría con ese nombre', { status: 'error', message: 'Ya existe una categoria con ese nombre' }),
          422: e422,
        },
      },
    },
    '/categories/{id}': {
      parameters: [idPath('Id de la categoría')],
      get: {
        tags: ['Categorías'],
        summary: 'Detalle de una categoría',
        responses: { 200: respuesta('Categoría', null, { status: 'success', data: { id: 1, name: 'Anime' } }), 404: e404('Categoría'), 422: e422 },
      },
      put: {
        tags: ['Categorías'],
        summary: 'Cambiar el nombre de una categoría (solo administrador)',
        security: seguridad,
        requestBody: cuerpo({ type: 'object', required: ['name'], properties: { name: { type: 'string', maxLength: 100 } } }, { name: 'Animación' }),
        responses: { 200: respuesta('Categoría actualizada'), 401: e401, 403: e403, 404: e404('Categoría'), 409: error('Nombre repetido'), 422: e422 },
      },
      delete: {
        tags: ['Categorías'],
        summary: 'Eliminar una categoría (solo administrador)',
        description: 'Responde 409 si todavía tiene películas.',
        security: seguridad,
        responses: { 204: { description: 'Eliminada' }, 401: e401, 403: e403, 404: e404('Categoría'), 409: error('Tiene películas asociadas'), 422: e422 },
      },
    },

    '/movies': {
      get: {
        tags: ['Películas'],
        summary: 'Listar películas aprobadas con filtros, orden y paginación',
        description: 'El público solo ve las aprobadas. Un administrador autenticado puede filtrar por `status`.',
        parameters: [
          { name: 'categoryId', in: 'query', description: 'Filtrar por categoría (alias: `category`)', schema: { type: 'integer', minimum: 1 } },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['pelicula', 'serie', 'anime'] } },
          { name: 'status', in: 'query', description: 'Solo administradores', schema: { type: 'string', enum: ['pending', 'approved', 'rejected'] } },
          orden,
          ...queryPagina,
        ],
        responses: {
          200: respuesta('Películas y paginación', null, { status: 'success', data: [ejemploPelicula], pagination: { page: 1, limit: 10, total: 400, pages: 40 } }),
          422: e422,
        },
      },
      post: {
        tags: ['Películas'],
        summary: 'Proponer una película (usuario) o crearla aprobada (administrador)',
        security: seguridad,
        requestBody: cuerpo(ref('PeliculaNueva'), { title: 'Matrix', description: 'Un hacker descubre la realidad', categoryId: 2, year: 1999, type: 'pelicula' }),
        responses: {
          201: respuesta('Película creada (pending para usuarios, approved para administradores)', null, { status: 'success', data: ejemploPelicula }),
          401: e401,
          409: error('Título repetido', { status: 'error', message: 'Ya existe una pelicula o serie con ese titulo' }),
          422: e422,
        },
      },
    },
    '/movies/ranking': {
      get: {
        tags: ['Películas'],
        summary: 'Ranking de películas aprobadas',
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } },
          { name: 'categoryId', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['pelicula', 'serie', 'anime'] } },
        ],
        responses: { 200: respuesta('Películas ordenadas por ranking', null, { status: 'success', data: [ejemploPelicula], total: 400 }), 422: e422 },
      },
    },
    '/movies/pending': {
      get: {
        tags: ['Películas'],
        summary: 'Propuestas por revisar, las más viejas primero (solo administrador)',
        security: seguridad,
        parameters: queryPagina,
        responses: {
          200: respuesta('Propuestas pendientes', null, { status: 'success', data: [{ ...ejemploPelicula, status: 'pending' }], pagination: { page: 1, limit: 10, total: 1, pages: 1 } }),
          401: e401,
          403: e403,
          422: e422,
        },
      },
    },
    '/movies/{id}': {
      parameters: [idPath('Id de la película')],
      get: {
        tags: ['Películas'],
        summary: 'Detalle de una película con sus reseñas',
        description: 'Si no está aprobada, solo la ven un administrador o quien la propuso (con token); para el resto responde 404.',
        security: [{}, ...seguridad],
        responses: {
          200: respuesta('Película con reseñas', null, { status: 'success', data: { ...ejemploPelicula, reviews: [ejemploResena] } }),
          404: e404('Película o serie'),
          422: e422,
        },
      },
      put: {
        tags: ['Películas'],
        summary: 'Editar una película, o aprobarla/rechazarla con `status` (solo administrador)',
        description: 'Se envían solo los campos que cambian.',
        security: seguridad,
        requestBody: cuerpo(
          {
            type: 'object',
            properties: {
              ...propiedadesPelicula,
              status: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
            },
          },
          { description: 'Nueva descripción', status: 'approved' }
        ),
        responses: { 200: respuesta('Película actualizada', null, { status: 'success', data: ejemploPelicula }), 401: e401, 403: e403, 404: e404('Película o serie'), 409: error('Título repetido'), 422: e422 },
      },
      delete: {
        tags: ['Películas'],
        summary: 'Eliminar una película (solo administrador)',
        security: seguridad,
        responses: { 204: { description: 'Eliminada' }, 401: e401, 403: e403, 404: e404('Película o serie'), 422: e422 },
      },
    },
    '/movies/{id}/status': {
      patch: {
        tags: ['Películas'],
        summary: 'Aprobar o rechazar una propuesta (solo administrador)',
        security: seguridad,
        parameters: [idPath('Id de la película')],
        requestBody: cuerpo({ type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['approved', 'rejected'] } } }, { status: 'approved' }),
        responses: { 200: respuesta('Estado actualizado', null, { status: 'success', data: ejemploPelicula }), 401: e401, 403: e403, 404: e404('Película o serie'), 422: e422 },
      },
    },

    '/movies/{id}/reviews': {
      parameters: [idPath('Id de la película')],
      get: {
        tags: ['Reseñas'],
        summary: 'Reseñas de una película, con autor, likes, dislikes y el voto del usuario',
        description: 'Las reseñas de películas no aprobadas solo las ven un administrador o quien la propuso.',
        security: [{}, ...seguridad],
        responses: { 200: respuesta('Lista de reseñas', null, { status: 'success', results: 1, data: [ejemploResena] }), 404: e404('Película'), 422: e422 },
      },
      post: {
        tags: ['Reseñas'],
        summary: 'Crear una reseña (una por usuario y película, solo en películas aprobadas)',
        description: 'Se ejecuta en una transacción. El ranking de la película se recalcula solo.',
        security: seguridad,
        requestBody: cuerpo(ref('ResenaNueva'), { title: 'Excelente', rating: 9, comment: 'Me encantó la trama.' }),
        responses: {
          201: respuesta('Reseña creada', null, { status: 'success', message: 'Reseña creada exitosamente', data: { reviewId: 7, movieId: 25, title: 'Excelente', rating: 9, comment: 'Me encantó la trama.', ...ejemploStats } }),
          401: e401,
          404: e404('Película'),
          409: error('Ya reseñaste esta película', { status: 'error', message: 'Ya has registrado una reseña para esta película.' }),
          422: e422,
        },
      },
    },
    '/reviews/{id}': {
      parameters: [idPath('Id de la reseña')],
      put: {
        tags: ['Reseñas'],
        summary: 'Editar tu reseña (solo el autor)',
        description: 'Envía al menos uno de `title`, `rating` o `comment`. Los demás se conservan. Responde 403 a cualquier otro usuario, administradores incluidos.',
        security: seguridad,
        requestBody: cuerpo({ type: 'object', properties: { title: { type: 'string', maxLength: 255 }, rating: { type: 'integer', minimum: 1, maximum: 10 }, comment: { type: 'string', maxLength: 1000 } } }, { rating: 7 }),
        responses: {
          200: respuesta('Reseña actualizada', null, { status: 'success', message: 'Reseña actualizada exitosamente', data: { reviewId: 7, movieId: 25, title: 'Excelente', rating: 7, comment: 'Me encantó la trama.', ...ejemploStats } }),
          401: e401,
          403: error('No eres el autor', { status: 'error', message: 'Solo el autor puede editar esta reseña' }),
          404: e404('Reseña'),
          422: e422,
        },
      },
      delete: {
        tags: ['Reseñas'],
        summary: 'Eliminar tu reseña y sus likes/dislikes (solo el autor)',
        security: seguridad,
        responses: {
          200: respuesta('Reseña eliminada', null, { status: 'success', message: 'Reseña eliminada exitosamente', data: { reviewId: 7, movieId: 25, ...ejemploStats } }),
          401: e401,
          403: error('No eres el autor', { status: 'error', message: 'Solo el autor puede eliminar esta reseña' }),
          404: e404('Reseña'),
          422: e422,
        },
      },
    },
    '/reviews/{id}/reaction': {
      parameters: [idPath('Id de la reseña')],
      post: {
        tags: ['Reseñas'],
        summary: 'Dar like o dislike a una reseña de otro usuario',
        description: 'Sin voto previo lo crea; repetir el mismo tipo lo quita (toggle); el otro tipo lo cambia. No se puede votar la propia reseña (403).',
        security: seguridad,
        requestBody: cuerpo({ type: 'object', required: ['type'], properties: { type: { type: 'string', enum: ['like', 'dislike'] } } }, { type: 'like' }),
        responses: {
          200: respuesta('Voto registrado, cambiado o quitado', null, { status: 'success', message: 'Reacción registrada: like', data: { reviewId: 7, movieId: 25, reaction: 'like', likes: 3, dislikes: 0, rankingScore: 7.4 } }),
          401: e401,
          403: error('Es tu propia reseña', { status: 'error', message: 'No puedes dar like ni dislike a tu propia reseña' }),
          404: e404('Reseña'),
          422: e422,
        },
      },
      delete: {
        tags: ['Reseñas'],
        summary: 'Quitar tu like o dislike (no hace nada si no habías votado)',
        security: seguridad,
        responses: {
          200: respuesta('Voto quitado', null, { status: 'success', message: 'Reacción eliminada', data: { reviewId: 7, movieId: 25, reaction: null, likes: 2, dislikes: 0, rankingScore: 7.1 } }),
          401: e401,
          403: error('Es tu propia reseña'),
          404: e404('Reseña'),
          422: e422,
        },
      },
    },
  },
};

module.exports = spec;
