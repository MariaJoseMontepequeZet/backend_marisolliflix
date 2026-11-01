const { test } = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');
const Repository = require('../src/repositories/Repository');
const { MovieRepository } = require('../src/repositories/MovieRepository');
const { CategoryRepository } = require('../src/repositories/CategoryRepository');
const { AuthService } = require('../src/services/AuthService');
const { MovieService } = require('../src/services/MovieService');
const AppError = require('../src/utils/AppError');
const User = require('../src/models/entities/User');

test('Repository es abstracta: no se puede crear y sus hijas deben implementar hidratar', () => {
  assert.throws(() => new Repository('movies'), /abstracta/);

  class SinHidratar extends Repository {
    constructor() {
      super('cosas');
    }
  }
  assert.throws(() => new SinHidratar().hidratar({}), /SinHidratar debe implementar hidratar/);
});

test('los repositorios concretos heredan de Repository y cada uno sabe su tabla', () => {
  assert.ok(new MovieRepository() instanceof Repository);
  assert.ok(new CategoryRepository() instanceof Repository);
  assert.strictEqual(new MovieRepository().tabla, 'movies');
  assert.strictEqual(new CategoryRepository().tabla, 'categories');
  assert.ok(Object.keys(MovieRepository.ORDENES).includes('ranking'));
});

test('AuthService inicia sesion con un repositorio falso (inyeccion por constructor)', async () => {
  const hash = await bcrypt.hash('secreta123', 4);
  const usuario = User.fromRow({ id: 7, username: 'ana', email: 'a@a.com', role: 'user', created_at: null, password: hash });
  const servicio = new AuthService({ findByEmail: async (email) => (email === 'a@a.com' ? usuario : null) });

  const { token, usuario: devuelto } = await servicio.iniciarSesion({ email: 'a@a.com', password: 'secreta123' });
  assert.ok(token.split('.').length === 3);
  assert.strictEqual(devuelto.id, 7);

  for (const credenciales of [{ email: 'a@a.com', password: 'mala' }, { email: 'nadie@a.com', password: 'x' }]) {
    await assert.rejects(
      () => servicio.iniciarSesion(credenciales),
      (error) => error instanceof AppError && error.statusCode === 401 && error.message === 'Credenciales inválidas'
    );
  }
});

test('MovieService.crear: un usuario propone (pending) y el admin publica (approved)', async () => {
  const guardadas = [];
  const peliculas = {
    categoryExists: async () => true,
    create: async (datos, createdBy) => { guardadas.push({ datos, createdBy }); return datos; },
  };
  const servicio = new MovieService(peliculas, {});
  const usuario = (id, role) => User.fromRow({ id, username: 'u', email: 'e', role, created_at: null });

  await servicio.crear({ title: 'A', categoryId: 1 }, usuario(1, 'user'));
  await servicio.crear({ title: 'B', categoryId: 1 }, usuario(2, 'admin'));
  assert.deepStrictEqual(guardadas.map((g) => [g.datos.status, g.createdBy]), [['pending', 1], ['approved', 2]]);
});

test('MovieService traduce el titulo repetido a 409 y una categoria inexistente a 422', async () => {
  const duplicada = new MovieService({ categoryExists: async () => true, create: async () => { const e = new Error('dup'); e.code = 'ER_DUP_ENTRY'; throw e; } }, {});
  const admin = User.fromRow({ id: 1, username: 'u', email: 'e', role: 'admin', created_at: null });
  await assert.rejects(() => duplicada.crear({ categoryId: 1 }, admin), (e) => e.statusCode === 409);

  const sinCategoria = new MovieService({ categoryExists: async () => false }, {});
  await assert.rejects(() => sinCategoria.crear({ categoryId: 99 }, admin), (e) => e.statusCode === 422);
});

test('RepositoryConId aporta findById y remove; ReviewRepository y WatchlistRepository no los heredan', () => {
  const RepositoryConId = require('../src/repositories/RepositoryConId');
  const { WatchlistRepository } = require('../src/repositories/WatchlistRepository');
  const { ReviewRepository } = require('../src/repositories/ReviewRepository');
  const { UserRepository } = require('../src/repositories/UserRepository');

  assert.ok(new CategoryRepository() instanceof RepositoryConId);
  assert.ok(new UserRepository() instanceof RepositoryConId);
  for (const Clase of [WatchlistRepository, ReviewRepository]) {
    const repo = new Clase();
    assert.ok(repo instanceof Repository);
    assert.strictEqual(repo instanceof RepositoryConId, false);
    assert.strictEqual(typeof repo.findById, 'undefined');
  }
});

test('WatchlistService solo guarda peliculas aprobadas y avisa si ya estaban o no estan', async () => {
  const { WatchlistService } = require('../src/services/WatchlistService');
  const Movie = require('../src/models/entities/Movie');
  const fila = (status) => ({ id: 5, title: 'T', status, review_count: 0, avg_rating: 0, likes: 0, dislikes: 0, ranking_score: 0 });
  const yaGuardadas = new Set();
  const lista = {
    agregar: async (userId, movieId) => (yaGuardadas.has(movieId) ? false : (yaGuardadas.add(movieId), true)),
    quitar: async (userId, movieId) => yaGuardadas.delete(movieId),
  };
  const peliculas = { findById: async (id) => (id === 5 ? Movie.fromRow(fila('approved')) : id === 6 ? Movie.fromRow({ ...fila('pending'), id: 6 }) : null) };
  const servicio = new WatchlistService(peliculas, lista);
  const usuario = { id: 1 };

  assert.deepStrictEqual(await servicio.agregar(5, usuario), { movieId: 5, agregada: true });
  assert.deepStrictEqual(await servicio.agregar(5, usuario), { movieId: 5, agregada: false });
  await assert.rejects(() => servicio.agregar(6, usuario), (e) => e.statusCode === 404);
  await assert.rejects(() => servicio.agregar(99, usuario), (e) => e.statusCode === 404);
  await servicio.quitar(5, usuario);
  await assert.rejects(() => servicio.quitar(5, usuario), (e) => e.statusCode === 404);
});

test('Movie guarda trailer, plataformas e IMDb y no deja modificar la lista desde afuera', () => {
  const Movie = require('../src/models/entities/Movie');
  const movie = Movie.fromRow({
    id: 1, title: 'T', status: 'approved', review_count: 0, avg_rating: 0, likes: 0, dislikes: 0, ranking_score: 0,
    trailer_url: 'https://youtu.be/abcdefghijk', streaming: '[{"platform":"netflix","url":"https://netflix.com/x"}]', imdb_rating: '8.4',
  });
  assert.strictEqual(movie.trailerUrl, 'https://youtu.be/abcdefghijk');
  assert.strictEqual(movie.imdbRating, 8.4);
  assert.deepStrictEqual(movie.toJSON().streaming, [{ platform: 'netflix', url: 'https://netflix.com/x' }]);
  movie.streaming.push({ platform: 'otra', url: 'x' });
  assert.strictEqual(movie.streaming.length, 1);
  assert.deepStrictEqual(Movie.fromRow({ id: 2, title: 'S', review_count: 0, avg_rating: 0, likes: 0, dislikes: 0, ranking_score: 0 }).toJSON().streaming, []);
});
