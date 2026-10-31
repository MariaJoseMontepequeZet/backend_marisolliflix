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
