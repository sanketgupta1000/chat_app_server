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
            io.to(`user:${member._id}`).emit("new group", newGroup);
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
        for(let member in group.members)
        {
            io.to(`user:${member._id}`).emit("new group message", newGroupChat);
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

module.exports = {
    createGroup,
    sendMessage
};