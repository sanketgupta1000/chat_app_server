const HttpError = require("../models/HttpError");
const { validationResult } = require("express-validator");
const { default: mongoose } = require("mongoose");
const { User } = require("../models/User");
const {PrivateChat} = require("../models/PrivateChat");
const {PrivateChatMsg} = require("../models/PrivateChatMsg");
const { io } = require("../../app");


// method to send message
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

        const { message, private_chat_id} = req.body;

        // get sender id
        const sender_id = req.user._id

        const validSenderId = new mongoose.Types.ObjectId(String(sender_id));

        let private_chat;
        try
        {
            private_chat = await PrivateChat.findOne(
                {
                    $or : [{user1_id: validSenderId},{user2_id: validSenderId}],
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

        // determining whether which user is receiver 
        let receiver_id;
        if(sender_id.toString() == private_chat.user1_id.toString())
        {
            receiver_id = private_chat.user2_id;
        }
        else
        {
            receiver_id = private_chat.user1_id;
        }

        // let's start a transaction
        const session = await mongoose.startSession();
        let privateChatMsg;
        try
        {

            await session.withTransaction(async()=>
            {
                // create chat message and save it
                privateChatMsg = new PrivateChatMsg({
                    sender_id,
                    sent_date_time: new Date(),
                    receiver_id: receiver_id,
                    status: "delivered",
                    status_time: new Date(),
                    message,
                    private_chat_id
                });
    
                await privateChatMsg.save();

                // update last message in privatge chat
                private_chat.last_msg = message;
                private_chat.last_msg_sender_id = sender_id

                await private_chat.save();

            });
 
        }
        catch(e)
        {
            throw new HttpError("Unable to send message", 500);
        }

        // emit the new message to both of them
        io.to(`user:${sender_id}`).emit("new private chat message", privateChatMsg);
        io.to(`user:${receiver_id}`).emit("new private chat message", privateChatMsg);

        res.status(201).json({message: privateChatMsg.toObject({getters: true})});
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
        const { private_chat_id, limit, offset} = req.body;

        const user_id = req.user._id;

        // fetch messages
        let messages = [];
console.log(user_id)
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
                            id: "$_id",
                            private_chat_id: "$private_chat_id",
                            sender_id: "$sender_id",
                            sent_date_time: "$sent_date_time",
                            receiver_id: "$receiver_id",
                            status: "$status",
                            status_time: "$status_time",
                            message: "$message"
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
