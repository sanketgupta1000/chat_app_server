const {Schema, default: mongoose} = require("mongoose");


const RatingSchema = new Schema({
    rater: {
        type: mongoose.ObjectId,
        ref: 'User'
    },
    rated: {
        type: mongoose.ObjectId,
        ref: 'User'
    },
    rating: Number
});

const Rating = mongoose.model('Rating', RatingSchema);

module.exports = {
    Rating,
    RatingSchema
}
