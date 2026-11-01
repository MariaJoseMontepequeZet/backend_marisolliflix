# MarisolliFlix · Backend

API REST de **MarisolliFlix**, una app para registrar, calificar y rankear películas, animes y series geek. Está hecha con **Node.js + Express** y **MySQL 8** (driver oficial `mysql2`, sin ORM), y la consume un frontend independiente en HTML, CSS y JavaScript puro.

| | |
|---|---|
| **Sitio publicado** | https://marisolliflix.pamcing.me |
| **Documentación interactiva (Swagger)** | https://marisolliflix.pamcing.me/api/v1/docs |
| **Repositorio del frontend** | https://github.com/MariaJoseMontepequeZet/frontend_marisolliflix |
| **Video** | https://drive.google.com/drive/folders/1fWOdx8Gpee_4csEE-WjLwmUCvh51XfC4?usp=sharing |
| **Versión del API** | 1.0.0 (semver), todas las rutas bajo `/api/v1` |

## Contenido

1. [Qué hace](#qué-hace)
2. [Tecnologías](#tecnologías)
3. [Instalación y arranque](#instalación-y-arranque)
4. [Variables de entorno](#variables-de-entorno)
5. [Scripts](#scripts)
6. [Estructura y arquitectura](#estructura-y-arquitectura)
7. [Programación orientada a objetos](#programación-orientada-a-objetos)
8. [Decisiones respecto al enunciado](#decisiones-respecto-al-enunciado)
9. [Modelo de datos](#modelo-de-datos)
10. [Ranking ponderado](#ranking-ponderado)
11. [Seguridad y errores](#seguridad-y-errores)
12. [Endpoints](#endpoints)
13. [Datos iniciales](#datos-iniciales)
14. [Pruebas](#pruebas)
15. [Despliegue](#despliegue)
16. [Flujo de trabajo (Scrum)](#flujo-de-trabajo-scrum)
17. [Equipo y créditos](#equipo-y-créditos)

## Qué hace

| Rol | Puede |
|---|---|
| **Visitante** | Ver el catálogo de películas aprobadas, buscar por título, filtrar por categoría, ordenar por ranking, popularidad, título, año o nota de IMDb, y leer el detalle con sus reseñas. |
| **Usuario** (con cuenta) | Todo lo anterior, más: crear, editar y eliminar su reseña (título, comentario y calificación de 1 a 10), dar like o dislike a las reseñas de otros (no a la propia), guardar películas en **Mi lista** y proponer películas nuevas (quedan pendientes de aprobación). |
| **Administrador** | Todo lo anterior, más: aprobar o rechazar propuestas, editar y eliminar películas, y gestionar las categorías. |

Reglas importantes:

- El **título** de una película es único (sin distinguir mayúsculas) y no se pueden repetir.
- Cada usuario escribe **una reseña por película**.
- El **ranking** es ponderado: combina la calificación, los likes y dislikes de cada reseña y su antigüedad (ver [Ranking ponderado](#ranking-ponderado)).
- Cada película puede traer un **trailer** de YouTube, las **plataformas** donde verla y la **calificación pública de IMDb** como referencia.

## Tecnologías

| Para qué | Qué se usa |
|---|---|
| Servidor | Node.js 20 o superior y Express 5 |
| Base de datos | MySQL 8 con el driver oficial `mysql2` (tablas InnoDB, sin ORM) |
| Autenticación | `passport` + `passport-jwt`, `jsonwebtoken` y `bcryptjs` |
| Validaciones | `express-validator` |
| Límite de peticiones | `express-rate-limit` |
| Documentación | `swagger-ui-express` (OpenAPI 3) |
| Configuración | `dotenv`, `cors`, `semver` |
| Pruebas | `node:test` (el ejecutor integrado de Node) |

## Instalación y arranque

Requisitos: **Node.js 20 o superior** y **MySQL 8** en marcha (local o remoto).

```bash
git clone https://github.com/MariaJoseMontepequeZet/backend_marisolliflix.git
cd backend_marisolliflix
npm install
cp .env.example .env      # y completa tus datos (ver la tabla de abajo)
npm run dev               # con recarga automática; o npm start
```

Al arrancar, el servidor **crea la base de datos** `DB_NAME` y todas las tablas y vistas si no existen, y aplica solo las migraciones pendientes. El API queda en http://localhost:3000/api/v1 y la documentación en http://localhost:3000/api/v1/docs.

Para tener datos desde el inicio, en este orden:

```bash
npm run seed                 # categorías básicas y el usuario administrador (del .env)
npm run seed:peliculas       # el catálogo de 112 películas, con sinopsis y portada
npm run seed:calificaciones  # la nota de IMDb de las 112
npm run seed:resenas         # (opcional) reseñas de demostración
```

Todos se pueden repetir sin duplicar nada. Más detalle en [Datos iniciales](#datos-iniciales).

## Variables de entorno

Se leen del archivo `.env` (que **nunca se sube a GitHub**; el modelo está en `.env.example`).

| Variable | Descripción | Ejemplo |
|---|---|---|
| `PORT` | Puerto del servidor | `3000` |
| `DB_HOST` | Host de MySQL | `localhost` |
| `DB_PORT` | Puerto de MySQL | `3306` |
| `DB_USER` | Usuario de MySQL | `root` |
| `DB_PASSWORD` | Contraseña de MySQL | |
| `DB_NAME` | Nombre de la base de datos | `marisolliflix` |
| `TRUST_PROXY` | Cuántos proxies hay delante del servidor (`0` si ninguno) | `0` |
| `JWT_SECRET` | Secreto con el que se firman los tokens (obligatorio) | `una_frase_larga_y_secreta` |
| `JWT_EXPIRES` | Duración del token | `1h` |
| `FRONT_URL` | Origen del frontend permitido por CORS | `http://localhost:5500` |
| `ADMIN_NAME` | Nombre del administrador que crea el seed | `Admin` |
| `ADMIN_EMAIL` | Correo del administrador | `admin@correo.com` |
| `ADMIN_PASSWORD` | Contraseña del administrador | |

Son obligatorias `DB_HOST`, `DB_USER`, `DB_NAME` y `JWT_SECRET`: si falta alguna, el servidor se detiene al arrancar y dice cuál.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm start` | Arranca el servidor |
| `npm run dev` | Arranca con recarga automática (`nodemon`) |
| `npm test` | Corre todas las pruebas (ver [Pruebas](#pruebas)) |
| `npm run seed` | Crea las categorías básicas y el administrador |
| `npm run seed:peliculas` | Carga el catálogo de 112 películas; completa portada y sinopsis de las que ya existían |
| `npm run seed:calificaciones` | Guarda la nota de IMDb de cada película |
| `npm run seed:resenas` | Carga reseñas y likes de demostración |
| `npm run limpiar:catalogo` | Quita las películas del catálogo anterior de 400 que ya no están (agrega `-- --aplicar` para ejecutarlo de verdad) |

## Estructura y arquitectura

```
src/
├── config/          # variables de entorno, conexión a MySQL, esquema, passport, CORS
├── controllers/     # delgados: leen la petición, llaman al servicio y responden
├── docs/            # especificación OpenAPI de Swagger
├── dtos/            # clases con los datos de entrada y salida de cada endpoint
├── middlewares/     # validaciones (express-validator), autenticación, errores, límite de peticiones
├── models/entities/ # clases de las entidades: Movie, Category, Review, User
├── repositories/    # clases que hablan con MySQL: Repository y sus hijas
├── routes/          # rutas del API (prefijo /api/v1)
├── services/        # clases con la lógica de negocio
├── utils/           # AppError, transacciones, versión del API (semver)
├── app.js           # configuración de Express
└── server.js        # arranque del servidor
scripts/             # seeds y datos del catálogo
tests/               # pruebas automáticas
```

Cada petición recorre las mismas capas, y cada capa tiene una sola responsabilidad:

```
ruta → validación (express-validator) → controlador → servicio → repositorio → MySQL
                                            │             │           │
                                           DTO      reglas de      entidad
                                                    negocio
```

## Programación orientada a objetos

| Capa | Clases | Qué hace |
|---|---|---|
| **DTO** (`dtos/`) | `CrearPeliculaDTO`, `ActualizarPeliculaDTO`, `CrearResenaDTO`, `RegistroDTO`, `CredencialesDTO`, `UsuarioPublicoDTO`... | Se queda solo con los campos que le tocan del cuerpo de la petición y define qué se responde. |
| **Entidades** (`models/entities/`) | `Movie`, `Category`, `Review`, `User` | Representan una fila de MySQL como objeto. |
| **Repositorios** (`repositories/`) | `Repository` (abstracta), `RepositoryConId`, `MovieRepository`, `CategoryRepository`, `UserRepository`, `ReviewRepository`, `WatchlistRepository` | Todo el SQL vive aquí. |
| **Servicios** (`services/`) | `AuthService`, `MovieService`, `CategoryService`, `ReviewService`, `WatchlistService` | Reglas de negocio y transacciones. |
| **Errores** (`utils/`) | `AppError extends Error` | Error con código HTTP; el manejador central lo convierte en respuesta. |

Conceptos de POO que se usan, con el lugar donde verlos:

- **Encapsulamiento:** las entidades guardan sus datos en atributos privados (`#title`, `#status`...) y los exponen con getters (`Movie`, `User`). `User` además guarda el hash de la contraseña como privado: nunca sale en `toJSON()` y solo se compara dentro de la clase con `passwordCoincide()`.
- **Herencia:** `RepositoryConId` extiende `Repository` y aporta `findById` y `remove` a las tablas con columna `id`; de ella heredan `CategoryRepository`, `MovieRepository` y `UserRepository`. `ReviewRepository` y `WatchlistRepository` (tablas sin `id` propio) heredan directo de `Repository`, así ninguna hija promete algo que su tabla no tiene. `AppError` extiende `Error`.
- **Clase abstracta y polimorfismo:** `Repository` no se puede instanciar y obliga a cada hija a implementar `hidratar(fila)`, que convierte una fila en su entidad. `MovieRepository` y `UserRepository` sobrescriben `findById` porque necesitan consultas propias (películas con estadísticas, usuarios sin contraseña).
- **Métodos con comportamiento:** las reglas viven en la clase a la que pertenecen, por ejemplo `movie.puedeVerla(usuario)`, `review.esDe(userId)` o `user.esAdmin`.
- **Métodos privados:** los servicios usan `#` para sus ayudas internas (`#validarCategoria`, `#votable`, `#resumenReaccion`).
- **Inyección de dependencias:** cada servicio recibe su repositorio por el constructor (`new MovieService(peliculas, resenas)`), así las pruebas lo usan con repositorios falsos sin tocar la base de datos.
- **Transacciones:** `ReviewService` ejecuta crear, editar y eliminar reseñas y los likes/dislikes dentro de `conTransaccion`, para que la reseña, los votos y el ranking queden siempre consistentes.

## Decisiones respecto al enunciado

- **MySQL en lugar de MongoDB.** El enunciado propone MongoDB con el driver oficial; este proyecto usa MySQL 8 con el driver oficial `mysql2` (sin ORM), que es la base de datos trabajada en el curso. Las "transacciones reales" se resuelven con tablas InnoDB y `conTransaccion` (`BEGIN`/`COMMIT`/`ROLLBACK`), y el ranking ponderado se calcula con las vistas `movie_stats` y `review_weights`.
- **`bcryptjs` en lugar de `bcrypt`.** Es la misma API en JavaScript puro: no necesita compilar código nativo, así que se instala igual en Windows, Linux y en la imagen Docker del servidor.

## Modelo de datos

El esquema está normalizado hasta la cuarta forma normal (4FN): 12 tablas y 2 vistas, todas InnoDB (`utf8mb4`).

**Tablas que usa el API hoy**

| Tabla | Clave | Notas |
|---|---|---|
| `users` | `id` | `username` y `email` únicos; `role` es `user` o `admin` |
| `categories` | `id` | `name` único |
| `movies` | `id` | FK a `categories` y `users`; `title` único; `status` (`pending`, `approved`, `rejected`); incluye `trailer_url`, `streaming` (JSON) e `imdb_rating` |
| `reviews` | `id` | Una por usuario y película (`UNIQUE user_id, movie_id`); `rating` entre 1 y 10 (`CHECK`) |
| `review_votes` | `(review_id, user_id)` | Like (`1`) o dislike (`-1`); una sola vez por usuario y reseña |
| `watchlist_items` | `(user_id, movie_id)` | "Mi lista" de cada usuario |

**Tablas de la normalización a 4FN, creadas pero que el API todavía no usa:** `people`, `movie_credits` (director, guionista y elenco), `movie_categories` (categorías adicionales), `keywords`, `movie_keywords` y `movie_media` (fotos, trailers y clips). Quedan preparadas para ampliar la ficha de cada película sin cambiar el esquema.

**Vistas:** `review_weights` y `movie_stats`.

- **Sin datos derivados:** el conteo de reseñas, el promedio, los likes, los dislikes y el puntaje de ranking no se guardan en `movies`. Se calculan en la vista `movie_stats` a partir de `reviews` y `review_votes`, así no pueden quedar desincronizados.
- **Migración automática:** al arrancar, el servidor agrega las columnas nuevas a bases creadas con un esquema anterior y elimina las derivadas.
- Que un usuario no pueda votar su propia reseña lo valida la aplicación.

## Ranking ponderado

`stats.rankingScore` se calcula en la base (vistas `review_weights` y `movie_stats`), no se guarda:

- **Peso de cada reseña** = `max(0.1, 1 + 0.2 × (likes − dislikes))` ÷ `(1 + días / 365)`. Los likes la hacen pesar más, los dislikes menos, y las reseñas viejas pierden peso (a un año pesa la mitad).
- **Puntaje** = `(Σ peso × calificación + 2 × 5.5) / (Σ pesos + 2)`. Es un promedio bayesiano: con pocas reseñas se acerca a 5.5 y no se dispara con una sola. Sin reseñas vale 0.
- **Desempate** (`sort=ranking`): con el mismo puntaje gana la que tiene más reseñas, luego mejor promedio, más likes, mejor nota de IMDb y, por último, el título. El orden es total, así que el Top 5 no cambia según el `limit` que se pida.

## Seguridad y errores

- **Autenticación:** JWT firmado con `JWT_SECRET` (HS256), validado con `passport-jwt` en cada petición protegida. Los endpoints esperan `Authorization: Bearer <token>`.
- **Contraseñas:** se guardan con hash `bcryptjs` y nunca se devuelven en ninguna respuesta.
- **Roles:** los endpoints de administración usan el middleware `authorize('admin')`. Quien no es admin recibe `403`.
- **Validación:** todas las entradas pasan por `express-validator` antes de llegar al controlador (tipos, largos, rangos, URLs). El trailer solo acepta enlaces de YouTube y las plataformas salen de una lista cerrada. La búsqueda escapa `%` y `_`.
- **SQL:** todas las consultas usan parámetros (`?`); nunca se arma SQL con texto del usuario. Los órdenes permitidos están en una lista blanca.
- **CORS:** solo se acepta el origen de `FRONT_URL` (más las peticiones sin origen, como Postman o curl).
- **Límite de peticiones:** todo el API acepta hasta **100 peticiones cada 3 minutos por IP**. El login es más estricto: **5 intentos fallidos cada 15 minutos por IP y correo**. Al pasarse responde `429` y el header `Retry-After` indica cuánto esperar. Si hay un proxy inverso delante (Caddy, nginx), configura `TRUST_PROXY` para contar la IP real y no la del proxy.
- **Errores centralizados:** todos salen por el mismo manejador, con este formato:

```json
{ "status": "error", "message": "Datos inválidos", "errors": [{ "field": "year", "message": "..." }] }
```

| Código | Cuándo |
|---|---|
| 400 | JSON mal formado |
| 401 | Sin token, token inválido o credenciales incorrectas |
| 403 | No tienes permiso (no eres admin, o no es tu reseña) |
| 404 | No existe o no se puede ver |
| 409 | Duplicado (correo, título, categoría, reseña) o categoría con películas |
| 413 | Cuerpo de la petición demasiado grande |
| 422 | Datos inválidos |
| 429 | Demasiadas peticiones |
| 500 | Error interno (sin detalles hacia afuera) |

## Endpoints

La referencia completa, con parámetros, ejemplos y respuestas, está en Swagger: **`/api/v1/docs`** (la especificación en JSON, en `/api/v1/docs.json`). Para probar ahí un endpoint protegido: inicia sesión en `POST /auth/login`, copia el `token`, pulsa **Authorize** y pégalo.

Los endpoints protegidos esperan el header `Authorization: Bearer <token>`.

### `GET /api/v1/health`

Revisa que el API y la base de datos estén funcionando.

```bash
curl http://localhost:3000/api/v1/health
```

```json
{ "status": "ok", "version": "1.0.0", "database": "ok", "timestamp": "2026-10-26T16:00:00.000Z" }
```

Si la base de datos no responde devuelve `503` con `"database": "error"`.

### Autenticación

| Método | Ruta | Descripción | Respuestas |
|--------|------|-------------|------------|
| POST | `/api/v1/auth/register` | Registro (`username`, `email`, `password` de 8 a 72 caracteres). Rol `user` | 201, 409 si ya existe, 422 |
| POST | `/api/v1/auth/login` | Login (`email`, `password`). Máx. 5 intentos fallidos / 15 min | 200 con `token`, 401, 422, 429 |
| GET | `/api/v1/auth/me` | Datos del usuario del token | 200, 401 |

```bash
curl -X POST http://localhost:3000/api/v1/auth/register -H "Content-Type: application/json" -d '{"username":"majo","email":"majo@test.com","password":"12345678"}'
```

El administrador se crea con `npm run seed` a partir de `ADMIN_NAME`, `ADMIN_EMAIL` y `ADMIN_PASSWORD` del `.env`. También se puede cambiar el rol a mano: `UPDATE users SET role = 'admin' WHERE username = 'majo';` y volver a hacer login.

### Películas y series

Campos: `title` (único, sin distinguir mayúsculas), `description`, `categoryId`, `year`, `type` (`pelicula`, `serie` o `anime`), `imageUrl`, `trailerUrl`, `streaming`, `imdbRating` (los cuatro últimos opcionales) y `status` (`pending`, `approved`, `rejected`). Cada una trae `stats` (`reviewCount`, `avgRating`, `likes`, `dislikes`, `rankingScore`) en cero hasta que existan reseñas.

| Método | Ruta | Quién | Descripción | Respuestas |
|--------|------|-------|-------------|------------|
| GET | `/api/v1/movies` | Público | Lista las `approved`. Búsqueda por título con `q` (por ejemplo `?q=batman`). Filtros `categoryId`, `type`, `page`, `limit`; orden con `sort`: `recientes` (por defecto), `ranking`, `popularidad`, `titulo`, `anio` o `internet` (nota de IMDb); también `popularity` y `year`. `category` es alias de `categoryId`. El admin puede usar `status` | 200, 422 |
| GET | `/api/v1/movies/ranking` | Público | Top de aprobadas por `rankingScore`. Acepta `limit`, `categoryId`, `type` | 200, 422 |
| GET | `/api/v1/movies/:id` | Público | Detalle con sus reseñas (con autor, likes y dislikes). Con token incluye `inWatchlist`. Si no está aprobada solo la ve el admin o quien la propuso | 200, 404 |
| POST | `/api/v1/movies` | Usuario | Propone una (`pending`). Si es admin queda `approved`. Opcionales: `imageUrl`, `trailerUrl` (enlace de YouTube) y `streaming` (lista de `{ "platform", "url" }` con `platform` entre `netflix`, `prime`, `disney`, `max`, `appletv`, `paramount`, `crunchyroll`, `vix`, `mubi`, `youtube`, `otra`) | 201, 401, 409 título repetido, 422 |
| GET | `/api/v1/movies/pending` | Admin | Propuestas por revisar, las más viejas primero. Acepta `page` y `limit` | 200, 401, 403, 422 |
| PUT | `/api/v1/movies/:id` | Admin | Edita los campos enviados; con `status` aprueba o rechaza | 200, 403, 404, 409, 422 |
| PATCH | `/api/v1/movies/:id/status` | Admin | Aprueba o rechaza con `{"status":"approved"}` o `{"status":"rejected"}`. No acepta `pending` | 200, 401, 403, 404, 422 |
| DELETE | `/api/v1/movies/:id` | Admin | Elimina | 204, 403, 404 |

```bash
curl -X POST http://localhost:3000/api/v1/movies -H "Content-Type: application/json" -H "Authorization: Bearer <token>" -d '{"title":"Matrix","description":"Un hacker descubre la realidad","categoryId":1,"year":1999,"type":"pelicula"}'
```

### Reseñas y reacciones

| Método | Ruta | Quién | Descripción | Respuestas |
|--------|------|-------|-------------|------------|
| GET | `/api/v1/movies/:id/reviews` | Público | Reseñas con autor, `likes`, `dislikes` y `myVote` (si mandas token). Las de películas no aprobadas solo las ve el admin o quien la propuso | 200, 404, 422 |
| POST | `/api/v1/movies/:id/reviews` | Usuario | Crea una reseña (`title`, `rating` 1-10, `comment`). Una por usuario y película | 201, 401, 404, 409, 422 |
| PUT | `/api/v1/reviews/:id` | Autor | Edita su reseña (al menos uno de `title`, `rating`, `comment`) | 200, 401, 403, 404, 422 |
| DELETE | `/api/v1/reviews/:id` | Autor | Elimina su reseña y sus votos | 200, 401, 403, 404, 422 |
| POST | `/api/v1/reviews/:id/reaction` | Usuario | `{"type":"like"}` o `{"type":"dislike"}`. Repetir el mismo tipo quita el voto; el otro tipo lo cambia. No se vota la propia reseña | 200, 401, 403, 404, 422 |
| DELETE | `/api/v1/reviews/:id/reaction` | Usuario | Quita su voto | 200, 401, 403, 404, 422 |

```bash
curl -X POST http://localhost:3000/api/v1/reviews/7/reaction -H "Content-Type: application/json" -H "Authorization: Bearer <token>" -d '{"type":"like"}'
```

Las estadísticas de cada película y su `rankingScore` se calculan a partir de las reseñas y los votos, así que cambian solas al crear, editar o borrar reseñas y al votar.

### Mi lista

Todas las rutas piden token y solo tocan la lista de quien lo envía.

| Método | Ruta | Quién | Descripción | Respuestas |
|--------|------|-------|-------------|------------|
| GET | `/api/v1/watchlist` | Usuario | Películas guardadas, las últimas primero. Acepta `page` y `limit` | 200, 401, 422 |
| POST | `/api/v1/watchlist/:movieId` | Usuario | Guarda una película aprobada. 201 si se agregó, 200 si ya estaba | 200, 201, 401, 404, 422 |
| DELETE | `/api/v1/watchlist/:movieId` | Usuario | La quita de la lista | 204, 401, 404, 422 |

```bash
curl -X POST http://localhost:3000/api/v1/watchlist/25 -H "Authorization: Bearer <token>"
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
curl -X POST http://localhost:3000/api/v1/categories -H "Content-Type: application/json" -H "Authorization: Bearer <token_admin>" -d '{"name":"Terror"}'
```

## Datos iniciales

### Catálogo (112 películas con portada)

`npm run seed:peliculas` carga 112 películas, series y animes (2000 – actualidad) desde `scripts/data/peliculas.json`, con su sinopsis y su portada:

- Crea las categorías que falten (los 12 géneros del catálogo) y reutiliza las existentes.
- Las películas quedan **aprobadas** y a nombre del administrador del `.env`, que se crea si no existe. Las del género Anime se guardan con `type = anime`; el resto, `pelicula`.
- Se puede correr varias veces: lo que ya existe no se duplica. Si una película ya existía sin portada, la recibe, y si tenía la sinopsis de relleno ("Sinopsis pendiente de agregar"), recibe la real. Una portada o una sinopsis puesta a mano nunca se pisa.
- La **portada** es una ruta del sitio, por ejemplo `/assets/img/portadas/gladiador-2000.jpg`. Las imágenes viven en el repositorio del frontend y las sirve el mismo servidor. `imageUrl` acepta una URL completa (`http`/`https`) o una ruta `/assets/img/...`.
- Las sinopsis salen de Wikipedia en español ([CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.es)); el enlace del artículo de cada una está en el campo `fuente` del JSON.

### Calificaciones de IMDb

`npm run seed:calificaciones` (después de `seed:peliculas`) guarda la calificación pública de IMDb de las 112 películas en `movies.imdb_rating`, desde `scripts/data/calificaciones_imdb.json`. El listado la puede usar con `sort=internet` y el frontend la muestra en cada tarjeta y en el detalle. Las notas cambian con el tiempo en IMDb: para corregir una, edita el JSON y vuelve a correr el comando, o cámbiala desde el panel de administración.

### Reseñas de demostración

`npm run seed:resenas` (después de `seed:peliculas`) carga 2 a 4 reseñas por película y algunos likes entre ellas, desde `scripts/data/resenas_demo.json`, para que el ranking, el Top 5 y "Más populares" tengan datos desde el inicio:

- Las firman cuatro cuentas de demostración del equipo: **Majo**, **Allis**, **José** y **Marcos** (correos `@marisolliflix.demo`). Su contraseña es aleatoria y no se guarda, así que no se puede iniciar sesión con ellas.
- Si ya existe una cuenta **real** con alguno de esos nombres, se omite: las reseñas de demostración nunca se escriben en cuentas reales.
- Los textos y las fechas (`haceDias`) son simulados: no representan opiniones reales. Las fechas escalonadas hacen que el ranking ponderado por antigüedad tenga variedad.
- Corre en una transacción y se puede repetir: actualiza las reseñas en lugar de duplicarlas y no repite likes.

### Pasar del catálogo anterior de 400 al de 112

`npm run limpiar:catalogo` muestra qué se borraría sin cambiar nada. Con `npm run limpiar:catalogo -- --aplicar` quita las películas del catálogo anterior que ya no están en el nuevo. Es seguro porque solo mira los títulos del catálogo original (nunca las propuestas de los usuarios), no borra una película que ya tiene reseñas y se puede repetir.

## Pruebas

```bash
npm test
```

Corre las **124 pruebas** con `node --test`, un archivo a la vez. Cubren autenticación, películas, categorías, reseñas, reacciones, ranking y desempate, órdenes, búsqueda, trailer y plataformas, "Mi lista", seguridad, Swagger, el catálogo y las clases de POO (entidades, repositorios y servicios con repositorios falsos).

> **Importante:** las pruebas crean y borran datos y necesitan una base **vacía**. Usa una base de pruebas, nunca la del servidor. Si el catálogo de 112 películas ya está cargado, las 5 pruebas del catálogo fallan porque intentan crearlo de nuevo.

## Despliegue

El servidor es una computadora propia con Docker. En `~/marisolliflix` hay un `docker-compose.yml` con tres servicios:

- **`db`:** MySQL 8, con su volumen de datos.
- **`api`:** este backend (Node 22).
- **`web`:** Caddy, que sirve el frontend y manda `/api/*` a la `api`, y añade las cabeceras de seguridad.

Delante está Cloudflare (dominio, HTTPS y caché). El `.env` vive en esa carpeta, fuera del repositorio.

**Despliegue automático:** `.github/workflows/desplegar.yml` se ejecuta al hacer push a `main`. Un runner propio instalado en el servidor copia el código a `~/marisolliflix/backend_marisolliflix` y ejecuta `desplegar.sh api`, que reconstruye el servicio y espera a que quede sano.

A mano, en el servidor:

```bash
~/marisolliflix/desplegar.sh api
```

Lo que **no** es automático: los seeds (por ejemplo `docker compose exec api npm run seed:peliculas`), los cambios al `.env` y la caché de Cloudflare. Las tablas y las columnas nuevas sí se crean solas al arrancar.

## Flujo de trabajo (Scrum)

- Desarrollo bajo Scrum, con historias de usuario (HU) y sprints en ClickUp.
- **Una rama por tarea** (`feature/hu-XX-descripcion`, `fix/...`, `docs/...`, `refactor/...`) y un PR hacia `dev` con la plantilla de `.github/pull_request_template.md`.
- De `dev` a `main` al cerrar cada entrega; el merge a `main` despliega.
- Los commits se firman con el autor de quien hizo el trabajo.
- El documento de planeación Scrum (roles, requerimientos, historias de usuario y sprints) está en [`docs/planeacion-scrum.pdf`](docs/planeacion-scrum.pdf).

## Equipo y créditos

| Integrante | Rol en el equipo |
|---|---|
| María José Montepeque | [completar: rol Scrum y tareas] |
| Allison Vargas | [completar: rol Scrum y tareas] |
| [completar] | [completar] |
| [completar] | [completar] |

- Sinopsis: Wikipedia en español (CC BY-SA 4.0).
- Portadas: TMDB.
- Calificaciones de IMDb: se guardan solo como referencia externa.

## Frontend

Repositorio: https://github.com/MariaJoseMontepequeZet/frontend_marisolliflix. Es una interfaz en HTML, CSS y JavaScript puro que consume este API (inicio, listado, detalle, login y registro, Mi lista, proponer películas y panel de administración). Sitio publicado: https://marisolliflix.pamcing.me
