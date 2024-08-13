const {Schema, default: mongoose} = require("mongoose");

const interestSchema = new Schema(
    {
        name: String
    }
)

const Interest = mongoose.model('Interest', interestSchema);

module.exports = {
    Interest,
    interestSchema
};