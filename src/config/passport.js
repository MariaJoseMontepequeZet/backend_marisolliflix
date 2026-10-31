const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const { userRepository } = require('../repositories/UserRepository');
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
        const user = await userRepository.findById(jwt_payload.id);
        return done(null, user || false);
      } catch (error) {
        return done(error, false);
      }
    })
  );
};

module.exports = configurePassport;