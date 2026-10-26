const { test, before, after } = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const { connectDB, getPool } = require('../src/config/db');

let server;
let baseUrl;
let categoryId;
let tokenUser;
let tokenAdmin;
let idPropuesta; // pelicula creada por el usuario (pending)
let idAdmin; // pelicula creada por el admin (approved)

const sufijo = Date.now();
const user = { username: `mu_${sufijo}`, email: `mu_${sufijo}@test.com`, password: 'password123' };
const admin = { username: `ma_${sufijo}`, email: `ma_${sufijo}@test.com`, password: 'password123' };
const titulo = (nombre) => `${nombre} ${sufijo}`;

const pelicula = (extra = {}) => ({
  title: titulo('Matrix'),
  description: 'Un hacker descubre la realidad',
  categoryId: 0, // se reemplaza en before()
  year: 1999,
  type: 'pelicula',
  ...extra,
});

const api = (metodo, ruta, { token, body } = {}) =>
  fetch(`${baseUrl}${ruta}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body && JSON.stringify(body),
  });

async function registrarYLogin(datos) {
  await api('POST', '/auth/register', { body: datos });
  const res = await api('POST', '/auth/login', { body: { email: datos.email, password: datos.password } });
  return (await res.json()).token;
}

before(async () => {
  await connectDB();
  server = app.listen(0);
  baseUrl = `http://localhost:${server.address().port}/api/v1`;

  const [cat] = await getPool().query('INSERT INTO categories (name) VALUES (?)', [`Cat ${sufijo}`]);
  categoryId = cat.insertId;

  tokenUser = await registrarYLogin(user);
  await registrarYLogin(admin); // el rol se cambia a mano y se vuelve a loguear
  await getPool().query('UPDATE users SET role = ? WHERE username = ?', ['admin', admin.username]);
  const res = await api('POST', '/auth/login', { body: { email: admin.email, password: admin.password } });
  tokenAdmin = (await res.json()).token;
});

after(async () => {
  const pool = getPool();
  await pool.query('DELETE FROM movies WHERE title LIKE ?', [`% ${sufijo}`]);
  await pool.query('DELETE FROM users WHERE username IN (?, ?)', [user.username, admin.username]);
  await pool.query('DELETE FROM categories WHERE id = ?', [categoryId]);
  server.close();
  await pool.end();
});

test('crear sin token responde 401', async () => {
  const res = await api('POST', '/movies', { body: pelicula({ categoryId }) });
  assert.strictEqual(res.status, 401);
});

test('un usuario crea una pelicula y queda pending con stats en cero', async () => {
  const res = await api('POST', '/movies', { token: tokenUser, body: pelicula({ categoryId }) });
  const data = await res.json();

  assert.strictEqual(res.status, 201);
  assert.strictEqual(data.data.status, 'pending');
  assert.strictEqual(data.data.imageUrl, null);
  assert.deepStrictEqual(data.data.stats, {
    reviewCount: 0, avgRating: 0, likes: 0, dislikes: 0, rankingScore: 0,
  });
  idPropuesta = data.data.id;
});

test('un admin crea una serie y queda approved', async () => {
  const res = await api('POST', '/movies', {
    token: tokenAdmin,
    body: pelicula({ title: titulo('Dark'), type: 'serie', year: 2017, categoryId, imageUrl: 'https://img.test/dark.jpg' }),
  });
  const data = await res.json();

  assert.strictEqual(res.status, 201);
  assert.strictEqual(data.data.status, 'approved');
  assert.strictEqual(data.data.imageUrl, 'https://img.test/dark.jpg');
  idAdmin = data.data.id;
});

test('el usuario no puede forzar status approved en el body', async () => {
  const res = await api('POST', '/movies', {
    token: tokenUser,
    body: pelicula({ title: titulo('Trampa'), categoryId, status: 'approved' }),
  });
  const data = await res.json();

  assert.strictEqual(res.status, 201);
  assert.strictEqual(data.data.status, 'pending');
});

test('titulo repetido responde 409, aunque cambien mayusculas', async () => {
  const igual = await api('POST', '/movies', { token: tokenUser, body: pelicula({ categoryId }) });
  assert.strictEqual(igual.status, 409);

  const otraCaja = await api('POST', '/movies', {
    token: tokenUser,
    body: pelicula({ title: titulo('MATRIX'), categoryId }),
  });
  assert.strictEqual(otraCaja.status, 409);
});

