# backend_marisolliflix

API REST de **MarisolliFlix**: una app para registrar, calificar y rankear películas, animes y series geek. Construida con Node.js + Express y MySQL (driver oficial `mysql2`, sin ORM).

## Tecnologías

- Node.js + Express
- MySQL 8 (driver `mysql2`, tablas InnoDB para transacciones)
- Autenticación: passport-jwt, jsonwebtoken, bcryptjs
- Validaciones: express-validator · Límite de peticiones: express-rate-limit
- dotenv, semver, cors

## Requisitos

- Node.js 18 o superior
- MySQL 8 corriendo en local (o un servidor remoto)

## Instalación

```bash
npm install
cp .env.example .env   # y completa tus datos de MySQL
npm run dev            # o npm start
```

Al arrancar, el servidor crea la base de datos `DB_NAME` y las tablas (`users`, `categories`, `movies`) si no existen.

Para cargar las categorías iniciales (Anime, Ciencia Ficción, Superhéroes y Fantasía): `npm run seed`. Se puede correr varias veces, las que ya existen se saltan.

Para probar: `npm test` (necesita MySQL corriendo con los datos del `.env`).

## Variables de entorno

| Variable      | Descripción                              | Ejemplo                  |
|---------------|------------------------------------------|--------------------------|
| `PORT`        | Puerto del servidor                      | `3000`                   |
| `DB_HOST`     | Host de MySQL                            | `localhost`              |
| `DB_PORT`     | Puerto de MySQL                          | `3306`                   |
| `DB_USER`     | Usuario de MySQL                         | `root`                   |
| `DB_PASSWORD` | Contraseña de MySQL                      |                          |
| `DB_NAME`     | Nombre de la base de datos               | `marisolliflix`          |
| `DB_SSL`      | `true` para bases en la nube con SSL     | `false`                  |
| `TRUST_PROXY` | Proxies delante del servidor (1 en Render/Railway) | `0`            |
| `JWT_SECRET`  | Secreto para firmar los tokens           | `cambia_este_secreto`    |
| `JWT_EXPIRES` | Tiempo de expiración del token           | `1h`                     |
| `FRONT_URL`   | URL del frontend permitida por CORS      | `http://localhost:5500`  |

## Estructura

```
src/
├── config/        # variables de entorno y conexión a MySQL
├── controllers/
├── middlewares/
├── models/        # consultas SQL
├── routes/        # rutas del API (prefijo /api/v1)
├── services/
├── utils/         # versión del API (semver)
├── app.js         # configuración de Express
└── server.js      # arranque del servidor
```

## Modelo de datos

Las tablas están normalizadas hasta la cuarta forma normal (4FN):

| Tabla | Clave | Notas |
|-------|-------|-------|
| `users` | `id` | `username` y `email` únicos |
| `categories` | `id` | `name` único |
| `movies` | `id` | FK a `categories` y `users`; `title` único |
| `reviews` | `id` | Una reseña por usuario y película (`UNIQUE user_id, movie_id`); `rating` entre 1 y 10 (`CHECK`) |
| `review_votes` | `(review_id, user_id)` | Like (`1`) o dislike (`-1`); una sola vez por usuario y reseña |

- **Sin datos derivados:** `review_count`, `avg_rating`, `likes`, `dislikes` y `ranking_score` ya no se guardan en `movies`. Se calculan en la vista `movie_stats` a partir de `reviews` y `review_votes`, así no pueden quedar desincronizados.
- **Migración automática:** al arrancar, el servidor elimina esas columnas de bases creadas con el esquema anterior y agrega el `CHECK` de `rating`.
- Que un usuario no pueda votar su propia reseña lo valida la aplicación.

### Ranking ponderado

`stats.rankingScore` se calcula en la base (vistas `review_weights` y `movie_stats`), no se guarda:

- **Peso de cada reseña** = `max(0.1, 1 + 0.2 × (likes − dislikes))` ÷ `(1 + días / 365)`. Los likes la hacen pesar más, los dislikes menos, y las reseñas viejas pierden peso (a un año pesa la mitad).
- **Puntaje** = `(Σ peso × calificación + 2 × 5.5) / (Σ pesos + 2)`. Es un promedio bayesiano: con pocas reseñas se acerca a 5.5 y no se dispara con una sola. Sin reseñas vale 0.

## Catálogo inicial (400 películas)

`npm run seed:peliculas` carga 400 películas, series y animes (2000 – actualidad) desde `scripts/data/peliculas.json`:

- Crea las categorías que falten (Acción, aventura y bélica; Animación; Drama; Comedia; Terror; Suspenso / thriller; Crimen y gánsters; Romance, además de las 4 del seed básico).
- Las películas quedan **aprobadas** y a nombre del administrador del `.env` (`ADMIN_*`), que se crea si no existe. Las del género Anime se guardan con `type = anime`; el resto, `pelicula`.
- Se puede correr varias veces: lo que ya existe (por título o nombre de categoría, sin distinguir mayúsculas) se salta.
- Las sinopsis salen de Wikipedia en español ([CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.es)); el enlace del artículo de cada una está en el campo `fuente` del JSON. Las 28 películas sin artículo encontrado tienen un texto genérico de "Sinopsis pendiente de agregar".

