import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// This function is used to generate access and refresh tokens for a user
const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return {
            accessToken,
            refreshToken
        }
    }
    catch (error) {
        throw new ApiError(500, 'Something went wrong while generating refresh and access tokens');
    }
}

// This function is used to register a new user
const registerUser = asyncHandler(async (req, res) => {
    /*
    ========= Step for Registering a User =========
    1. Get user details from frontend 
    2. Validate - not empty, valid email, password length, etc.
    3. Check if user already exists: username or email
    4. Check for images, check for avatar
    5. Upload theme to cloudinary, avatar
    6. Create user object - create entry in db
    7. Remove password and refresh token field from response
    8. Check for user creation
    9. Return response
    */

    // 2. Validate - not empty, valid email, password length, etc.
    const {
        fullName,
        email,
        username,
        password
    } = req.body;
    // console.log('email', email);

    if (
        [fullName, email, username, password].some(
            (field) => field?.trim() === ''
        )
    ) {
        throw new ApiError(400, 'All fields are required');
    }

    // 3. Check if user already exists: username or email
    const existedUser = await User.findOne({
        $or: [
            { username: username.toLowerCase() },
            { email: email.toLowerCase() }
        ],
    });

    if (existedUser) {
        throw new ApiError(409, 'Username or email already exists');
    }
    // console.log(req.files);

    // 4. Check for images, check for avatar
    const avatarLocalPath = req?.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req?.files?.coverImage?.[0]?.path;

    // let coverImageLocalPath;
    // if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    //     coverImageLocalPath = req.files.coverImage[0].path;
    // }

    if (!avatarLocalPath) {
        throw new ApiError(400, 'Avatar is required');
    }

    // 5. Upload theme to cloudinary, avatar
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(500, 'Avatar file is required');
    }

    // 6. Create user object - create entry in db
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || '',
        email,
        password,
        username: username.toLowerCase(),
    });

    // 7. Remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select(
        '-password -refreshToken'
    )

    if (!createdUser) {
        throw new ApiError(500, 'User creation failed');
    }

    // 9. Return response
    return res.status(201).json({
        data: new ApiResponse(200, createdUser, 'User registered successfully')
    })
});

// This function is used to login a user
const loginUser = asyncHandler(async (req, res) => {

    /*
    req body -> data
    username or email
    find the user
    check password
    access and refresh token
    send cookies
    */ 

    const {email, username, password} = req.body;
    if(!(email || username)) {
        throw new ApiError(400, 'Email or username is required');
    }

    
    /*
    Here is an alternative of above code based on the logic discussed:
    if(!(email || username)) {
        throw new ApiError(400, 'Email or username is required');
    }
    */ 

    const user = await User.findOne({
        $or: [
            { username },
            { email }
        ]
    })

    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, 'Invalid password');
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select(
        '-password -refreshToken'
    );

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie('accessToken', accessToken, options)
    .cookie('refreshToken', refreshToken, options)
    .json({
        data: new ApiResponse(200,{
            user: loggedInUser,
            accessToken,
            refreshToken
        }, 'User logged in successfully')
    })
});

// This function is used to logout a user
const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user.id,{
          $unset:{
            refreshToken: 1 // Unset the refresh token field
          }  
        },{
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie('accessToken', options)
    .clearCookie('refreshToken', options)
    .json(new ApiError(200, {}, 'User logged Out'))
});

// This function is used to refresh the access token using the refresh token
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, 'Unauthorized request');
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );
    
        const user = User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401, 'Invalid refresh token');
        }
    
        if(incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, 'Refresh token expired or used');
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        return res
        .status(200)
        .cookie('accessToken', accessToken, options)
        .cookie('refreshToken', newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {accessToken, refreshToken: newRefreshToken},
                'Access token refreshed successfully'
            )
        )
    }
    catch (error) {
        throw new ApiError(401, error?.message || 'Invalid refresh token');
    }

});

// This function is used to change the current user's password
const changeCurrentPassword = asyncHandler(async (req, res) => {
    const {oldPassword, newPassword} = req.body;

    const user = await User.findById(req.user?._id);

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(400, 'Invalid old password');
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        {},
        'Password changed successfully'
    ));

});

// This function is used to get the current logged-in user
const getCurrentUser = asyncHandler(async (req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        req.user,
        'Current user fetched successfully'
    ));
});

// This function is used to update the account details of the current user
const updateAccountDetails = asyncHandler(async (req, res) => {
    const {fullName, email} = req.body;

    if(!fullName || !email){
        throw new ApiError(400, 'Full name and email are required');
    }

    const user = await User.findByIdAndUpdate (
        req.user?._id,
        {$set: {
            fullName,
            email
        } },
        {new:true}
    ).select('-password')

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        user,
        'Account details updated successfully'
    ));

});


const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, 'Avatar file is missing');   
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar.url) {
        throw new ApiError(400, 'Error while uploading on avatar');
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        { $set: {
            avatar: avatar.url 
        } },
        { new: true }
    ).select('-password');

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        user,
        'Avatar updated successfully'
    ));

});

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath) {
        throw new ApiError(400, 'Cover image file is missing');
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!coverImage.url) {
        throw new ApiError(400, 'Error while uploading cover image');
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        { $set: {
            coverImage: coverImage.url
        } },
        { new: true }
    ).select('-password');

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        user,
        'Cover image updated successfully'
    ));

});

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;

    if (!username?.trim()) {
        throw new ApiError(400, 'Username is required');
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username.toLowerCase()
            }
        },
        {
            $lookup: {
                from: 'subscriptions',
                localField: '_id',
                foreignField: 'channel',
                as: 'subscribers'
            }
        },
        {
            $lookup: {
                from: 'subscriptions',
                localField: '_id',
                foreignField: 'subscriber',
                as: 'subscribedTo'
            }
        },
        {
            $addFields: {
                subscriberCount: { 
                    $size: '$subscribers' 
                },
                ChannelsSubscribedToCount: { 
                    $size: '$subscribedTo' 
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, '$subscribers.subscriber']},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                _id: 1,
                fullName: 1,
                email: 1,
                username: 1,
                avatar: 1,
                coverImage: 1,
                subscriberCount: 1,
                ChannelsSubscribedToCount: 1,
                isSubscribed: 1
            }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(404, 'Channel not found');
    }

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        channel[0],
        'Channel profile fetched successfully'
    ));
});

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: 'videos',
                localField: 'watchHistory',
                foreignField: '_id',
                as: 'watchHistory',
                pipeline: [
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'owner',
                            foreignField: '_id',
                            as: 'owner',
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: '$owner'
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            'Watch history fetched successfully'
        )
    )
});



export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
};