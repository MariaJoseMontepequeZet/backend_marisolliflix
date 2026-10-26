const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const { getPool } = require('./db');
const env = require('./env');

const options = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: env.JWT_SECRET,
  algorithms: ['HS256']
};

const configurePassport = (passport) => {
  passport.use(
    new JwtStrategy(options, async (jwt_payload, done) => {
      try {
        const pool = getPool();
        const [users] = await pool.query('SELECT id, username, email, role, created_at FROM users WHERE id = ?', [jwt_payload.id]);

        if (users.length > 0) {
          return done(null, users[0]);
        }
        return done(null, false);
      } catch (error) {
        return done(error, false);
      }
    })
  );
};

module.exports = configurePassport;