const {User} = require("../models/User");
const {Rating} = require("../models/Rating");
const {FriendshipRequest} = require("../models/FriendshipRequest");
const HttpError = require("../models/HttpError");
const { validationResult } = require("express-validator");
const { default: mongoose } = require("mongoose");
const { Interest } = require("../models/Interest");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { jwtDecodeOptions } = require("../config/jwt-config");

const SALT_ROUNDS = 12;

// to signup the user
const signup = async(req, res, next)=>
{
    try
    {
        // validating
        const errors = validationResult(req);
    
        if(!errors.isEmpty)
        {
            // not valid
            throw new HttpError("Invalid inputs, please try again.", 422);
        }
    
        // get the inputs
        const {email, name, image_key, description, password, interests} = req.body;

        // check if email is already taken
        let existingUser;
        try
        {
            existingUser = await User.findOne({email: email});
        }
        catch(err)
        {
            // error while connecting to db
            console.log(err);
            // throw another error with user readable message
            throw new HttpError("Cannot fetch necessary data. Please try again later.", 500);
        }

        if(existingUser)
        {
            // user exists
            throw new HttpError("Email already taken, please login.", 409);
        }

        // validate the interests
        
        // get an array of object id strings from array of objects of type: {"id": "..."}
        const selectedInterestIds = interests.map((i)=>(i.id));

        // log
        console.log(selectedInterestIds);

        // fetch interests from db
        let foundInterests = [];
        try
        {
            foundInterests = await Interest.find({_id: {$in: selectedInterestIds }});
        }
        catch(err)
        {
            // error in fetching
            console.log(err);
            throw new HttpError("Cannot fetch necessary data. Pleasy try again later.", 500);
        }

        if(foundInterests.length!=interests.length)
        {
            // some user specified interests do not exist in db
            throw new HttpError("Invalid interests given.", 422);
        }

        // console.log(foundInterests);

        // interests are valid

        // so now let's hash password
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // create user
        const createdUser = new User(
            {
                name,
                email,
                image_key,
                description,
                password: hashedPassword,
                interests: foundInterests,
                avg_rating: null,
                no_of_raters: 0
            }
        );

        // save
        try
        {
            await createdUser.save();
        }
        catch(err)
        {
            console.log(err);
            throw new HttpError("Failed to signup. Please try again.", 500);
        }

        // remove password field
        createdUser.password = undefined;

        // send response
        res.status(201).json({user: createdUser.toObject({getters: true})});

    }
    catch(e)
    {
        console.log(e);
        return next(e);
    }


}

// method to generate and send jwt
const login = async(req, res, next)=>
{
    try
    {
        // validating
        const errors = validationResult(req);
    
        if(!errors.isEmpty)
        {
            // not valid
            throw new HttpError("Invalid inputs, please try again.", 422);
        }

        // user credentials
        const {email, password} = req.body;

        // get the user from db
        let user;
        try
        {
            user = await User.findOne({email: email});
        }
        catch(err)
        {
            console.log(err);
            throw new HttpError("Failed to login. Please try again later", 500);
        }

        if(!user)
        {
            // user not found
            throw new HttpError("User not found. Please sign up", 404);
        }

        const match = await bcrypt.compare(password, user.password);

        if(match)
        {
            // generate jwt
            const token = jwt.sign(
                {
                    data: {
                        id: user._id,
                        email: user.email,
                        name: user.name
                    }
                },
                jwtDecodeOptions.secretOrKey,
                {
                    issuer: jwtDecodeOptions.issuer,
                    audience: jwtDecodeOptions.audience,
                    expiresIn: "12h",
                }
            );
        
            // send it
            res.json({token});
        }
        else
        {
            // not match
            throw new HttpError("Incorrect email or password", 401);
        }

    }
    catch(e)
    {
        console.log(e);
        return next(e);
    }
}


