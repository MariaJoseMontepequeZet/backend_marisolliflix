const { connectDB } = require('../config/db');

const createReview = async (req, res, next) => {
    const movieId = req.params.id;
    const userId = req.user.id;
    const { rating, comment } = req.body;

    let connection;
    try {
        const pool = await connectDB();
        connection = await pool.getConnection();
        
        await connection.beginTransaction();

        try {
            await connection.query(
                'INSERT INTO reviews (user_id, movie_id, rating, comment) VALUES (?, ?, ?, ?)',
                [userId, movieId, rating, comment]
            );
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                await connection.rollback();
                connection.release();
                return res.status(400).json({ message: 'Ya has registrado una reseña para esta película.' });
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
            success: true,
            message: 'Reseña creada y estadísticas actualizadas exitosamente',
            data: {
                movieId,
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