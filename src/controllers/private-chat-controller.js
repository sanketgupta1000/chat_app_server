const HttpError = require("../models/HttpError");
const {validationResult} = require("express-validator");
const {io} = require("../../app");
const {PrivateChatMsg} = require("../models/PrivateChatMsg");

// method to get private chat messages
const getMessages = async(req, res, next)=>
{
    try
    {

        const errors = validationResult(req);
        if(!errors.isEmpty)
        {
            // invalid inputs
            throw new HttpError("Invalid inputs. Please try again.", 422);
        }

        // fetch data
        const {user_id, private_chat_id, limit, offset} = req.body;

        // fetch messages
        let messages = [];

        try
        {
            messages = await PrivateChatMsg.aggregate(
                [
                    {
                        // getting messages
                        $match: {
                            private_chat_id: private_chat_id,
                            $or: [{sender_id: user_id}, {receiver_id: user_id}]
                        }
                    },
                    {
                        // sorting in descending order
                        $sort: {
                            sent_date_time: -1
                        }
                    },
                    // offsetting and limiting
                    {
                        $skip: offset
                    },
                    {
                        $limit: limit
                    },
                    {
                        $project: {
                            _id: false,
                            id: "$_id"
                        }
                    }
                ]
            );
        }
        catch(err)
        {
            console.log(err);
            throw new HttpError("Failed to fetch messages. Please try again later.", 500);
        }

        // send response;
        return res.status(200)
        .json(
            {
                messages
            }
        );

    }
    catch(e)
    {
        console.log(e);
        return next(e);
    }
}

module.exports = {
    getMessages
};