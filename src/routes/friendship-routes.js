const express = require("express");

const {check} = require("express-validator");

const friendshipController = require("../controllers/friendship-controller");
const { secureRoute } = require("../config/jwt-config");

const router = express.Router();

// adding auth middleware
router.use(secureRoute);

// endpoint to send a friendship request to another user
router.post(
    "/",
    [
        // sender id can be taken from req.user
        // receiver id must be there
        check("receiver_id")
            .not()
            .isEmpty(),
    ],
    friendshipController.sendFriendshipRequest
);

// endpoint to get all received friendship requests (unresponded) of the current user
router.get(
    "/received",
    // user id can be taken from req.user
    friendshipController.getReceivedFriendshipRequests
);

// endpoint to respond to a friendship request
router.patch(
    "/",
    [
        // user id can be taken from req.user
        // friendship request id, and response must
        check('friendship_request_id')
            .not()
            .isEmpty(),
        check('response')
            .isBoolean()
    ],
    friendshipController.respondToFriendshipRequest
);


module.exports = router;