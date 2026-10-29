const { getPool } = require('../config/db');

// Campo de la API -> columna de la tabla (solo estos se pueden escribir)
const COLUMNAS = {
  title: 'title',
  description: 'description',
  categoryId: 'category_id',
  year: 'year',
  imageUrl: 'image_url',
  type: 'type',
  status: 'status',
};

// Las estadisticas no se guardan en movies: salen de la vista movie_stats
const SELECT_CON_STATS = `SELECT m.*, s.review_count, s.avg_rating, s.likes, s.dislikes, s.ranking_score
  FROM movies m JOIN movie_stats s ON s.movie_id = m.id`;

// Ordenes permitidos para el listado (lista blanca: nunca se interpola el valor del cliente)
const ORDENES = {
  recientes: 'm.created_at DESC, m.id DESC',
  ranking: 's.ranking_score DESC, s.review_count DESC, m.id DESC',
  popularidad: 's.review_count DESC, s.ranking_score DESC, m.id DESC',
  titulo: 'm.title ASC, m.id ASC',
  anio: 'm.year DESC, m.id DESC',
};

// Convierte una fila de MySQL al formato de la API
function toMovie(fila) {
  return {
    id: fila.id,
    title: fila.title,
    description: fila.description,
    categoryId: fila.category_id,
    year: fila.year,
    imageUrl: fila.image_url,
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

async function create(datos, createdBy) {
  const { title, description, categoryId, year, imageUrl = null, type, status } = datos;
  const [result] = await getPool().query(
    `INSERT INTO movies (title, description, category_id, year, image_url, type, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, description, categoryId, year, imageUrl, type, status, createdBy]
  );
  return findById(result.insertId);
}

async function findById(id) {
  const [filas] = await getPool().query(`${SELECT_CON_STATS} WHERE m.id = ?`, [id]);
  return filas.length ? toMovie(filas[0]) : null;
}

// filtros: { status, categoryId, type }, paginacion: { limit, offset }
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
    const valores = campos.map((campo) => cambios[campo]);
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

module.exports = { ORDENES, create, findById, findAll, update, remove, categoryExists };
