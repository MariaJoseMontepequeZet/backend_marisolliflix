# backend_marisolliflix

API REST de **MarisolliFlix**: una app para registrar, calificar y rankear películas, animes y series geek. Construida con Node.js + Express y MySQL (driver oficial `mysql2`, sin ORM).

## Tecnologías

- Node.js + Express
- MySQL 8 (driver `mysql2`, tablas InnoDB para transacciones)
- Autenticación: passport-jwt, jsonwebtoken, bcryptjs
- Validaciones: express-validator · Límite de peticiones: express-rate-limit
- Documentación: swagger-ui-express (OpenAPI 3)
- dotenv, semver, cors

## Requisitos

- Node.js 20 o superior
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
| `TRUST_PROXY` | Proxies delante del servidor (1 si hay nginx u otro proxy inverso) | `0` |
| `JWT_SECRET`  | Secreto para firmar los tokens           | `cambia_este_secreto`    |
| `JWT_EXPIRES` | Tiempo de expiración del token           | `1h`                     |
| `FRONT_URL`   | URL del frontend permitida por CORS      | `http://localhost:5500`  |

## Estructura

```
src/
├── config/          # variables de entorno, conexión a MySQL, passport, CORS
├── controllers/     # delgados: leen la petición, llaman al servicio y responden
├── dtos/            # clases con los datos de entrada y salida de cada endpoint
├── middlewares/     # validaciones (express-validator), autenticación, errores, límite de peticiones
├── models/entities/ # clases de las entidades: Movie, Category, Review, User
├── repositories/    # clases que hablan con MySQL: Repository y sus hijas
├── routes/          # rutas del API (prefijo /api/v1)
├── services/        # clases con la lógica de negocio: AuthService, MovieService...
├── utils/           # AppError, transacciones, versión del API (semver)
├── app.js           # configuración de Express
└── server.js        # arranque del servidor
```

## Arquitectura y programación orientada a objetos

Cada petición recorre las mismas capas, y cada capa tiene una sola responsabilidad:

```
ruta → validación (express-validator) → controlador → servicio → repositorio → MySQL
                                            │             │           │
                                           DTO      reglas de      entidad
                                                    negocio
```

| Capa | Clases | Qué hace |
|---|---|---|
| **DTO** (`dtos/`) | `CrearPeliculaDTO`, `ActualizarPeliculaDTO`, `CrearResenaDTO`, `RegistroDTO`, `CredencialesDTO`, `UsuarioPublicoDTO`... | Se queda solo con los campos que le tocan del cuerpo de la petición y define qué se responde. |
| **Entidades** (`models/entities/`) | `Movie`, `Category`, `Review`, `User` | Representan una fila de MySQL como objeto. |
| **Repositorios** (`repositories/`) | `Repository` (abstracta), `MovieRepository`, `CategoryRepository`, `UserRepository`, `ReviewRepository` | Todo el SQL vive aquí. |
| **Servicios** (`services/`) | `AuthService`, `MovieService`, `CategoryService`, `ReviewService` | Reglas de negocio y transacciones. |
| **Errores** (`utils/`) | `AppError extends Error` | Error con código HTTP; el manejador central lo convierte en respuesta. |

Conceptos de POO que se usan, con el lugar donde verlos:

- **Encapsulamiento:** las entidades guardan sus datos en atributos privados (`#title`, `#status`...) y los exponen con getters (`Movie`, `User`). `User` además guarda el hash de la contraseña como privado: nunca sale en `toJSON()` y solo se compara dentro de la clase con `passwordCoincide()`.
- **Herencia:** `CategoryRepository`, `MovieRepository`, `UserRepository` y `ReviewRepository` extienden `Repository`, que aporta `findById` y `remove`; `AppError` extiende `Error`.
- **Clase abstracta y polimorfismo:** `Repository` no se puede instanciar y obliga a cada hija a implementar `hidratar(fila)`, que convierte una fila en su entidad. `MovieRepository` y `UserRepository` sobrescriben `findById` porque necesitan consultas propias (películas con estadísticas, usuarios sin contraseña).
- **Métodos con comportamiento:** las reglas viven en la clase a la que pertenecen, por ejemplo `movie.puedeVerla(usuario)`, `review.esDe(userId)` o `user.esAdmin`.
- **Métodos privados:** los servicios usan `#` para sus ayudas internas (`#validarCategoria`, `#votable`, `#resumenReaccion`).
- **Inyección de dependencias:** cada servicio recibe su repositorio por el constructor (`new MovieService(peliculas, resenas)`), así las pruebas lo usan con repositorios falsos sin tocar la base de datos.
- **Transacciones:** `ReviewService` ejecuta crear, editar y eliminar reseñas y los likes/dislikes dentro de `conTransaccion`, para que la reseña, los votos y el ranking queden siempre consistentes.

