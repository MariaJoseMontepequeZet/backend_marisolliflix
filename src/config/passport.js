const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const { getDb } = require('./db');
const { ObjectId } = require('mongodb');
const env = require('./env');

const options = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: env.JWT_SECRET || 'secret_key'
};

const configurePassport = (passport) => {
  passport.use(
    new JwtStrategy(options, async (jwt_payload, done) => {
      try {
        const db = getDb();
        const user = await db.collection('users').findOne({ _id: new ObjectId(jwt_payload.id) });

        if (user) {
          const { password, ...userWithoutPassword } = user;
          return done(null, userWithoutPassword);
        }
        return done(null, false);
      } catch (error) {
        return done(error, false);
      }
    })
  );
};

module.exports = configurePassport;