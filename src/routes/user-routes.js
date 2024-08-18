const express = require("express");

const {check} = require("express-validator");

const userController = require("../controllers/user-controller");

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

// TODO: endpoint to generate and send jwt goes here

// endpoint for retrieving suggested users for the current user
// TODO: jwt integration 
router.get(
    "/suggestions",
    [
        // for now, user's id must be present
        check("id")
        .not()
        .isEmpty()
    ],
    userController.getSuggestedUsers
);

module.exports = router;