test('datos invalidos responden 422 con los campos', async () => {
  const res = await api('POST', '/movies', {
    token: tokenUser,
    body: { title: '', description: '', categoryId: 'x', year: 1500, type: 'libro', imageUrl: 'no-es-url' },
  });
  const data = await res.json();

  assert.strictEqual(res.status, 422);
  assert.deepStrictEqual(
    data.errors.map((e) => e.field).sort(),
    ['categoryId', 'description', 'imageUrl', 'title', 'type', 'year']
  );
});

test('categoria inexistente responde 422', async () => {
  const res = await api('POST', '/movies', {
    token: tokenUser,
    body: pelicula({ title: titulo('Sin categoria'), categoryId: 999999999 }),
  });
  const data = await res.json();

  assert.strictEqual(res.status, 422);
  assert.strictEqual(data.errors[0].field, 'categoryId');
});

test('el listado publico solo muestra approved y filtra por categoria', async () => {
  const res = await api('GET', `/movies?categoryId=${categoryId}`);
  const data = await res.json();

  assert.strictEqual(res.status, 200);
  assert.ok(data.data.length >= 1);
  assert.ok(data.data.every((m) => m.status === 'approved'));
  assert.ok(data.data.some((m) => m.id === idAdmin));
  assert.ok(!data.data.some((m) => m.id === idPropuesta));
  assert.strictEqual(data.pagination.page, 1);
});

test('el admin puede listar las pending con ?status=pending', async () => {
  const res = await api('GET', `/movies?categoryId=${categoryId}&status=pending`, { token: tokenAdmin });
  const data = await res.json();

  assert.strictEqual(res.status, 200);
  assert.ok(data.data.some((m) => m.id === idPropuesta));
});

test('una pelicula pending solo la ven su autor y el admin', async () => {
  const anonimo = await api('GET', `/movies/${idPropuesta}`);
  assert.strictEqual(anonimo.status, 404);

  const autor = await api('GET', `/movies/${idPropuesta}`, { token: tokenUser });
  assert.strictEqual(autor.status, 200);

  const adminRes = await api('GET', `/movies/${idPropuesta}`, { token: tokenAdmin });
  assert.strictEqual(adminRes.status, 200);
});

test('una pelicula approved es publica y un id inexistente da 404', async () => {
  const ok = await api('GET', `/movies/${idAdmin}`);
  assert.strictEqual(ok.status, 200);

  const noExiste = await api('GET', '/movies/999999999');
  assert.strictEqual(noExiste.status, 404);
});

test('PUT y DELETE responden 403 a un usuario normal', async () => {
  const put = await api('PUT', `/movies/${idPropuesta}`, { token: tokenUser, body: { year: 2000 } });
  assert.strictEqual(put.status, 403);

  const del = await api('DELETE', `/movies/${idPropuesta}`, { token: tokenUser });
  assert.strictEqual(del.status, 403);
});

test('el admin aprueba una pelicula con PUT y ya es publica', async () => {
  const res = await api('PUT', `/movies/${idPropuesta}`, { token: tokenAdmin, body: { status: 'approved', year: 2000 } });
  const data = await res.json();

  assert.strictEqual(res.status, 200);
  assert.strictEqual(data.data.status, 'approved');
  assert.strictEqual(data.data.year, 2000);
  assert.strictEqual(data.data.title, titulo('Matrix'));

  const publica = await api('GET', `/movies/${idPropuesta}`);
  assert.strictEqual(publica.status, 200);
});

test('PUT con un titulo que ya existe responde 409', async () => {
  const res = await api('PUT', `/movies/${idPropuesta}`, { token: tokenAdmin, body: { title: titulo('Dark') } });
  assert.strictEqual(res.status, 409);
});

test('el admin elimina y despues responde 404', async () => {
  const del = await api('DELETE', `/movies/${idPropuesta}`, { token: tokenAdmin });
  assert.strictEqual(del.status, 204);

  const otra = await api('DELETE', `/movies/${idPropuesta}`, { token: tokenAdmin });
  assert.strictEqual(otra.status, 404);
});
