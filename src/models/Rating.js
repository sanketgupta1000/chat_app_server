import mongoose  from "mongoose";
const {userSchema} = require('./User');
const {Schema} = mongoose;

const RatingSchema = new Schema({
    rater: userSchema,
    rated: userSchema,
    rating: Number
});

const Rating = mongoose.model('Rating', RatingSchema);

module.exports = {
    Rating,
    RatingSchema
}
