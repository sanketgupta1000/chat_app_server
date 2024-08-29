const express = require("express");

const {check} = require("express-validator");

const groupController = require("../controllers/group_controller");
const { secureRoute } = require("../config/jwt-config");

const router = express.Router();

// auth middleware on ll routes related to group
router.use(secureRoute);

// endpoint to create a group
router.post(
    "/",
    [
        // group name, description, and list of member ids must be there
        // admin id can be taken from req.user
        check("group_name")
            .not()
            .isEmpty(),
        
        check("group_description")
            .not()
            .isEmpty(),

        check("members")
            .isArray()
    ],
    groupController.createGroup
);

// endpoint to send message in group
router.post(
    "/send-message",
    [
        // sender id can be taken from req.user
        // groupid and message for now
        check("group_id")
            .not()
            .isEmpty(),
        check("message")
            .not()
            .isEmpty()
    ],
    groupController.sendMessage
);

// endpoint to get message of a group
router.get(
    "/",
    [
        check("group_id")
            .not()
            .isEmpty(),
        check("user_id")
            .not()
            .isEmpty(),
        check("offset")
            .isInt({min: 0}),
        check("limit")
            .isInt({min:1})
    ],
    groupController.getMessages
)
module.exports = router;