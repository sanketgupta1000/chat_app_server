const {Schema, default: mongoose} = require("mongoose")
const { interestSchema } = require("./Interest")

const friendshipRequestSchema = new Schema(
    {
        sender_id: {
            type: mongoose.ObjectId,
            ref: 'User'
        },

        sender_name: String,

        sender_email: String,

        receiver_id: {
            type: mongoose.ObjectId,
            ref: 'User'
        },

        receiver_name: String,

        receiver_email: String,

        // "accepted", "rejected", or "unresponded"
        status: String,

        matching_interests: [interestSchema],

        sender_avg_rating: Number
        
    }
);

const FriendshipRequest = mongoose.model('FriendshipRequest', friendshipRequestSchema);

module.exports = {
    FriendshipRequest,
    friendshipRequestSchema
};