const RepositoryConId = require('./RepositoryConId');
const Category = require('../models/entities/Category');

class CategoryRepository extends RepositoryConId {
  constructor() {
    super('categories');
  }

  hidratar(fila) {
    return Category.fromRow(fila);
  }

  async findAll() {
    const [filas] = await this.ejecutor().query('SELECT * FROM categories ORDER BY name');
    return filas.map((fila) => this.hidratar(fila));
  }

  async create(name) {
    const [result] = await this.ejecutor().query('INSERT INTO categories (name) VALUES (?)', [name]);
    return this.findById(result.insertId);
  }

  async update(id, name) {
    await this.ejecutor().query('UPDATE categories SET name = ? WHERE id = ?', [name, id]);
    return this.findById(id);
  }

  async countMovies(id) {
    const [[{ total }]] = await this.ejecutor().query(
      'SELECT COUNT(*) AS total FROM movies WHERE category_id = ?',
      [id]
    );
    return total;
  }
}

module.exports = { CategoryRepository, categoryRepository: new CategoryRepository() };
