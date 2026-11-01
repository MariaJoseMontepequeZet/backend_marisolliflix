const { test } = require('node:test');
const assert = require('node:assert');
const Movie = require('../src/models/entities/Movie');
const User = require('../src/models/entities/User');
const Review = require('../src/models/entities/Review');
const { CrearPeliculaDTO, ActualizarPeliculaDTO } = require('../src/dtos/movie.dto');
const { UsuarioPublicoDTO } = require('../src/dtos/auth.dto');
const { ReaccionDTO, ActualizarResenaDTO } = require('../src/dtos/review.dto');

const filaPelicula = (extra = {}) => ({
  id: 1, title: 'Akira', description: 'd', category_id: 2, year: 1988, image_url: null, type: 'anime',
  status: 'pending', review_count: '3', avg_rating: '8.50', likes: '4', dislikes: '1', ranking_score: '7.9',
  created_by: 10, created_at: new Date(0), updated_at: new Date(0), ...extra,
});

test('Movie.fromRow convierte los numeros de MySQL y arma la forma de la API', () => {
  const json = Movie.fromRow(filaPelicula()).toJSON();
  assert.strictEqual(json.categoryId, 2);
  assert.deepStrictEqual(json.stats, { reviewCount: 3, avgRating: 8.5, likes: 4, dislikes: 1, rankingScore: 7.9 });
  assert.strictEqual(JSON.parse(JSON.stringify(Movie.fromRow(filaPelicula()))).title, 'Akira');
});

test('los atributos de Movie son privados: solo se leen con getters', () => {
  const movie = Movie.fromRow(filaPelicula());
  assert.deepStrictEqual(Object.keys(movie), []);
  movie.title = 'Otro';
  assert.strictEqual(movie.title, 'Akira');
  movie.stats.likes = 999;
  assert.strictEqual(movie.stats.likes, 4);
});

test('Movie.puedeVerla: una aprobada la ve cualquiera; una pendiente, el admin y quien la propuso', () => {
  const pendiente = Movie.fromRow(filaPelicula());
  const aprobada = Movie.fromRow(filaPelicula({ status: 'approved' }));
  const usuario = (id, role) => User.fromRow({ id, username: 'u', email: 'e', role, created_at: null });

  assert.strictEqual(aprobada.puedeVerla(undefined), true);
  assert.strictEqual(pendiente.puedeVerla(undefined), false);
  assert.strictEqual(pendiente.puedeVerla(usuario(11, 'user')), false);
  assert.strictEqual(pendiente.puedeVerla(usuario(10, 'user')), true);
  assert.strictEqual(pendiente.puedeVerla(usuario(99, 'admin')), true);
});

test('User nunca expone la contraseña y la compara desde dentro de la clase', async () => {
  const bcrypt = require('bcryptjs');
  const user = User.fromRow({
    id: 1, username: 'ana', email: 'a@a.com', role: 'user', created_at: null, password: await bcrypt.hash('secreta123', 4),
  });
  assert.strictEqual(JSON.stringify(user).includes('secreta'), false);
  assert.strictEqual('password' in user.toJSON(), false);
  assert.strictEqual(await user.passwordCoincide('secreta123'), true);
  assert.strictEqual(await user.passwordCoincide('otra'), false);
  assert.strictEqual(user.esAdmin, false);
  assert.deepStrictEqual(Object.keys(new UsuarioPublicoDTO(user)), ['id', 'username', 'email', 'role']);
});

test('Review.esDe indica si la reseña es del usuario', () => {
  const review = Review.fromRow({
    id: 5, title: 't', rating: 9, comment: 'c', user_id: 3, username: 'ana', likes: '1', dislikes: '0',
    my_vote: '0', created_at: null, updated_at: null,
  });
  assert.strictEqual(review.esDe(3), true);
  assert.strictEqual(review.esDe(4), false);
  assert.deepStrictEqual(review.toJSON().author, { id: 3, username: 'ana' });
});

test('los DTO se quedan solo con sus campos', () => {
  const body = { title: 'T', description: 'D', categoryId: 1, year: 2000, type: 'pelicula', status: 'approved', hack: 'x' };
  assert.deepStrictEqual(Object.keys(new CrearPeliculaDTO(body)), ['title', 'description', 'categoryId', 'year', 'imageUrl', 'trailerUrl', 'streaming', 'imdbRating', 'type']);
  // al editar solo viajan los campos enviados (y status si viene)
  assert.deepStrictEqual({ ...new ActualizarPeliculaDTO({ year: 1999, status: 'rejected', hack: 1 }) }, { year: 1999, status: 'rejected' });
  assert.deepStrictEqual({ ...new ActualizarResenaDTO({ rating: 7, otro: 1 }) }, { rating: 7 });
  assert.strictEqual(new ReaccionDTO({ type: 'like' }).valor, 1);
  assert.strictEqual(new ReaccionDTO({ type: 'dislike' }).valor, -1);
});
