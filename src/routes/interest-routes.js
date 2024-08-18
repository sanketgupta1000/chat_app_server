const express = require("express");

const interestController = require("../controllers/interest-controller");

const router = express.Router();

router.get("/", interestController.getAllInterests);

// default exporting the router
module.exports = router