// passport is an express compatible auth middleware
const passport = require("passport");
// passport-jwt is a third party module for authenticating using jwts
const passportJwt = require("passport-jwt");
const JwtStrategy = passportJwt.Strategy;
const ExtractJwt = passportJwt.ExtractJwt;

// jsonwebtoken is a complete third party implementation of jwt in node
const jwt = require("jsonwebtoken");

// jwt secret, will use for encoding and decoding jwt, keep it in a safe location
const jwtSecret = "Mys3cr3t";

const {User} = require("../models/User");
const HttpError = require("../models/HttpError");

// decode options
const jwtDecodeOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: jwtSecret,
    issuer: "buddies.chatapp.com",
    audience: "chatapp.net"
};

// specify how to decode jwt and what to put in req.user
passport.use(

    new JwtStrategy(jwtDecodeOptions, (payload, done) => {

        console.log("jwt is decoded, trying to put payload in req.user");

        console.log(payload);
        // payload.data is the data we put when signing the jwt
        // we are fetching the user from the DB, and putting it in the req.user
        User.findById(payload.data.id)
        .then((user)=>
        {
            if(user)
            {
                // user found
                // null: no error
                // user: data to put in req.user
                return done(null, user);
            }
            else
            {
                console.log("user not found");
                // user not found
                return done(new HttpError("Incorrect username or password", 401), false);
            }
        })
        .catch((err)=>
        {
            // could not fetch
            console.log(err);
            return done(new HttpError("Could not fetch necessary data. Please try again later", 500), false);
        })
        
      })
);

// middleware to secure a route by jwt
const secureRoute = passport.authenticate("jwt", {session: false});

module.exports = {
    secureRoute,
    jwtDecodeOptions
};