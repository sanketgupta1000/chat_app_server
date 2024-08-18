// importing model
const {Interest} = require("../models/Interest");
const HttpError = require("../models/HttpError");

const getAllInterests = async(req, res, next)=>
{
    try
    {
        const interests = await Interest.find();
        
        res.json(
            {
                interests: interests.map((i)=>
                    i.toObject({getters:true})
                )
            }
        );

    }
    catch(e)
    {
        console.log(e);
        // error occurred while fetching
        return next(new HttpError("Could not get the interests from database.", 500));
    }
}

// export
module.exports = {
    getAllInterests,
}