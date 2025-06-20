import mongoose from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body;

    if (!content || content.trim() === "") {
        throw new ApiError(400, "Tweet content cannot be empty");
    }

    const tweet = await Tweet.create({
        content,
        owner: req.user?._id,
    });

    if (!tweet) {
        throw new ApiError(500, "Something went wrong while creating the tweet");
    }

    return res.status(201).json(
        new ApiResponse(201, tweet, "Tweet created successfully")
    );
});

const getUserTweets = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid user ID format");
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const tweetAggregate = Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            avatar: 1,
                            fullName: 1,
                        },
                    },
                ],
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "likes",
            },
        },
        {
            $addFields: {
                owner: { $first: "$ownerDetails" },
                likeCount: { $size: "$likes" },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$likes.likedBy"] },
                        then: true,
                        else: false,
                    },
                },
            },
        },
        {
            $project: {
                content: 1,
                owner: 1,
                createdAt: 1,
                likeCount: 1,
                isLiked: 1,
            }
        },
        {
            $sort: { createdAt: -1 } // Sort by newest first
        }
    ]);

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        customLabels: {
            totalDocs: 'totalTweets',
            docs: 'tweets',
        },
    };

    const tweets = await Tweet.aggregatePaginate(tweetAggregate, options);
    
    if (!tweets || tweets.tweets.length === 0 && parseInt(page, 10) > 1) {
        return res.status(200).json(new ApiResponse(200, { tweets: [], nextPage: null }, "No more tweets found for this user"));
    }

    if (!tweets || tweets.tweets.length === 0) {
        return res.status(200).json(new ApiResponse(200, [], "User has not tweeted yet"));
    }

    return res.status(200).json(
        new ApiResponse(200, tweets, "User tweets fetched successfully")
    );
});

const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const { content } = req.body;

    if (!mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID format");
    }

    if (!content || content.trim() === "") {
        throw new ApiError(400, "Tweet content cannot be empty");
    }

    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    if (tweet.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this tweet");
    }

    tweet.content = content;
    const updatedTweet = await tweet.save({ validateBeforeSave: true });

    if (!updatedTweet) {
        throw new ApiError(500, "Something went wrong while updating the tweet");
    }

    return res.status(200).json(
        new ApiResponse(200, updatedTweet, "Tweet updated successfully")
    );
});

const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID format");
    }

    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    if (tweet.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this tweet");
    }

    const deletionResult = await Tweet.findByIdAndDelete(tweetId);

    if (!deletionResult) {
        throw new ApiError(500, "Something went wrong while deleting the tweet");
    }

    // Also delete associated likes for this tweet
    // await Like.deleteMany({ tweet: tweetId }); // Assuming you have a Like model and it references tweets

    return res.status(200).json(
        new ApiResponse(200, { tweetId }, "Tweet deleted successfully")
    );
});

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
};