const Repository = require('./Repository');
const Movie = require('../models/entities/Movie');

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
  // Con el mismo puntaje gana la de mas reseñas, luego mejor promedio, mas likes y por ultimo el titulo
  ranking: 's.ranking_score DESC, s.review_count DESC, s.avg_rating DESC, s.likes DESC, m.title ASC, m.id ASC',
  // popularidad = reseñas + likes totales
  popularidad: '(s.review_count + s.likes) DESC, s.ranking_score DESC, m.id DESC',
  titulo: 'm.title ASC, m.id ASC',
  anio: 'm.year DESC, m.id DESC',
};

class MovieRepository extends Repository {
  static ORDENES = ORDENES;

  constructor() {
    super('movies');
  }

  hidratar(fila) {
    return Movie.fromRow(fila);
  }

  async create(datos, createdBy) {
    const { title, description, categoryId, year, imageUrl = null, type, status } = datos;
    const [result] = await this.ejecutor().query(
      `INSERT INTO movies (title, description, category_id, year, image_url, type, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description, categoryId, year, imageUrl, type, status, createdBy]
    );
    return this.findById(result.insertId);
  }

  // Sobrescribe la busqueda heredada: una pelicula siempre viene con sus estadisticas
  async findById(id) {
    const [filas] = await this.ejecutor().query(`${SELECT_CON_STATS} WHERE m.id = ?`, [id]);
    return filas.length ? this.hidratar(filas[0]) : null;
  }

  // filtros: { status, categoryId, type }, paginacion: { limit, offset }
  async findAll(filtros, { limit, offset, oldestFirst = false, sort = 'recientes' }) {
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

    const [[{ total }]] = await this.ejecutor().query(`SELECT COUNT(*) AS total FROM movies m ${where}`, valores);
    const orden = oldestFirst ? 'm.created_at ASC, m.id ASC' : ORDENES[sort];
    const [filas] = await this.ejecutor().query(
      `${SELECT_CON_STATS} ${where} ORDER BY ${orden} LIMIT ? OFFSET ?`,
      [...valores, limit, offset]
    );
    return { total, movies: filas.map((fila) => this.hidratar(fila)) };
  }

  // Actualiza solo los campos que vienen en `cambios`
  async update(id, cambios) {
    const campos = Object.keys(cambios).filter((campo) => COLUMNAS[campo]);
    if (campos.length) {
      const asignaciones = campos.map((campo) => `${COLUMNAS[campo]} = ?`).join(', ');
      const valores = campos.map((campo) => cambios[campo]);
      await this.ejecutor().query(`UPDATE movies SET ${asignaciones} WHERE id = ?`, [...valores, id]);
    }
    return this.findById(id);
  }

  async categoryExists(id) {
    const [filas] = await this.ejecutor().query('SELECT id FROM categories WHERE id = ?', [id]);
    return filas.length > 0;
  }

  // Lee id y estado de la pelicula bloqueando su fila (usar dentro de una transaccion)
  async estadoParaActualizar(conexion, id) {
    const [filas] = await conexion.query('SELECT id, status FROM movies WHERE id = ? FOR UPDATE', [id]);
    return filas[0] || null;
  }
}

module.exports = { MovieRepository, movieRepository: new MovieRepository() };
