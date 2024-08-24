const express = require("express");

const {check} = require("express-validator");

const privateChatController = require("../controllers/private-chat-controller");

const router = express.Router();

// endpoint to get messages for a private chat
router.use(
    "/",
    [
        // user id and private chat id must for now
        check("user_id")
            .not()
            .isEmpty(),
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