const {Group} = require("../models/Group");
const HttpError = require("../models/HttpError");
const { validationResult } = require("express-validator");
const { default: mongoose } = require("mongoose");
const { User } = require("../models/User");
const { io } = require("../../app");
const { PrivateChat } = require("../models/PrivateChat");
const {Group_Chat} = require("../models/GroupChat");

// method to create a group
const createGroup = async(req, res, next)=>
{
    try
    {

        const errors = validationResult(req);
        if(!errors.isEmpty)
        {
            // invalid inputs
            throw new HttpError("Invalid inputs. Please try again.", 422);
        }

        // get the data from req body
        const {group_name, group_description, members} = req.body;

        // admin id
        const admin_id = req.user._id;

        // check if all the members are friends of admin or not
        
        // first, get object ids
        const validAdminId = new mongoose.Types.ObjectId(String(admin_id));
        const validMemberIds = members.map((member)=>
        {
            return new mongoose.Types.ObjectId(String(member));
        });

        let friendsOfAdmin = [];

        try
        {
            friendsOfAdmin = await PrivateChat.find(
                {
                    $or: [
                        {
                            user1_id: validAdminId,
                            user2_id: {$in: validMemberIds}
                        },
                        {
                            user1_id: {$in: validMemberIds},
                            user2_id: validAdminId
                        },
                    ]
                }
            );

        }
        catch(err)
        {
            console.log(err);
            throw new HttpError("Failed to fetch necessary data. Please try again later.", 500);
        }
        // console.log("validMemberIds: "+validMemberIds);
        // console.log("friendsOfAdmin: "+friendsOfAdmin);
        if(friendsOfAdmin.length!=validMemberIds.length)
        {
            //invalid friends given
            throw new HttpError("Some users are not your friends, cannot proceed to create group.", 422);
        }

        // get the admin
        let admin = req.user;

        // get all the members
        let groupMembers = [];
        try
        {
            groupMembers = await User.find(
                {
                    _id: {$in: validMemberIds}
                }
            );
        }
        catch(err)
        {
            console.log(err);
            throw new HttpError("Failed to fetch necessary data. please try again later.", 500);
        }

        groupMembers.unshift(admin);

        // create group now
        let newGroup;
        try
        {
            newGroup = new Group(
                {
                    group_name: group_name,
                    group_description: group_description,
                    admin_id: admin_id,
                    admin_name: admin.name,
                    members: groupMembers,
                    last_msg_sender_id: null,
                    last_msg: null
                }
            );

            await newGroup.save();
        }
        catch(err)
        {
            console.log(err);
            throw new HttpError("Failed to create group. Please try again later", 500);
        }

        // need to emit group details to all of members
        
        for(let member of groupMembers)
        {
            if(!(member._id.equals(validAdminId)))
            {
                // send to all except admin/creator
                io.to(`user:${member._id}`).emit("new group", newGroup.toObject({getters: true}));
            }
        }

        // send response
        res.status(201).json(
            {
                group: newGroup.toObject({getters: true})
            }
        );

    }
    catch(e)
    {
        console.log(e);
        return next(e);
    }
}

