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

module.exports = router;