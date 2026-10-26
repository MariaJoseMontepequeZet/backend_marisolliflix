# backend_marisolliflix

API REST de **MarisolliFlix**: una app para registrar, calificar y rankear películas, animes y series geek. Construida con Node.js + Express y MySQL (driver oficial `mysql2`, sin ORM).

## Tecnologías

- Node.js + Express
- MySQL 8 (driver `mysql2`, tablas InnoDB para transacciones)
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

Al arrancar, el servidor crea la base de datos `DB_NAME` si no existe.

## Variables de entorno

| Variable      | Descripción                              | Ejemplo                  |
|---------------|------------------------------------------|--------------------------|
| `PORT`        | Puerto del servidor                      | `3000`                   |
| `DB_HOST`     | Host de MySQL                            | `localhost`              |
| `DB_PORT`     | Puerto de MySQL                          | `3306`                   |
| `DB_USER`     | Usuario de MySQL                         | `root`                   |
| `DB_PASSWORD` | Contraseña de MySQL                      |                          |
| `DB_NAME`     | Nombre de la base de datos               | `marisolliflix`          |
| `JWT_SECRET`  | Secreto para firmar los tokens           | `cambia_este_secreto`    |
| `JWT_EXPIRES` | Tiempo de expiración del token           | `1h`                     |
| `FRONT_URL`   | URL del frontend permitida por CORS      | `http://localhost:5500`  |

## Estructura

```
src/
├── config/        # variables de entorno y conexión a MySQL
├── controllers/
├── middlewares/
├── models/
├── routes/        # rutas del API (prefijo /api/v1)
├── services/
├── utils/         # versión del API (semver)
├── app.js         # configuración de Express
└── server.js      # arranque del servidor
```

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

## Frontend

Repositorio del frontend: _pendiente_
