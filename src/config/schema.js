// Crea las tablas si no existen. Todas son InnoDB para poder usar transacciones.
// Los titulos usan una collation case-insensitive, asi el indice unico
// tambien bloquea "Matrix" y "matrix" como repetidos.
const tablas = [
  `CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_users_email (email),
    UNIQUE KEY uq_users_username (username)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // El nombre es unico sin distinguir mayusculas (collation _ci)
  `CREATE TABLE IF NOT EXISTS categories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_categories_name (name)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS movies (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category_id INT UNSIGNED NOT NULL,
    year SMALLINT UNSIGNED NOT NULL,
    image_url VARCHAR(500) NULL,
    type ENUM('pelicula', 'serie', 'anime') NOT NULL,
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    created_by INT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_movies_title (title),
    KEY idx_movies_category (category_id),
    KEY idx_movies_status (status),
    CONSTRAINT fk_movies_category FOREIGN KEY (category_id) REFERENCES categories (id),
    CONSTRAINT fk_movies_user FOREIGN KEY (created_by) REFERENCES users (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // NUEVA TABLA: Reseñas con restricción de una reseña por usuario por película
`CREATE TABLE IF NOT EXISTS reviews (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    movie_id INT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    rating TINYINT UNSIGNED NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_movie (user_id, movie_id),
    KEY idx_reviews_movie (movie_id),
    CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 10),
    CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_movie FOREIGN KEY (movie_id) REFERENCES movies (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // Like (1) o dislike (-1) de un usuario a una resena. La clave primaria
  // compuesta evita votar dos veces. Que no se pueda votar la propia resena
  // lo valida la aplicacion (un CHECK no puede mirar otra tabla).
  `CREATE TABLE IF NOT EXISTS review_votes (
    review_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    value TINYINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (review_id, user_id),
    KEY idx_review_votes_user (user_id),
    CONSTRAINT chk_review_votes_value CHECK (value IN (-1, 1)),
    CONSTRAINT fk_review_votes_review FOREIGN KEY (review_id) REFERENCES reviews (id) ON DELETE CASCADE,
    CONSTRAINT fk_review_votes_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // Datos que IMDb muestra en la ficha de un titulo y que antes no se guardaban.
  // Personas del reparto y el equipo (direccion, escritura, actores)
  `CREATE TABLE IF NOT EXISTS people (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    photo_url VARCHAR(500) NULL,
    imdb_id VARCHAR(15) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_people_imdb (imdb_id),
    KEY idx_people_name (name)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // Quien participo en cada titulo y como. character_name solo aplica a actores
  // (ej. "Neo"); billing_order conserva el orden en que IMDb lista el reparto.
  `CREATE TABLE IF NOT EXISTS movie_credits (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    movie_id INT UNSIGNED NOT NULL,
    person_id INT UNSIGNED NOT NULL,
    role ENUM('director', 'writer', 'actor') NOT NULL,
    character_name VARCHAR(150) NULL,
    billing_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    UNIQUE KEY uq_credit (movie_id, person_id, role, character_name),
    KEY idx_credits_person (person_id),
    CONSTRAINT fk_credits_movie FOREIGN KEY (movie_id) REFERENCES movies (id) ON DELETE CASCADE,
    CONSTRAINT fk_credits_person FOREIGN KEY (person_id) REFERENCES people (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // Un titulo puede tener varios generos (movies.category_id queda como el principal)
  `CREATE TABLE IF NOT EXISTS movie_categories (
    movie_id INT UNSIGNED NOT NULL,
    category_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (movie_id, category_id),
    KEY idx_movie_categories_category (category_id),
    CONSTRAINT fk_mc_movie FOREIGN KEY (movie_id) REFERENCES movies (id) ON DELETE CASCADE,
    CONSTRAINT fk_mc_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // "Intereses relacionados" de IMDb (Cyberpunk, Gun Fu, Inteligencia Artificial...)
  `CREATE TABLE IF NOT EXISTS keywords (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    UNIQUE KEY uq_keywords_name (name)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS movie_keywords (
    movie_id INT UNSIGNED NOT NULL,
    keyword_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (movie_id, keyword_id),
    KEY idx_movie_keywords_keyword (keyword_id),
    CONSTRAINT fk_mk_movie FOREIGN KEY (movie_id) REFERENCES movies (id) ON DELETE CASCADE,
    CONSTRAINT fk_mk_keyword FOREIGN KEY (keyword_id) REFERENCES keywords (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // Fotos, trailers, clips y posters de cada titulo
  `CREATE TABLE IF NOT EXISTS movie_media (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    movie_id INT UNSIGNED NOT NULL,
    kind ENUM('photo', 'trailer', 'clip') NOT NULL,
    title VARCHAR(255) NULL,
    url VARCHAR(500) NOT NULL,
    duration_seconds SMALLINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_media_movie (movie_id, kind),
    CONSTRAINT fk_media_movie FOREIGN KEY (movie_id) REFERENCES movies (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // "Agregar a la lista de videos" de IMDb: titulos que un usuario quiere ver
  `CREATE TABLE IF NOT EXISTS watchlist_items (
    user_id INT UNSIGNED NOT NULL,
    movie_id INT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, movie_id),
    KEY idx_watchlist_movie (movie_id),
    CONSTRAINT fk_watchlist_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_watchlist_movie FOREIGN KEY (movie_id) REFERENCES movies (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // Peso de cada resena en el ranking:
  //   - votos: 1 + 0.2 * (likes - dislikes), con minimo 0.1 (una resena muy rechazada casi no cuenta)
  //   - fecha: 1 / (1 + dias / 365), las resenas recientes pesan mas (1 año => la mitad)
  `CREATE OR REPLACE VIEW review_weights AS
    SELECT
      r.id AS review_id,
      r.movie_id,
      r.rating,
      GREATEST(0.1, 1 + 0.2 * (COALESCE(SUM(v.value = 1), 0) - COALESCE(SUM(v.value = -1), 0)))
        / (1 + GREATEST(0, DATEDIFF(NOW(), r.created_at)) / 365) AS weight
    FROM reviews r
    LEFT JOIN review_votes v ON v.review_id = r.id
    GROUP BY r.id, r.movie_id, r.rating, r.created_at`,

  // Las estadisticas de cada pelicula se calculan, no se guardan: asi no hay
  // datos duplicados que se puedan desincronizar de reviews y review_votes.
  // ranking_score es un promedio bayesiano ponderado:
  //   (suma_pesos * promedio_ponderado + 2 * 5.5) / (suma_pesos + 2)
  // Las peliculas con pocas resenas se acercan a 5.5 y las que no tienen quedan en 0.
  `CREATE OR REPLACE VIEW movie_stats AS
    SELECT
      m.id AS movie_id,
      COALESCE(r.review_count, 0) AS review_count,
      COALESCE(r.avg_rating, 0) AS avg_rating,
      COALESCE(v.likes, 0) AS likes,
      COALESCE(v.dislikes, 0) AS dislikes,
      CASE WHEN w.total_weight IS NULL THEN 0
           ELSE ROUND((w.weighted_sum + 2 * 5.5) / (w.total_weight + 2), 4) END AS ranking_score
    FROM movies m
    LEFT JOIN (
      SELECT movie_id, COUNT(*) AS review_count, ROUND(AVG(rating), 2) AS avg_rating
      FROM reviews GROUP BY movie_id
    ) r ON r.movie_id = m.id
    LEFT JOIN (
      SELECT rv.movie_id, SUM(vt.value = 1) AS likes, SUM(vt.value = -1) AS dislikes
      FROM review_votes vt JOIN reviews rv ON rv.id = vt.review_id
      GROUP BY rv.movie_id
    ) v ON v.movie_id = m.id
    LEFT JOIN (
      SELECT movie_id, SUM(weight) AS total_weight, SUM(weight * rating) AS weighted_sum
      FROM review_weights GROUP BY movie_id
    ) w ON w.movie_id = m.id`,
];

// Cambios para bases creadas con el esquema anterior (CREATE TABLE IF NOT EXISTS
// no modifica tablas existentes). Cada paso se salta si ya esta aplicado.
const COLUMNAS_DERIVADAS = ['review_count', 'avg_rating', 'likes', 'dislikes', 'ranking_score'];

// Columnas nuevas de movies tomadas de la ficha de IMDb
const COLUMNAS_NUEVAS = [
  ['original_title', 'VARCHAR(255) NULL'],
  ['runtime_minutes', 'SMALLINT UNSIGNED NULL'],
  ['content_rating', 'VARCHAR(10) NULL'],
  ['imdb_id', 'VARCHAR(15) NULL'],
];

async function migrar(pool) {
  for (const [columna, definicion] of COLUMNAS_NUEVAS) {
    const [filas] = await pool.query(
      `SELECT 1 FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'movies' AND COLUMN_NAME = ?`,
      [columna]
    );
    if (!filas.length) {
      await pool.query(`ALTER TABLE movies ADD COLUMN \`${columna}\` ${definicion}`);
      if (columna === 'imdb_id') {
        await pool.query('ALTER TABLE movies ADD UNIQUE KEY uq_movies_imdb (imdb_id)');
      }
    }
  }


  for (const columna of COLUMNAS_DERIVADAS) {
    const [filas] = await pool.query(
      `SELECT 1 FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'movies' AND COLUMN_NAME = ?`,
      [columna]
    );
    if (filas.length) {
      await pool.query(`ALTER TABLE movies DROP COLUMN \`${columna}\``);
    }
  }

  const [checks] = await pool.query(
    `SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reviews'
       AND CONSTRAINT_NAME = 'chk_reviews_rating'`
  );
  if (!checks.length) {
    await pool.query('ALTER TABLE reviews ADD CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 10)');
  }
}

// Un bloqueo de MySQL evita que dos procesos creen o migren el esquema a la vez
// (por ejemplo, varias instancias o los archivos de prueba en paralelo).
async function initSchema(pool) {
  const conexion = await pool.getConnection();
  try {
    await conexion.query("SELECT GET_LOCK('marisolliflix_schema', 60)");
    for (const sql of tablas) {
      await conexion.query(sql);
    }
    await migrar(conexion);
  } finally {
    await conexion.query("SELECT RELEASE_LOCK('marisolliflix_schema')");
    conexion.release();
  }
}

module.exports = initSchema;
