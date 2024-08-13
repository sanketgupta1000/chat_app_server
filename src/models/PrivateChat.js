const {Schema, default: mongoose} = require("mongoose");

const privateChatSchema = new Schema(
    {
        sender_id: {
            type: mongoose.ObjectId,
            ref: 'User'
        },

        sender_name: String,

        receiver_id: {
            type: mongoose.ObjectId,
            ref: 'User'
        },

        receiver_name: String,

        last_msg_sender_id: {
            type: mongoose.ObjectId,
            ref: 'User'
        },

        last_msg: String

    }
);

const PrivateChat = mongoose.model('PrivateChat', privateChatSchema);

module.exports={
    PrivateChat,
    privateChatSchema
};