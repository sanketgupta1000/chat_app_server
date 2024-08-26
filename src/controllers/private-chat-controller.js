const HttpError = require("../models/HttpError");
const { validationResult } = require("express-validator");
const { default: mongoose } = require("mongoose");
const { User } = require("../models/User");
const {PrivateChat} = require("../models/PrivateChat");
const {PrivateChatMsg} = require("../models/PrivateChatMsg");
const { io } = require("../../app");



const sendMessage = async(req,res,next) =>
{
    try
    {

        const errors = validationResult(req);
        if(!errors.isEmpty)
        {
            // invalid inputs
            throw new HttpError("Invalid inputs. Please try again.", 422);
        }

        const {sender_id, message, private_chat_id} = req.body;
        let private_chat;
        try
        {
            private_chat = await PrivateChat.findOne(
                {
                    $or : [{user1_id: sender_id},{user2_id: sender_id}],
                    _id: private_chat_id,
                }
            );
        }
        catch(e)
        {
            throw new HttpError("Unable to fetch require details.", 500);
        }

        if(!private_chat){
            throw new HttpError("Private Chat not found", 404);
        }

        try
        {
            // determining whether which user is receiver 
            let receiver_id;
            if(sender_id == private_chat.user1_id)
            {
                receiver_id = private_chat.user2_id;
            }
            else
            {
                receiver_id = private_chat.user1_id;
            }
            const privateChatMsg = new PrivateChatMsg({
                sender_id,
                sent_date_time: new Date(),
                receiver_id: receiver_id,
                status: "delivered",
                status_time: new Date(),
                message,
                private_chat_id
            });

            await privateChatMsg.save();

            const privateChatRoomName = `private:${private_chat._id}`;
            io.to(privateChatRoomName).emit('new private msg', privateChatMsg);

            res.status(201).json({message: privateChatMsg.toObject({getters: true})});

        }
        catch(e)
        {
            throw new HttpError("Unable to send message", 500);
        }
    }
    catch(e)
    {
        console.log(e);
        return next(e);
    }
}


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
                            $or: [{receiver_id: new mongoose.Types.ObjectId(String(user_id))}, {sender_id: new mongoose.Types.ObjectId(String(user_id))}],
                            private_chat_id: new mongoose.Types.ObjectId(String(private_chat_id))
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
    sendMessage,
    getMessages
}
