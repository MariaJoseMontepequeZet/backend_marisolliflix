const RepositoryConId = require('./RepositoryConId');
const Actividad = require('../models/entities/Actividad');

const ORDEN = { asc: 'ASC', desc: 'DESC' };

class HistorialRepository extends RepositoryConId {
  constructor() {
    super('historial');
  }

  hidratar(fila) {
    return Actividad.fromRow(fila);
  }

  async registrar(conexion, { userId, action, reviewId, movieId, details }) {
    const [result] = await this.ejecutor(conexion).query(
      'INSERT INTO historial (user_id, action, review_id, movie_id, details) VALUES (?, ?, ?, ?, ?)',
      [userId, action, reviewId, movieId, JSON.stringify(details)]
    );
    return result.insertId;
  }

  #filtros(userId, { action, from, to }) {
    const condiciones = ['user_id = ?'];
    const valores = [userId];
    if (action) {
      condiciones.push('action = ?');
      valores.push(action);
    }
    if (from) {
      condiciones.push('created_at >= ?');
      valores.push(`${from} 00:00:00`);
    }
    if (to) {
      condiciones.push('created_at < DATE_ADD(?, INTERVAL 1 DAY)');
      valores.push(to);
    }
    return { where: `WHERE ${condiciones.join(' AND ')}`, valores };
  }

  async findByUser(userId, filtros, { limit, offset, order = 'desc' }) {
    const { where, valores } = this.#filtros(userId, filtros);
    const direccion = ORDEN[order] || 'DESC';
    const [[{ total }]] = await this.ejecutor().query(`SELECT COUNT(*) AS total FROM historial ${where}`, valores);
    const [filas] = await this.ejecutor().query(
      `SELECT * FROM historial ${where} ORDER BY created_at ${direccion}, id ${direccion} LIMIT ? OFFSET ?`,
      [...valores, limit, offset]
    );
    return { total: Number(total), actividades: filas.map((fila) => this.hidratar(fila)) };
  }

  async totalesPorAccion(userId, filtros) {
    const { where, valores } = this.#filtros(userId, { ...filtros, action: undefined });
    const [filas] = await this.ejecutor().query(
      `SELECT action, COUNT(*) AS total FROM historial ${where} GROUP BY action`,
      valores
    );
    return filas.reduce((totales, fila) => ({ ...totales, [fila.action]: Number(fila.total) }), {});
  }
}

module.exports = { HistorialRepository, historialRepository: new HistorialRepository() };