## Versionado

La versión del API se lee del `package.json` y se valida con `semver`. Todas las rutas usan el prefijo `/api/v1`.

## Endpoints

### `GET /api/v1/health`

Revisa que el API y la base de datos estén funcionando.

```bash
curl http://localhost:3000/api/v1/health
```

Respuesta `200`:

```json
{ "status": "ok", "version": "0.1.0", "database": "ok", "timestamp": "2026-10-26T16:00:00.000Z" }
```

Si la base de datos no responde devuelve `503` con `"database": "error"`.

### Autenticación

Los endpoints protegidos esperan el header `Authorization: Bearer <token>`.

| Método | Ruta | Descripción | Respuestas |
|--------|------|-------------|------------|
| POST | `/api/v1/auth/register` | Registro (`username`, `email`, `password` mín. 8). Rol `user` | 201, 409 si ya existe, 422 |
| POST | `/api/v1/auth/login` | Login (`email`, `password`). Máx. 5 intentos / 15 min | 200 con `token`, 401, 422, 429 |
| GET | `/api/v1/auth/me` | Datos del usuario del token | 200, 401 |

```bash
curl -X POST http://localhost:3000/api/v1/auth/register   -H "Content-Type: application/json"   -d '{"username":"majo","email":"majo@test.com","password":"12345678"}'
```

Para crear un administrador, cambia el rol a mano: `UPDATE users SET role = 'admin' WHERE username = 'majo';` y vuelve a hacer login.

### Películas y series

Campos: `title` (único, sin distinguir mayúsculas), `description`, `categoryId`, `year`, `type` (`pelicula`, `serie` o `anime`), `imageUrl` (opcional) y `status` (`pending`, `approved`, `rejected`). Cada una trae `stats` (`reviewCount`, `avgRating`, `likes`, `dislikes`, `rankingScore`) en cero hasta que existan reseñas.

| Método | Ruta | Quién | Descripción | Respuestas |
|--------|------|-------|-------------|------------|
| GET | `/api/v1/movies` | Público | Lista las `approved`. Filtros `categoryId`, `type`, `page`, `limit`; orden con `sort` (`recientes` por defecto, `ranking`, `popularidad`, `titulo`, `anio`; también `popularity` y `year`). `category` es alias de `categoryId`. La popularidad suma reseñas y likes. El admin puede usar `status` | 200, 422 |
| GET | `/api/v1/movies/ranking` | Público | Top de aprobadas por `rankingScore`. Acepta `limit`, `categoryId`, `type` | 200, 422 |
| GET | `/api/v1/movies/:id` | Público | Detalle con sus reseñas (`reviews`, con autor, likes y dislikes). Si no está aprobada solo la ve el admin o quien la propuso | 200, 404 |
| GET | `/api/v1/movies/:id/reviews` | Público | Reseñas de la película con el nombre del autor | 200, 404 |
| POST | `/api/v1/movies/:id/reviews` | Usuario | Crea una reseña (`title`, `rating` 1-10, `comment`). Una por usuario y película | 201, 401, 404, 409, 422 |
| POST | `/api/v1/movies` | Usuario | Propone una (`pending`). Si es admin queda `approved` | 201, 401, 409 título repetido, 422 |
| PUT | `/api/v1/movies/:id` | Admin | Edita los campos enviados; con `status` aprueba o rechaza | 200, 403, 404, 409, 422 |
| DELETE | `/api/v1/movies/:id` | Admin | Elimina | 204, 403, 404 |
| GET | `/api/v1/movies/pending` | Admin | Propuestas por revisar, las más viejas primero. Acepta `page` y `limit` | 200, 401, 403, 422 |
| PATCH | `/api/v1/movies/:id/status` | Admin | Aprueba o rechaza con `{"status":"approved"}` o `{"status":"rejected"}`. No acepta `pending` | 200, 401, 403, 404, 422 |

```bash
curl -X POST http://localhost:3000/api/v1/movies   -H "Content-Type: application/json" -H "Authorization: Bearer <token>"   -d '{"title":"Matrix","description":"Un hacker descubre la realidad","categoryId":1,"year":1999,"type":"pelicula"}'
```

### Categorías

| Método | Ruta | Quién | Descripción | Respuestas |
|--------|------|-------|-------------|------------|
| GET | `/api/v1/categories` | Público | Lista todas, ordenadas por nombre | 200 |
| GET | `/api/v1/categories/:id` | Público | Detalle | 200, 404, 422 |
| POST | `/api/v1/categories` | Admin | Crea una (`name`, único sin distinguir mayúsculas) | 201, 401, 403, 409, 422 |
| PUT | `/api/v1/categories/:id` | Admin | Cambia el nombre | 200, 403, 404, 409, 422 |
| DELETE | `/api/v1/categories/:id` | Admin | Elimina. **409** si tiene películas asociadas | 204, 403, 404, 409 |

```bash
curl -X POST http://localhost:3000/api/v1/categories   -H "Content-Type: application/json" -H "Authorization: Bearer <token_admin>"   -d '{"name":"Terror"}'
```

## Frontend

Repositorio del frontend: _pendiente_