## Decisiones respecto al enunciado

- **MySQL en lugar de MongoDB.** El enunciado propone MongoDB con el driver oficial; este proyecto usa MySQL 8 con el driver oficial `mysql2` (sin ORM), que es la base de datos trabajada en el curso. Las "transacciones reales" se resuelven con tablas InnoDB y `conTransaccion` (`BEGIN`/`COMMIT`/`ROLLBACK`), y el ranking ponderado se calcula con las vistas `movie_stats` y `review_weights`.
- **`bcryptjs` en lugar de `bcrypt`.** Es la misma API en JavaScript puro: no necesita compilar código nativo, así que se instala igual en Windows, Linux y en la imagen Docker del servidor.

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

## Catálogo inicial (112 películas con portada)

`npm run seed:peliculas` carga 112 películas, series y animes (2000 – actualidad) desde `scripts/data/peliculas.json`, con su sinopsis y su portada:

- Crea las categorías que falten (las 12 géneros del catálogo) y reutiliza las existentes.
- Las películas quedan **aprobadas** y a nombre del administrador del `.env` (`ADMIN_*`), que se crea si no existe. Las del género Anime se guardan con `type = anime`; el resto, `pelicula`.
- Se puede correr varias veces: lo que ya existe no se duplica. Si una película ya existía sin portada, la recibe; una portada puesta a mano nunca se pisa.
- La **portada** es una ruta del sitio, por ejemplo `/assets/img/portadas/gladiador-2000.jpg`. Las imágenes viven en el repositorio del frontend (`assets/img/portadas/`) y las sirve el mismo servidor que el frontend. `imageUrl` acepta una URL completa (`http`/`https`) o una ruta `/assets/img/...`.
- Las sinopsis salen de Wikipedia en español ([CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.es)); el enlace del artículo de cada una está en el campo `fuente` del JSON. Las que no tienen artículo llevan un texto genérico de "Sinopsis pendiente de agregar".

### Pasar del catálogo anterior de 400 al de 112

`npm run limpiar:catalogo` muestra qué se borraría sin cambiar nada. Si todo está bien, `npm run limpiar:catalogo -- --aplicar` quita las películas del catálogo anterior que ya no están en el nuevo. Es seguro porque:

- solo mira los títulos del catálogo original (`scripts/data/catalogo_original.json`), nunca las propuestas de los usuarios;
- una película que ya tiene reseñas **no se borra** (se avisa y se conserva);
- se puede repetir sin problema.

## Versionado

La versión del API se lee del `package.json` y se valida con `semver`. Todas las rutas usan el prefijo `/api/v1`.

## Límite de peticiones

Todo el API acepta hasta **100 peticiones cada 3 minutos por IP** (`express-rate-limit`). Al pasarse responde `429` con el formato de error y el header `Retry-After` indica cuántos segundos esperar. El login es más estricto: 5 intentos fallidos cada 15 minutos. Si hay un proxy inverso delante (nginx, Caddy), configura `TRUST_PROXY` para que se cuente la IP real de cada visitante y no la del proxy.

## Documentación interactiva (Swagger)

