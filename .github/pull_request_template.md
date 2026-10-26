## Descripción

<!-- ¿Qué cambia este PR y por qué? -->

## Historia de usuario / Sprint

- Historia de usuario: <!-- enlace o ID (GitHub Projects / Trello / ClickUp) -->
- Sprint: <!-- ej. Sprint 1 -->

## Tipo de cambio

- [ ] Nueva funcionalidad (`feat`)
- [ ] Corrección de error (`fix`)
- [ ] Refactorización (`refactor`)
- [ ] Documentación (`docs`)
- [ ] Configuración / dependencias (`chore`)

## Módulo afectado

- [ ] Usuarios / autenticación
- [ ] Películas y series
- [ ] Reseñas, ratings y likes/dislikes
- [ ] Categorías
- [ ] Ranking y listados
- [ ] Configuración / infraestructura

## Checklist obligatoria

### Arquitectura
- [ ] El código respeta la estructura modular (`/models`, `/controllers`, `/routes`, `/middlewares`, `/services`, `/config`, `/utils`).
- [ ] Rutas, controladores, modelos y configuración están separados.

### Base de datos
- [ ] Se usa el driver oficial de MongoDB (**no** mongoose).
- [ ] Las operaciones críticas (ej. crear reseña con rating inicial, likes/dislikes) usan transacciones.

### Seguridad y validación
- [ ] Los endpoints protegidos usan JWT con `passport-jwt`.
- [ ] Se validan los permisos por rol (usuario / administrador) donde aplica.
- [ ] Las contraseñas se manejan con `bcrypt`.
- [ ] Las entradas se validan con `express-validator`.
- [ ] El endpoint queda cubierto por `express-rate-limit`.
- [ ] No se suben credenciales ni el archivo `.env`; las variables nuevas se agregaron a `.env.example` y al README.

### Errores y respuestas
- [ ] Los errores pasan por el manejador centralizado.
- [ ] Se devuelven los códigos HTTP correctos.

### Reglas de negocio (si aplica)
- [ ] No se permiten títulos de películas/series repetidos.
- [ ] La calificación de reseñas está entre 1 y 10.
- [ ] Un usuario no puede dar like/dislike a sus propias reseñas.
- [ ] Solo administradores gestionan categorías y aprueban películas.

### Documentación y versión
- [ ] Los endpoints nuevos o modificados están documentados en Swagger (`swagger-ui-express`).
- [ ] El README se actualizó si cambian instalación, variables de entorno o endpoints.
- [ ] La versión del API se actualizó siguiendo semver (si aplica).

## Cómo probarlo

<!-- Pasos, endpoints y ejemplos de request/response para validar el cambio -->

## Capturas / evidencia (opcional)
