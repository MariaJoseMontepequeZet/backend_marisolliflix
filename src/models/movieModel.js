const { getPool } = require('../config/db');

// Campo de la API -> columna de la tabla (solo estos se pueden escribir)
const COLUMNAS = {
  title: 'title',
  description: 'description',
  categoryId: 'category_id',
  year: 'year',
  imageUrl: 'image_url',
  trailerUrl: 'trailer_url',
  streaming: 'streaming',
  imdbRating: 'imdb_rating',
  type: 'type',
  status: 'status',
};

// Las estadisticas no se guardan en movies: salen de la vista movie_stats
const SELECT_CON_STATS = `SELECT m.*, s.review_count, s.avg_rating, s.likes, s.dislikes, s.ranking_score
  FROM movies m JOIN movie_stats s ON s.movie_id = m.id`;

// Al ordenar por titulo se ignoran los signos de apertura del espanol (¡Huye! va con la H)
const TITULO_ORDEN = "TRIM(LEADING '¿' FROM TRIM(LEADING '¡' FROM m.title))";

// Ordenes permitidos para el listado (lista blanca: nunca se interpola el valor del cliente)
const ORDENES = {
  recientes: 'm.created_at DESC, m.id DESC',
  // Con el mismo puntaje gana la de mas reseñas, luego mejor promedio, mas likes, mejor nota
  // de IMDb y por ultimo el titulo
  ranking: `s.ranking_score DESC, s.review_count DESC, s.avg_rating DESC, s.likes DESC, m.imdb_rating DESC, ${TITULO_ORDEN} ASC, m.id ASC`,
  // popularidad = reseñas + likes totales
  popularidad: '(s.review_count + s.likes) DESC, s.ranking_score DESC, m.id DESC',
  titulo: `${TITULO_ORDEN} ASC, m.id ASC`,
  // Calificacion de IMDb (las que no tienen van al final)
  internet: `m.imdb_rating IS NULL, m.imdb_rating DESC, ${TITULO_ORDEN} ASC, m.id ASC`,
  anio: 'm.year DESC, m.id DESC',
};

// mysql2 ya entrega las columnas JSON como objeto; por si llega como texto se parsea
function leerStreaming(valor) {
  if (!valor) return [];
  if (typeof valor !== 'string') return valor;
  try {
    return JSON.parse(valor);
  } catch {
    return [];
  }
}

// Convierte una fila de MySQL al formato de la API
function toMovie(fila) {
  return {
    id: fila.id,
    title: fila.title,
    description: fila.description,
    categoryId: fila.category_id,
    year: fila.year,
    imageUrl: fila.image_url,
    trailerUrl: fila.trailer_url ?? null,
    streaming: leerStreaming(fila.streaming),
    imdbRating: fila.imdb_rating == null ? null : Number(fila.imdb_rating),
    type: fila.type,
    status: fila.status,
    stats: {
      reviewCount: Number(fila.review_count),
      avgRating: Number(fila.avg_rating),
      likes: Number(fila.likes),
      dislikes: Number(fila.dislikes),
      rankingScore: Number(fila.ranking_score),
    },
    createdBy: fila.created_by,
    createdAt: fila.created_at,
    updatedAt: fila.updated_at,
  };
}

// La lista de plataformas se guarda como JSON (vacia o ausente = NULL)
const aJson = (lista) => (Array.isArray(lista) && lista.length ? JSON.stringify(lista) : null);

async function create(datos, createdBy) {
  const {
    title, description, categoryId, year, imageUrl = null, trailerUrl = null, streaming = null, imdbRating = null,
    type, status,
  } = datos;
  const [result] = await getPool().query(
    `INSERT INTO movies (title, description, category_id, year, image_url, trailer_url, streaming, imdb_rating, type, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, description, categoryId, year, imageUrl, trailerUrl, aJson(streaming), imdbRating, type, status, createdBy]
  );
  return findById(result.insertId);
}

async function findById(id) {
  const [filas] = await getPool().query(`${SELECT_CON_STATS} WHERE m.id = ?`, [id]);
  return filas.length ? toMovie(filas[0]) : null;
}

// En LIKE, % y _ son comodines: se escapan para buscar el texto tal cual lo escribio el usuario
const escaparLike = (texto) => texto.replace(/[\\%_]/g, (c) => `\\${c}`);

// filtros: { status, categoryId, type, q }, paginacion: { limit, offset }
async function findAll(filtros, { limit, offset, oldestFirst = false, sort = 'recientes' }) {
  const condiciones = [];
  const valores = [];
  if (filtros.status) {
    condiciones.push('m.status = ?');
    valores.push(filtros.status);
  }
  if (filtros.categoryId) {
    condiciones.push('m.category_id = ?');
    valores.push(filtros.categoryId);
  }
  if (filtros.type) {
    condiciones.push('m.type = ?');
    valores.push(filtros.type);
  }
  // Busqueda por titulo (tambien el original, por ejemplo "The Bourne Identity")
  if (filtros.q) {
    const patron = `%${escaparLike(filtros.q)}%`;
    condiciones.push('(m.title LIKE ? OR m.original_title LIKE ?)');
    valores.push(patron, patron);
  }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const [[{ total }]] = await getPool().query(`SELECT COUNT(*) AS total FROM movies m ${where}`, valores);
  const orden = oldestFirst ? 'm.created_at ASC, m.id ASC' : ORDENES[sort];
  const [filas] = await getPool().query(
    `${SELECT_CON_STATS} ${where} ORDER BY ${orden} LIMIT ? OFFSET ?`,
    [...valores, limit, offset]
  );
  return { total, movies: filas.map(toMovie) };
}

// Actualiza solo los campos que vienen en `cambios`
async function update(id, cambios) {
  const campos = Object.keys(cambios).filter((campo) => COLUMNAS[campo]);
  if (campos.length) {
    const asignaciones = campos.map((campo) => `${COLUMNAS[campo]} = ?`).join(', ');
    const valores = campos.map((campo) => (campo === 'streaming' ? aJson(cambios[campo]) : cambios[campo]));
    await getPool().query(`UPDATE movies SET ${asignaciones} WHERE id = ?`, [...valores, id]);
  }
  return findById(id);
}

async function remove(id) {
  const [result] = await getPool().query('DELETE FROM movies WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

async function categoryExists(id) {
  const [filas] = await getPool().query('SELECT id FROM categories WHERE id = ?', [id]);
  return filas.length > 0;
}

module.exports = {
  ORDENES, SELECT_CON_STATS, toMovie, create, findById, findAll, update, remove, categoryExists,
};
