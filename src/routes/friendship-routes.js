const express = require("express");

const {check} = require("express-validator");

const friendshipController = require("../controllers/friendship-controller");

const router = express.Router();

// endpoint to send a friendship request to another user
// TODO: jwt integration
router.post(
    "/",
    [
        // for now, sender and receiver ids must be there
        check("sender_id")
            .not()
            .isEmpty(),
        
        check("receiver_id")
            .not()
            .isEmpty(),
    ],
    friendshipController.sendFriendshipRequest
);

// endpoint to get all received friendship requests (unresponded) of the current user
// TODO: jwt integration
router.get(
    "/received",
    [
        // user id is must for mow
        check("id")
            .not()
            .isEmpty()
    ],
    friendshipController.getReceivedFriendshipRequests
);

// endpoint to respond to a friendship request
// TODO:jwt integration
router.patch(
    "/",
    [
        // for now, user id, friendship request id, and response must
        check('user_id')
            .not()
            .isEmpty(),
        check('friendship_request_id')
            .not()
            .isEmpty(),
        check('response')
            .isBoolean()
    ],
    friendshipController.respondToFriendshipRequest
);


module.exports = router;