const express = require("express");

const {check} = require("express-validator");

const groupController = require("../controllers/group_controller");

const router = express.Router();

// endpoint to create a group
// TODO: jwt integration
router.post(
    "/",
    [
        // for now, group name, description and admin id, list of member ids must be there
        check("group_name")
            .not()
            .isEmpty(),
        
        check("group_description")
            .not()
            .isEmpty(),

        check("admin_id")
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
        // groupid, senderid, and message for now
        check("sender_id")
            .not()
            .isEmpty(),
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