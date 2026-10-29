const { getPool } = require('../config/db');

// Crear una nueva reseña
const createReview = async (req, res, next) => {
    const movieId = req.params.id;
    const userId = req.user.id;
    const { title, rating, comment } = req.body;
    let connection;

    try {
        const pool = await getPool();
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Verificar si la película existe
        const [movies] = await connection.query('SELECT id FROM movies WHERE id = ?', [movieId]);
        if (movies.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({ status: 'error', message: 'Película no encontrada' });
        }

        // Insertar la reseña (la restricción UNIQUE uq_user_movie evitará duplicados por usuario)
        const [result] = await connection.query(
            'INSERT INTO reviews (user_id, movie_id, title, rating, comment) VALUES (?, ?, ?, ?, ?)',
            [userId, movieId, title, rating, comment]
        );

        await connection.commit();
        connection.release();

        return res.status(201).json({
            status: 'success',
            message: 'Reseña creada exitosamente',
            data: { reviewId: result.insertId, title, rating, comment }
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ status: 'error', message: 'Ya has escrito una reseña para esta película' });
        }
        next(error);
    }
};

// Obtener reseñas de una película
const getReviewsByMovieId = async (req, res, next) => {
    const movieId = req.params.id;

    try {
        const pool = await getPool();
        const [reviews] = await pool.query(
            `SELECT r.*, u.username FROM reviews r 
             JOIN users u ON r.user_id = u.id 
             WHERE r.movie_id = ? 
             ORDER BY r.created_at DESC`,
            [movieId]
        );

        return res.status(200).json({
            status: 'success',
            data: reviews
        });
    } catch (error) {
        next(error);
    }
};

// Actualizar reseña propia (HU-09)
const updateReview = async (req, res, next) => {
    const reviewId = req.params.id;
    const userId = req.user.id;
    const { title, rating, comment } = req.body;
    let connection;

    try {
        const pool = await getPool();
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. Verificar si la reseña existe
        const [reviews] = await connection.query('SELECT * FROM reviews WHERE id = ?', [reviewId]);
        if (reviews.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({ status: 'error', message: 'Reseña no encontrada' });
        }

        const review = reviews[0];

        // 2. Validar autoría (403 si el usuario autenticado no es el autor)
        if (review.user_id !== userId) {
            await connection.rollback();
            connection.release();
            return res.status(403).json({ status: 'error', message: 'No tienes permisos para editar esta reseña' });
        }

        // 3. Actualizar la reseña dentro de la transacción
        await connection.query(
            'UPDATE reviews SET title = ?, rating = ?, comment = ? WHERE id = ?',
            [title || review.title, rating || review.rating, comment || review.comment, reviewId]
        );

        // 4. Obtener las estadísticas actualizadas de la película desde la vista 'movie_stats'
        const [statsRows] = await connection.query(
            'SELECT review_count, avg_rating, ranking_score FROM movie_stats WHERE movie_id = ?',
            [review.movie_id]
        );

        await connection.commit();
        connection.release();

        return res.status(200).json({
            status: 'success',
            message: 'Reseña actualizada exitosamente',
            data: {
                reviewId,
                title: title || review.title,
                rating: rating || review.rating,
                comment: comment || review.comment,
                stats: statsRows[0] || null
            }
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        next(error);
    }
};

// Eliminar reseña propia (HU-09)
const deleteReview = async (req, res, next) => {
    const reviewId = req.params.id;
    const userId = req.user.id;
    let connection;

    try {
        const pool = await getPool();
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. Verificar si la reseña existe
        const [reviews] = await connection.query('SELECT * FROM reviews WHERE id = ?', [reviewId]);
        if (reviews.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({ status: 'error', message: 'Reseña no encontrada' });
        }

        const review = reviews[0];

        // 2. Validar autoría (403 si no es el autor)
        if (review.user_id !== userId) {
            await connection.rollback();
            connection.release();
            return res.status(403).json({ status: 'error', message: 'No tienes permisos para eliminar esta reseña' });
        }

        // 3. Borrar los likes/dislikes asociados (review_votes) por la restricción de integridad
        await connection.query('DELETE FROM review_votes WHERE review_id = ?', [reviewId]);

        // 4. Eliminar la reseña
        await connection.query('DELETE FROM reviews WHERE id = ?', [reviewId]);

        await connection.commit();
        connection.release();

        return res.status(200).json({
            status: 'success',
            message: 'Reseña y votos asociados eliminados exitosamente'
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        next(error);
    }
};

module.exports = {
    createReview,
    getReviewsByMovieId,
    updateReview,
    deleteReview
};