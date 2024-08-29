const {User} = require("../models/User");
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
const getSuggestedUsers = async(req, res, next)=>
{
    try
    {

        const id = req.user._id;
        const validUserId = new mongoose.Types.ObjectId(String(id));

        // get the user
        const currentUser = req.user;
        
        // get the interests of the user
        const interestsOfUser = currentUser.interests;

        let suggestedUsers;
        try
        {
            suggestedUsers = await User.aggregate([
                {
                    // unwind on interests
                    $unwind: "$interests"
                },
                {
                    // filter on interests
                    $match:
                    {
                        // check id not same as the current user
                        _id: {$ne: validUserId},
                        // get users with at least one matching interest
                        interests: {$in: interestsOfUser}
                    }
                },
                {
                    $group:
                    {
                        // group by id
                        _id: "$_id",
                        // include the id field in the output documents
                        id: { $first: "$_id" },
                        // include other fields, since group removes all others
                        email: {$first: "$email"},
                        name: {$first: "$name"},
                        image_key: {$first: "$image_key"},
                        matching_interests: {$addToSet: "$interests"},
                        avg_rating: {$first: "$avg_rating"},
                        // calculate matching interests
                        countMatchingInterests: {$sum: 1}
                    }
                },
                {
                    // sort in decreasing order of countMatchingInterests
                    $sort: {countMatchingInterests: -1}
                }
            ]);
        }
        catch(err)
        {
            // error while fetching
            console.log(err);
            throw new HttpError("Cannot fetch necessary data. Pleasy try again later.", 500);
        }

        // send response
        res.status(200).json(
            {
                suggestedUsers
            }
        )

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
    getSuggestedUsers
}