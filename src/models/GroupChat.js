const mongoose = require("mongoose");
const {Schema} = mongoose;

const Group_Chat_Schema = new Schema({
    group_id: {
        type: mongoose.ObjectId,
        ref: 'Group'
    },
    sender_id: {
        type: mongoose.ObjectId,
        ref: 'User'
    },
    sender_name: String,
    sent_date_time: Date,
    message: String
})

const Group_Chat = mongoose.model('Group_Chat', Group_Chat_Schema);

module.exports = {
    Group_Chat
}