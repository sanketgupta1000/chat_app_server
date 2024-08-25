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
        
        check("receiver_id")
            .not()
            .isEmpty(),

        check("message")
            .not()
            .isEmpty(),
    ],
    privateChatController.sendMessage
)  