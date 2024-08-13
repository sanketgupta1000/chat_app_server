const {Schema, default: mongoose} = require("mongoose");
const {interestSchema} = require("./Interest");

const userSchema = new Schema(
    {
        email: String,
        name: String,
        image_key: String,
        description: String,
        password: String,
        interests: [interestSchema],
        avg_rating: Number,
        no_of_raters: Number
    }
)

// model
const User = mongoose.model('User', userSchema);

module.exports = {
    User,
    userSchema
};