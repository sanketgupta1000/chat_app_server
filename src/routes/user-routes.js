const express = require("express");

const {check} = require("express-validator");

const userController = require("../controllers/user-controller");
const { secureRoute } = require("../config/jwt-config");

const router = express.Router();

// for signing up
router.post(
    "/signup",
    // applying validations
    [
        check("email")
            .normalizeEmail()
            .isEmail(),
        check("name")
            .not()
            .isEmpty(),
        check("description")
            .isLength({min: 8}),
        check("password")
            .isLength({min: 6}),
        check("interests")
            .isArray({min: 1})
    ],
    userController.signup
);

// endpoint to generate and send jwt
router.post(
    "/login",
    [
        // email and password is must
        check("email")
            .normalizeEmail()
            .isEmail(),
        check("password")
            .not()
            .isEmpty()
    ],
    userController.login
);

// endpoint for retrieving suggested users for the current user
router.get(
    "/suggestions",
    // auth middleware
    secureRoute,
    userController.getSuggestedUsers
);

module.exports = router;