Con el servidor corriendo, abre **`/api/v1/docs`** (por ejemplo http://localhost:3000/api/v1/docs). Ahí están todos los endpoints con sus parámetros, ejemplos y respuestas, y puedes probarlos: inicia sesión en `POST /auth/login`, copia el `token`, pulsa **Authorize** y pégalo. La especificación en JSON está en `/api/v1/docs.json` y vive en `src/docs/openapi.js`.

## Endpoints

### `GET /api/v1/health`

Revisa que el API y la base de datos estén funcionando.

```bash
curl http://localhost:3000/api/v1/health
```

Respuesta `200`:

```json
{ "status": "ok", "version": "1.0.0", "database": "ok", "timestamp": "2026-10-26T16:00:00.000Z" }
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

El administrador se crea con `npm run seed` a partir de `ADMIN_NAME`, `ADMIN_EMAIL` y `ADMIN_PASSWORD` del `.env`. También puedes cambiar el rol a mano: `UPDATE users SET role = 'admin' WHERE username = 'majo';` y volver a hacer login.

### Películas y series

Campos: `title` (único, sin distinguir mayúsculas), `description`, `categoryId`, `year`, `type` (`pelicula`, `serie` o `anime`), `imageUrl` (opcional) y `status` (`pending`, `approved`, `rejected`). Cada una trae `stats` (`reviewCount`, `avgRating`, `likes`, `dislikes`, `rankingScore`) en cero hasta que existan reseñas.

| Método | Ruta | Quién | Descripción | Respuestas |
|--------|------|-------|-------------|------------|
| GET | `/api/v1/movies` | Público | Lista las `approved`. Filtros `categoryId`, `type`, `page`, `limit`; orden con `sort` (`recientes` por defecto, `ranking`, `popularidad`, `titulo`, `anio`; también `popularity` y `year`). `category` es alias de `categoryId`. La popularidad suma reseñas y likes. El admin puede usar `status` | 200, 422 |
| GET | `/api/v1/movies/ranking` | Público | Top de aprobadas por `rankingScore`. Acepta `limit`, `categoryId`, `type` | 200, 422 |
| GET | `/api/v1/movies/:id` | Público | Detalle con sus reseñas (`reviews`, con autor, likes y dislikes). Si no está aprobada solo la ve el admin o quien la propuso | 200, 404 |
| GET | `/api/v1/movies/:id/reviews` | Público | Reseñas con autor, `likes`, `dislikes` y `myVote` (si mandas token). Las de películas no aprobadas solo las ve el admin o quien la propuso | 200, 404, 422 |
| POST | `/api/v1/movies/:id/reviews` | Usuario | Crea una reseña (`title`, `rating` 1-10, `comment`). Una por usuario y película | 201, 401, 404, 409, 422 |
| PUT | `/api/v1/reviews/:id` | Autor | Edita su reseña (al menos uno de `title`, `rating`, `comment`) | 200, 401, 403, 404, 422 |
| DELETE | `/api/v1/reviews/:id` | Autor | Elimina su reseña y sus votos | 200, 401, 403, 404, 422 |
| POST | `/api/v1/reviews/:id/reaction` | Usuario | `{"type":"like"}` o `{"type":"dislike"}`. Repetir el mismo tipo quita el voto; el otro tipo lo cambia. No se vota la propia reseña | 200, 401, 403, 404, 422 |
| DELETE | `/api/v1/reviews/:id/reaction` | Usuario | Quita su voto | 200, 401, 403, 404, 422 |
| POST | `/api/v1/movies` | Usuario | Propone una (`pending`). Si es admin queda `approved` | 201, 401, 409 título repetido, 422 |
| PUT | `/api/v1/movies/:id` | Admin | Edita los campos enviados; con `status` aprueba o rechaza | 200, 403, 404, 409, 422 |
| DELETE | `/api/v1/movies/:id` | Admin | Elimina | 204, 403, 404 |
| GET | `/api/v1/movies/pending` | Admin | Propuestas por revisar, las más viejas primero. Acepta `page` y `limit` | 200, 401, 403, 422 |
| PATCH | `/api/v1/movies/:id/status` | Admin | Aprueba o rechaza con `{"status":"approved"}` o `{"status":"rejected"}`. No acepta `pending` | 200, 401, 403, 404, 422 |

```bash
curl -X POST http://localhost:3000/api/v1/movies   -H "Content-Type: application/json" -H "Authorization: Bearer <token>"   -d '{"title":"Matrix","description":"Un hacker descubre la realidad","categoryId":1,"year":1999,"type":"pelicula"}'
```

```bash
# Dar like a una reseña
curl -X POST http://localhost:3000/api/v1/reviews/7/reaction   -H "Content-Type: application/json" -H "Authorization: Bearer <token>"   -d '{"type":"like"}'
```

Las estadísticas de cada película (`stats`) y su `rankingScore` se calculan a partir de las reseñas y los votos (ver "Ranking ponderado"), así que cambian solas al crear, editar o borrar reseñas y al votar.

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

Repositorio del frontend: https://github.com/MariaJoseMontepequeZet/frontend_marisolliflix

Frontend en HTML, CSS y JavaScript puro que consume este API (inicio, listado, login y registro, panel de administración y propuesta de películas). Sitio en el servidor: https://marisolliflix.pamcing.me