// method to get suggested users for the current user
const getSuggestedUsers = async(req, res, next) => {
    try {
        const id = req.user._id;
        const validUserId = new mongoose.Types.ObjectId(String(id));

        // get the interests of the current user
        const currentUser = req.user;
        const interestsOfUser = currentUser.interests;

        let suggestedUsers;
        try {
            suggestedUsers = await User.aggregate([
                {
                    // unwind interests array to match individual interests
                    $unwind: "$interests"
                },
                {
                    // match users who have at least one matching interest and are not the current user
                    $match: {
                        _id: { $ne: validUserId },
                        interests: { $in: interestsOfUser }
                    }
                },
                {
                    // lookup to check if there's a friendship request between the current user and the suggested user
                    $lookup: {
                        from: "friendshiprequests", // the collection for friendship requests
                        let: { currentUserId: validUserId, otherUserId: "$_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $or: [
                                            {
                                                $and: [
                                                    { $eq: ["$sender_id", "$$currentUserId"] },
                                                    { $eq: ["$receiver_id", "$$otherUserId"] }
                                                ]
                                            },
                                            {
                                                $and: [
                                                    { $eq: ["$sender_id", "$$otherUserId"] },
                                                    { $eq: ["$receiver_id", "$$currentUserId"] }
                                                ]
                                            }
                                        ]
                                    }
                                }
                            }
                        ],
                        as: "friendshipRequest"
                    }
                },
                {
                    // filter out users who already have a friendship or a pending friendship request
                    $match: {
                        "friendshipRequest.status": { $exists: false } // ensure no friendship exists
                    }
                },
                {
                    $group: {
                        _id: "$_id",
                        id: { $first: "$_id" },
                        email: { $first: "$email" },
                        name: { $first: "$name" },
                        image_key: { $first: "$image_key" },
                        matching_interests: { $addToSet: "$interests" },
                        avg_rating: { $first: "$avg_rating" },
                        countMatchingInterests: { $sum: 1 }
                    }
                },
                {
                    $sort: { countMatchingInterests: -1 } // sort by the number of matching interests
                }
            ]);
        } catch (err) {
            console.log(err);
            throw new HttpError("Cannot fetch necessary data. Please try again later.", 500);
        }

        // send the response
        res.status(200).json({ suggestedUsers });

    } catch (e) {
        console.log(e);
        return next(e);
    }
};


const getCurrentUser = async(req, res, next)=>
{
    try
    {

        // send user itself
        res.status(200)
        .json({
            currentUser: req.user.toObject({getters: true})
        });

    }
    catch(e)
    {
        console.log(e);
        return next(e);
    }
}

// method to get the user by id
const getUserById = async(req, res, next)=>
{
    try
    {

        // get the id
        const user_id = req.params.user_id;

        // get the user from db
        let user;
        try
        {
            user = await User.findById(user_id);
        }
        catch(err)
        {
            console.log(err);
            throw new HttpError("Failed to fetch user. Please try again later.", 500);
        }

        if(!user)
        {
            // user not found
            throw new HttpError("User not found.", 404);
        }

        // send user
        res.status(200).json({user: user.toObject({getters: true})});

    }
    catch(e)
    {
        console.log(e);
        return next(e);
    }
}

const rateUser = async(req,res,next) => 
{
    try
    {
        let {rating} = req.body;
        const rated_id = new mongoose.Types.ObjectId(String(req.params.user_id));
        const currentUserId = new mongoose.Types.ObjectId(String(req.user._id));

        rating = Number(rating);

        // rating should be between 1 to 5
        if (rating < 1 || rating > 5) {
            throw new HttpError("Invalid rating. Please provide a rating between 1 and 5.", 422);
        }

        let ratedUser;
        try
        {
            ratedUser = await User.findById(rated_id);
        }
        catch(err)
        {
            console.log(err);
            throw new HttpError("Failed to fetch user. Please try again later.", 500);
        }

        if(!ratedUser)
        {
            throw new HttpError("User not found.", 404);
        }

        // Rate only if there is an accepted friendship between the current user and the rated user
        let friendship;
        try
        {
            friendship = await FriendshipRequest.findOne(
                {
                    $or: [
                        { sender_id: currentUserId, receiver_id: rated_id, status: "accepted" },
                        { sender_id: rated_id, receiver_id: currentUserId, status: "accepted" },
                    ],
                }
            );
        }
        catch (err) 
        {
            console.log(err);
            throw new HttpError("Failed to verify friendship status.", 500);
        }

        if (!friendship) 
        {
            throw new HttpError("You can only rate users you are friends with.", 403);
        }

        let existingRating;
        try 
        {
            existingRating = await Rating.findOne(
            {
                rater: currentUserId,
                rated: rated_id,
            });
        } 
        catch (err)
        {
            console.log(err);
            throw new HttpError("Failed to check existing rating.", 500);
        }

        if (existingRating) 
        {
            existingRating.rating = rating;
            await existingRating.save();
        } 
        else 
        {
            const newRating = new Rating({
                rater: currentUserId,
                rated: rated_id,
                rating: rating,
            });
            await newRating.save();
        }
        
        const totalRatings = await Rating.aggregate(
            [
                { $match: { rated: ratedUser._id } },
                { $group: { _id: "$rated", avgRating: { $avg: "$rating" }, noOfRaters: { $sum: 1 } } },
            ]
        );


        if (totalRatings.length > 0)
        {
            if(ratedUser._id.equals(friendship.sender_id))
            {
                friendship.sender_avg_rating = totalRatings[0].avgRating;
                await friendship.save();
            }
            ratedUser.avg_rating = totalRatings[0].avgRating;
            ratedUser.no_of_raters = totalRatings[0].noOfRaters;
            await ratedUser.save();
        }
      
        res.status(200).json({ rated_user: ratedUser.toObject({ getters: true }) });

    }
    catch(e)
    {
        console.log(e);
        return next(e);
    }
}

module.exports = {
    signup,
    login,
    getSuggestedUsers,
    getCurrentUser,
    getUserById,
    rateUser
}