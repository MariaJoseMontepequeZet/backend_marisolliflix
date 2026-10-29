const { getPool } = require('../config/db');

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
            return res.status(404).json({ message: 'La película no existe.' });
        }

        if (movies[0].status !== 'approved') {
            await connection.rollback();
            connection.release();
            return res.status(404).json({ message: 'La película no está aprobada para recibir reseñas.' });
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
                return res.status(409).json({ message: 'Ya has registrado una reseña para esta película.' });
            }
            throw error;
        }

        const [statsRows] = await connection.query(
            'SELECT review_count, avg_rating, ranking_score FROM movie_stats WHERE movie_id = ?',
            [movieId]
        );
        const reviewCount = Number(statsRows[0].review_count);
        const avgRating = Number(statsRows[0].avg_rating).toFixed(2);
        const rankingScore = Number(statsRows[0].ranking_score);

        await connection.commit();
        connection.release();

        return res.status(201).json({
            success: true,
            message: 'Reseña creada exitosamente',
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

module.exports = {
    createReview
};