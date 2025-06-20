import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js"; // Added Video import
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video ID format");
    }

    // We need the Video model to verify if the video exists, though it's not directly used for comments query here
    // import {Video} from "../models/video.model.js" // Make sure this is imported at the top
    // const video = await Video.findById(videoId);
    // if (!video) {
    //     throw new ApiError(404, "Video not found");
    // }


    const commentAggregate = Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId),
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
                foreignField: "comment",
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
                createdAt: 1,
                owner: 1,
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
            totalDocs: 'totalComments',
            docs: 'comments',
        },
    };

    const comments = await Comment.aggregatePaginate(commentAggregate, options);

    if (!comments || comments.comments.length === 0 && parseInt(page, 10) > 1) {
         return res.status(200).json(new ApiResponse(200, { comments: [], nextPage: null }, "No more comments found for this video"));
    }
    
    if (!comments || comments.comments.length === 0) {
        return res.status(200).json(new ApiResponse(200, [], "No comments found for this video"));
    }

    return res.status(200).json(
        new ApiResponse(200, comments, "Comments fetched successfully")
    );
});

const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { content } = req.body;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video ID format");
    }

    if (!content || content.trim() === "") {
        throw new ApiError(400, "Comment content cannot be empty");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found, cannot add comment");
    }
    // Ensure video is published before allowing comments, or remove if not needed
    if (!video.isPublished) {
        throw new ApiError(403, "Cannot comment on an unpublished video");
    }


    const comment = await Comment.create({
        content,
        video: videoId,
        owner: req.user?._id,
    });

    if (!comment) {
        throw new ApiError(500, "Something went wrong while adding the comment");
    }

    // Optionally, you can populate owner details here before sending the response
    const createdComment = await Comment.findById(comment._id).populate("owner", "username avatar fullName");

    return res.status(201).json(
        new ApiResponse(201, createdComment, "Comment added successfully")
    );
});

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
        throw new ApiError(400, "Invalid comment ID format");
    }

    if (!content || content.trim() === "") {
        throw new ApiError(400, "Comment content cannot be empty");
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    if (comment.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this comment");
    }

    comment.content = content;
    const updatedComment = await comment.save({ validateBeforeSave: true });

    if (!updatedComment) {
        throw new ApiError(500, "Something went wrong while updating the comment");
    }
    
    const populatedComment = await Comment.findById(updatedComment._id).populate("owner", "username avatar fullName");


    return res.status(200).json(
        new ApiResponse(200, populatedComment, "Comment updated successfully")
    );
});

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
        throw new ApiError(400, "Invalid comment ID format");
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    if (comment.owner.toString() !== req.user?._id.toString()) {
        // Also allow video owner to delete comments on their video
        const videoOfComment = await Video.findById(comment.video);
        if (!videoOfComment || videoOfComment.owner.toString() !== req.user?._id.toString()){
            throw new ApiError(403, "You are not authorized to delete this comment");
        }
    }

    const deletionResult = await Comment.findByIdAndDelete(commentId);

    if (!deletionResult) {
        throw new ApiError(500, "Something went wrong while deleting the comment");
    }

    // Also delete associated likes for this comment
    // await Like.deleteMany({ comment: commentId }); // Assuming you have a Like model

    return res.status(200).json(
        new ApiResponse(200, { commentId }, "Comment deleted successfully")
    );
});

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
};