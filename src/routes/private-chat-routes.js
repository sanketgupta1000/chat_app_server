const express = require('express')

const privateChatController = require("../controllers/private-chat-controller");
const {check} = require("express-validator");
const { secureRoute } = require('../config/jwt-config');

const router = express.Router();

// auth middleware to all routes of this router
router.use(secureRoute);

// endpoint to send message
router.post(
    "/send",
    [
        // sender id can be taken from req.user
        check("private_chat_id")
            .not()
            .isEmpty(),

        check("message")
            .not()
            .isEmpty(),
    ],
    privateChatController.sendMessage
);

// endpoint to get messages for a private chat
router.get(
    "/",
    [
        // user id can be taken from req.user
        check("private_chat_id")
            .not()
            .isEmpty(),
        // offset and limit
        check("offset")
            .isInt({min: 0}),
        check("limit")
            .isInt({min:1})
    ],
    privateChatController.getMessages
);

module.exports = router;
