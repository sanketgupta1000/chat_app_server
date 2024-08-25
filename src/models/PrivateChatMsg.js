const mongoose = require("mongoose");
const {Schema} = mongoose;

const PrivateChatMsgSchema = new Schema({

    private_chat_id: {
        type: mongoose.ObjectId,
        ref: 'PrivateChat'
    },

    sender_id: {
        type: mongoose.ObjectId,
        ref: 'User'
    },
    sent_date_time: Date,
    receiver_id: {
        type: mongoose.ObjectId,
        ref: 'User'
    },
    // ["delieverd", "seen"]
    status: String,
    status_time: Date,
    message: String
});

const PrivateChatMsg = mongoose.model('PrivateChatMsg', PrivateChatMsgSchema);

module.exports = {
    PrivateChatMsg
};