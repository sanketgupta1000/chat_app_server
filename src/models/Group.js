import mongoose  from "mongoose";
const {userSchema} = require('./User');
const {Schema} = mongoose;

const GroupSchema = new Schema({
    group_name: String,
    group_description: String,
    admin_id: {
        type: mongoose.ObjectId,
        ref: 'User'
    },
    admin_name: String,
    members: [userSchema],
    last_msg_sender_id: {
        type: mongoose.ObjectId,
        ref: 'User'
    },
    last_msg: String
});

const Group = mongoose.model("Group", GroupSchema);

module.exports = {
    Group,
    GroupSchema
}