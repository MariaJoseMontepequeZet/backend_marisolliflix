const { getPool } = require('../config/db');
const AppError = require('../utils/AppError'); 

const createReview = async (req, res, next) => {
    const movieId = req.params.id;
    const userId = req.user.id;
    const { title, rating, comment } = req.body;

    let connection;
    try {
        const pool = await getPool();
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [movies] = await connection.query(
            'SELECT id, status FROM movies WHERE id = ? FOR UPDATE',
            [movieId]
        );

        if (movies.length === 0) {
            await connection.rollback();
            connection.release();
            return next(new AppError('La película no existe.', 404));
        }

        if (movies[0].status !== 'approved') {
            await connection.rollback();
            connection.release();
            return next(new AppError('La película no está aprobada para recibir reseñas.', 404));
        }

        try {
            await connection.query(
                'INSERT INTO reviews (user_id, movie_id, title, rating, comment) VALUES (?, ?, ?, ?, ?)',
                [userId, movieId, title, rating, comment]
            );
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                await connection.rollback();
                connection.release();
                return next(new AppError('Ya has registrado una reseña para esta película.', 409));
            }
            throw error;
        }

        const [statsRows] = await connection.query(
            'SELECT COUNT(*) AS reviewCount, AVG(rating) AS avgRating FROM reviews WHERE movie_id = ?',
            [movieId]
        );

        const reviewCount = statsRows[0].reviewCount;
        const avgRating = Number(statsRows[0].avgRating).toFixed(2);
        const rankingScore = Number(avgRating) * reviewCount;

        await connection.query(
            'UPDATE movies SET review_count = ?, avg_rating = ?, ranking_score = ? WHERE id = ?',
            [reviewCount, avgRating, rankingScore, movieId]
        );

        await connection.commit();
        connection.release();

        return res.status(201).json({
            status: 'success',
            message: 'Reseña creada y estadísticas actualizadas exitosamente',
            data: {
                movieId,
                title,
                rating,
                comment,
                reviewCount,
                avgRating,
                rankingScore
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

const getReviewsByMovieId = async (req, res, next) => {
    const movieId = req.params.id;
    let connection;
    try {
        const pool = await getPool();
        connection = await pool.getConnection();

        // 1. Verificar si la película existe
        const [movies] = await connection.query('SELECT id FROM movies WHERE id = ?', [movieId]);
        if (movies.length === 0) {
            connection.release();
            return next(new AppError('La película no existe.', 404));
        }

        // 2. Obtener las reseñas de la película con el nombre de usuario
        const [reviews] = await connection.query(
            `SELECT r.id, r.title, r.rating, r.comment, r.created_at, u.username 
             FROM reviews r 
             JOIN users u ON r.user_id = u.id 
             WHERE r.movie_id = ?`,
            [movieId]
        );

        connection.release();

        return res.status(200).json({
            status: 'success',
            results: reviews.length,
            data: reviews
        });

    } catch (error) {
        if (connection) connection.release();
        next(error);
    }
};

// Se exportan ambas funciones al final
module.exports = {
    createReview,
    getReviewsByMovieId
};