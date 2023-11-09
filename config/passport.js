require("dotenv").config();
const Teacher = require("../models/teacherModel");
const JWTStrategy = require("passport-jwt").Strategy;
const ExtractJWT = require("passport-jwt").ExtractJwt;

const options = {};
options.jwtFromRequest = ExtractJWT.fromAuthHeaderAsBearerToken();
options.secretOrKey = process.env.JWT_SECRET;
options.passReqToCallback = true;

module.exports = (passport) => {
  passport.use(
    new JWTStrategy(options, (req, jwt_payload, done) => {
      Teacher.findById(jwt_payload.id, (error, teacher) => {
        if (error) {
          done(error, false);
        } else if (teacher) {
          req.teacher = teacher;
          done(null, teacher);
        } else {
          done(null, false);
        }
      });
    })
  );
};
