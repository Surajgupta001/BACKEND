import mongoose from "mongoose";
import { Like } from "../models/like.model.js";
import { Video } from "../models/video.model.js";
import { Comment } from "../models/comment.model.js";
import { Tweet } from "../models/tweet.model.js"; // Added Tweet import
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video ID format");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }
     if (!video.isPublished) {
        throw new ApiError(403, "Cannot like an unpublished video");
    }

    const existingLike = await Like.findOne({ video: videoId, likedBy: userId });

    let likeStatus;
    let message;

    if (existingLike) {
        // User has already liked, so unlike it
        await Like.findByIdAndDelete(existingLike._id);
        likeStatus = false; // Or some other indicator that it was unliked
        message = "Video unliked successfully";
    } else {
        // User has not liked yet, so like it
        await Like.create({
            video: videoId,
            likedBy: userId,
        });
        likeStatus = true; // Or some other indicator that it was liked
        message = "Video liked successfully";
    }

    // Optionally, get the new like count for the video
    const likeCount = await Like.countDocuments({ video: videoId });

    return res.status(200).json(
        new ApiResponse(200, { videoId, liked: likeStatus, likeCount }, message)
    );
});

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
        throw new ApiError(400, "Invalid comment ID format");
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    const existingLike = await Like.findOne({ comment: commentId, likedBy: userId });

    let likeStatus;
    let message;

    if (existingLike) {
        await Like.findByIdAndDelete(existingLike._id);
        likeStatus = false;
        message = "Comment unliked successfully";
    } else {
        await Like.create({
            comment: commentId,
            likedBy: userId,
        });
        likeStatus = true;
        message = "Comment liked successfully";
    }

    const likeCount = await Like.countDocuments({ comment: commentId });

    return res.status(200).json(
        new ApiResponse(200, { commentId, liked: likeStatus, likeCount }, message)
    );
});

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID format");
    }

    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    const existingLike = await Like.findOne({ tweet: tweetId, likedBy: userId });

    let likeStatus;
    let message;

    if (existingLike) {
        await Like.findByIdAndDelete(existingLike._id);
        likeStatus = false;
        message = "Tweet unliked successfully";
    } else {
        await Like.create({
            tweet: tweetId,
            likedBy: userId,
        });
        likeStatus = true;
        message = "Tweet liked successfully";
    }

    const likeCount = await Like.countDocuments({ tweet: tweetId });

    return res.status(200).json(
        new ApiResponse(200, { tweetId, liked: likeStatus, likeCount }, message)
    );
});

const getLikedVideos = asyncHandler(async (req, res) => {
    const userId = req.user?._id;
    const { page = 1, limit = 10 } = req.query;

    const likedVideosAggregate = Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(userId),
                video: { $exists: true } // Ensure we are fetching likes for videos
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "videoDetails",
                pipeline: [
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
                                        fullName: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: { $first: "$ownerDetails" }
                        }
                    },
                    {
                        $project: { // Select fields from videoDetails
                            videoFile: 1,
                            thumbnail: 1,
                            title: 1,
                            description: 1,
                            duration: 1,
                            views: 1,
                            isPublished: 1,
                            owner: 1,
                            createdAt: 1,
                            updatedAt: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$videoDetails" // Deconstruct the videoDetails array
        },
        {
            $replaceRoot: { newRoot: "$videoDetails" } // Promote videoDetails to the root
        },
        {
            $sort: { createdAt: -1 } // Sort by newest liked videos (based on video's creation date)
        }
    ]);
    
    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        customLabels: {
            totalDocs: 'totalLikedVideos',
            docs: 'likedVideos'
        }
    };

    const likedVideos = await Like.aggregatePaginate(likedVideosAggregate, options);

    if (!likedVideos || likedVideos.likedVideos.length === 0 && parseInt(page, 10) > 1) {
        return res.status(200).json(new ApiResponse(200, { likedVideos: [], nextPage: null }, "No more liked videos found"));
    }

    if (!likedVideos || likedVideos.likedVideos.length === 0) {
        return res.status(200).json(new ApiResponse(200, [], "No liked videos found"));
    }

    return res.status(200).json(
        new ApiResponse(200, likedVideos, "Liked videos fetched successfully")
    );
});

export {
    toggleVideoLike,
    toggleCommentLike,
    toggleTweetLike,
    getLikedVideos
};