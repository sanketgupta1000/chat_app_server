const {Schema, default: mongoose} = require("mongoose");

const privateChatSchema = new Schema(
    {
        user1_id: {
            type: mongoose.ObjectId,
            ref: 'User'
        },

        user1_name: String,

        user2_id: {
            type: mongoose.ObjectId,
            ref: 'User'
        },

        user2_name: String,

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