// method to get all groups of a user
const getGroups = async(req, res, next)=>
{
    try
    {
        const user_id = req.user._id;

        const validUserId = new mongoose.Types.ObjectId(String(user_id));

        let groups = [];

        try
        {
            groups = await Group.find(
                {
                    'members._id': validUserId
                }
            );
        }
        catch(err)
        {
            console.log(err);
            throw new HttpError("Failed to fetch necessary data. Please try again later.", 500);
        }

        res.status(200).json(
            {
                groups: groups.map((group)=>
                {
                    return group.toObject({getters: true});
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

// method to send message in a group
const sendMessage = async(req, res, next)=>
{
    try
    {
        const errors = validationResult(req);
        if(!errors.isEmpty)
        {
            // invalid inputs
            throw new HttpError("Invalid inputs. Please try again.", 422);
        }

        // get the data
        const { group_id, message} = req.body;

        // get sender id
        const sender_id = req.user._id;

        const validSenderId = new mongoose.Types.ObjectId(String(sender_id));
        const validGroupId = new mongoose.Types.ObjectId(String(group_id));

        // check if sender is in group or not
        let group;
        try
        {
            group = await Group.findOne({
                _id: validGroupId,
                'members._id': validSenderId
            });
        }
        catch(err)
        {
            console.log(err);
            throw new HttpError("Failed to fetch necessary data. please try again later.", 500);
        }

        if(!group)
        {
            // group not found
            throw new HttpError("Group not found", 404);
        }

        // get the sender's name
        let senderName = req.user.name

        // let's create group chat object
        let newGroupChat;

        // let's start transaction
        const session = await mongoose.startSession();

        try
        {

            await session.withTransaction(async()=>
            {
                // first create group chat and save
                newGroupChat = new Group_Chat({
                    group_id: validGroupId,
                    sender_id: validSenderId,
                    sender_name: senderName,
                    sent_date_time: new Date(),
                    message: message
                });
    
                await newGroupChat.save();

                // now update last message in group
                group.last_msg = message;
                group.last_msg_sender_id = validSenderId;
                // save it
                await group.save();

            });

        }
        catch(err)
        {
            console.log(err);
            throw new HttpError("Failed to send message. Please try again later", 500);
        }

        // emit the new group chat to all members of group
        for(let member of group.members)
        {
            if(!member._id.equals(validSenderId))
                io.to(`user:${member._id}`).emit("new group message", newGroupChat.toObject({getters: true}));
        }

        res.status(201)
            .json({
                group_chat: newGroupChat.toObject({getters: true})
            });

    }
    catch(e)
    {
        console.log(e);
        return next(e);
    }
}

const getMessages = async(req,res,next) => {
    try
    {
        const errors = validationResult(req);
        if(!errors.isEmpty)
        {
            // invalid inputs
            throw new HttpError("Invalid inputs. Please try again.", 422);
        }

        // get the request body
        // const {group_id, limit, offset} = req.body;
        const group_id = req.params.group_id;
        const {limit, offset} = req.query;
        const user_id = req.user._id;

        const validUserId = new mongoose.Types.ObjectId(String(user_id));
        const validGroupId = new mongoose.Types.ObjectId(String(group_id));

        let group;
        try
        {
            group = await Group.find({
                _id: validGroupId,
                'members._id': validUserId
            });
        }
        catch(err)
        {
            console.log(err);
            throw new HttpError("Failed to fetch necessary data, please try later.", 500);
        }

        if(!group)
        {
            throw new HttpError("Group not found", 404);
        }

        let messages = [];

        try
        {
            console.log("1");
            messages = await Group_Chat.aggregate(
                [
                    {
                        // getting the messages
                        $match: {                  
                            group_id: validGroupId
                        }
                    },
                    {
                        // sorting in descending order
                        $sort: {
                            sent_date_time: -1
                        }
                    },
                    {
                        $skip: Number(offset)
                    },
                    {
                        $limit: Number(limit)
                    },
                    {
                        $project: {
                            _id: false,
                            id: "$_id",
                            group_id: "$group_id",
                            sender_id: "$sender_id",
                            sender_name: "$sender_name",
                            sent_date_time: "$sent_date_time",
                            message: "$message"
                        }
                    }
                ]
            )
            console.log(messages);
        }
        catch(e)
        {
            console.log(e);
            throw new HttpError("Failed to fetch messages. Please try again later.", 500);
        }
        
        // send messages to response
        return res.status(200).json( { messages } );
    }
    catch(e)
    {
        console.log(e);
        return next(e);
    }
}

module.exports = {
    createGroup,
    getGroups,
    sendMessage,
    getMessages
};