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
        const {group_name, group_description, admin_id, members} = req.body;

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
        console.log("validMemberIds: "+validMemberIds);
        console.log("friendsOfAdmin: "+friendsOfAdmin);
        if(friendsOfAdmin.length!=validMemberIds.length)
        {
            //invalid friends given
            throw new HttpError("Some users are not your friends, cannot proceed to create group.", 422);
        }

        // get the admin
        let admin;

        try
        {
            admin = await User.findById(admin_id);
        }
        catch(err)
        {
            console.log(err);
            throw new HttpError("Failed to fetch necessary data. Please try again later.", 500);
        }

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

        // now let's put all of them in one room and emit the details of group there
        const groupRoomName = `group:${newGroup._id}`;
        const admin_sockets = await io.in(`user:${admin_id}`).allSockets();
        admin_sockets.forEach((s)=>s.join(groupRoomName));

        for(let memberId of validMemberIds)
        {
            const memberSockets = await io.in(`user:${memberId}`).allSockets();
            memberSockets.forEach((s)=>s.join(groupRoomName));
        }

        // emit group details
        io.to(groupRoomName).emit('new group', newGroup);

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
        const {sender_id, group_id, message} = req.body;

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

        // let's find the sender's name
        let senderName;
        for(member of group.members)
        {
            if(member._id==sender_id)
            {
                senderName = member.name;
                break;
            }
        }

        // let's create group chat object
        let newGroupChat;
        try
        {
            newGroupChat = new Group_Chat({
                group_id: validGroupId,
                sender_id: validSenderId,
                sender_name: senderName,
                sent_date_time: new Date(),
                message: message
            });

            await newGroupChat.save();
        }
        catch(err)
        {
            console.log(err);
            throw new HttpError("Failed to send message. Please try again later", 500);
        }

        // emit the new group chat to the room of group
        io.to(`group:${group_id}`).emit("new group chat", newGroupChat);

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