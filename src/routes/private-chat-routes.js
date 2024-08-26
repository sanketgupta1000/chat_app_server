const express = require('express')

const privateChatController = require("../controllers/private-chat-controller");
const {check} = require("express-validator");

const router = express.Router();

router.post(
    "/send",
    [
        check("sender_id")
            .not()
            .isEmpty(),
        
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
