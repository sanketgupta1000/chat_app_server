const {FriendshipRequest} = require("../models/FriendshipRequest");
const HttpError = require("../models/HttpError");
const { validationResult } = require("express-validator");
const { default: mongoose } = require("mongoose");
const { User } = require("../models/User");
const { io } = require("../../app");
const { PrivateChat } = require("../models/PrivateChat");

// method to send friendship request
const sendFriendshipRequest = async(req, res, next)=>
{
    try
    {
        const errors = validationResult(req);
        if(!errors.isEmpty)
        {
            // invalid inputs
            throw new HttpError("Invalid inputs. Please try again.", 422);
        }

        // get the data from request body
        const { receiver_id} = req.body;

        // get sender id from req.user
        const sender_id = req.user._id;

        // get the sender
        const sender = req.user;

        // fetch the receiver
        let receiver;
        try
        {
            receiver = await User.findById(receiver_id);
        }
        catch(err)
        {
            // couldn't fetch
            console.log(err);
            throw new HttpError("Could not fetch necessary data. Please try again later.", 500);
        }

        if(!receiver)
        {
            // receiver not found
            throw new HttpError("Receiver not found.", 404);
        }

        // check if a friendship request already exists between the two
        let existingRequest;
        try
        {
            existingRequest = await FriendshipRequest.findOne({sender_id: sender_id, receiver_id: receiver_id});
        }
        catch(err)
        {
            // couldn't fetch
            console.log(err);
            throw new HttpError("Could not fetch necessary data. Please try again later.", 500);
        }

        if(existingRequest)
        {
            // request already exists
            throw new HttpError("Request already exists.", 409);
        }

        // now can create and save a new request

        // first, get matching interests
        let matchingInterests = sender.interests.filter(
            (i1)=>
                receiver.interests.some(
                    (i2)=>
                        (i1._id.equals(i2._id))
                )
            );

        const newRequest = new FriendshipRequest(
            {
                sender_id,
                sender_name: sender.name,
                sender_email: sender.email,
                receiver_id,
                receiver_name: receiver.name,
                receiver_email: receiver.email,
                status: "unresponded",
                matching_interests: matchingInterests,
                sender_avg_rating: sender.avg_rating
            }
        );

        // save it
        try
        {
            await newRequest.save();
        }
        catch(err)
        {
            console.log(err);
            throw new HttpError("Failed to send a friendship request. Please try again.", 500);
        }

        // emitting socket event on receiver
        io.to(`user:${receiver_id}`).emit("new friendship request", {
            request: newRequest.toObject({getters: true})
        });

        // send response
        res.status(201).json({request: newRequest.toObject({getters: true})});

    }
    catch(e)
    {
        console.log(e);
        return next(e);
    }
}

// method to get all received friendship requests (unresponded) of the current user
const getReceivedFriendshipRequests = async(req, res, next)=>
{
    try
    {

        // get the user id
        const id = req.user._id;

        // get the received and unresponded friendship requests
        let receivedFriendshipRequests;
        try
        {
            receivedFriendshipRequests = await FriendshipRequest.find({
                receiver_id: id,
                status: "unresponded"
            });
        }
        catch(err)
        {
            // failed to fetch
            console.log(err);
            throw new HttpError("Failed to fetch the friendship requests. Please try again later.", 500);
        }

        // found

        // send in response
        res.status(200)
            .json(
                {
                    requests: receivedFriendshipRequests.map((fr)=>
                    {
                        return fr.toObject({getters: true});
                    })
                }
            );

    }
    catch(e)
    {
        console.log(e);
        return next(e);
    }
}

// method to respond to a friendship request
const respondToFriendshipRequest = async(req, res, next)=>
{
    try
    {
        const errors = validationResult(req);

        if(!errors.isEmpty)
        {
            // not valid
            throw new HttpError("Invalid inputs. Please try again.", 422);
        }

        // get the data
        const { friendship_request_id, response} = req.body;

        // get user id
        const user_id = req.user._id;

        // find the corresponding request
        let request;
        try
        {
            request = await FriendshipRequest.findOne({
                _id: friendship_request_id,
                receiver_id: user_id,
                status: "unresponded"
            });
        }
        catch(err)
        {
            // failed to fetch
            console.log(err);
            throw new HttpError("Failed to fetch necessary data, please try again later.", 500);
        }

        if(!request)
        {
            // could not find the request
            throw new HttpError("Request not found.", 404);
        }

        // let's start a transaction now
        const session = await mongoose.startSession();

        let chat;

        try
        {

            await session.withTransaction(async ()=>
            {
                // respond
                if(response==false)
                {
                    // need to reject
                    request.status = "rejected";
                }
                else
                {
                    // need to accept
                    request.status = "accepted";
        
                    // need to create a private chat now
                    chat = new PrivateChat(
                        {
                            user1_id: request.sender_id,
                            user1_name: request.sender_name,
                            user2_id: request.receiver_id,
                            user2_name: request.receiver_name,
                            last_msg_sender_id: null,
                            last_msg: null
                        }
                    );
    
                    // save it
                    await chat.save();
        
                }
    
                // save the updated request
                await request.save();
            });
        }
        catch(err)
        {
            console.log(err);
            throw new HttpError("Failed to respond to request. Please try again later.", 500);
        }

        if(response==true)
        {
            // need to emit the private chat details to both of them
            io.to(`user:${request.sender_id}`).emit('new private chat', chat);
            io.to(`user:${request.receiver_id}`).emit('new private chat', chat);

        }

        res.status(200).end();

    }
    catch(e)
    {
        console.log(e);
        return next(e);
    }
}

module.exports = {
    sendFriendshipRequest,
    getReceivedFriendshipRequests,
    respondToFriendshipRequest
}