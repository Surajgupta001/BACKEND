import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Video } from '../models/video.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import mongoose from 'mongoose';

const getAllVideos = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        query, // For searching by title/description
        sortBy = 'createdAt', // Field to sort by (e.g., views, createdAt, duration)
        sortType = 'desc', // Sort order: 'asc' or 'desc'
        userId // To filter videos by a specific user (owner)
    } = req.query;

    const pipeline = [];

    // Match videos that are published
    pipeline.push({ $match: { isPublished: true } });

    // Match based on search query (if provided)
    // This searches in title and description fields
    if (query) {
        pipeline.push({
            $match: {
                $or: [
                    { title: { $regex: query, $options: 'i' } }, // Case-insensitive search
                    { description: { $regex: query, $options: 'i' } }
                ]
            }
        });
    }

    // Match based on userId (if provided)
    // This filters videos by a specific owner
    if (userId) {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new ApiError(400, "Invalid userId format");
        }
        pipeline.push({ $match: { owner: new mongoose.Types.ObjectId(userId) } });
    }

    // Lookup owner details
    pipeline.push({
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
    });
    
    // Lookup likes for each video
    pipeline.push({
        $lookup: {
            from: "likes",
            localField: "_id",
            foreignField: "video",
            as: "likes"
        }
    });

    // Add fields for owner (unwind) and likeCount
    pipeline.push({
        $addFields: {
            owner: { $first: "$ownerDetails" },
            likeCount: { $size: "$likes" }
        }
    });
    
    // Project the desired fields for the final output
    pipeline.push({
        $project: {
            videoFile: 1,
            thumbnail: 1,
            title: 1,
            description: 1,
            duration: 1,
            views: 1,
            isPublished: 1,
            owner: 1, // Contains username, avatar, fullName
            createdAt: 1,
            updatedAt: 1,
            likeCount: 1
        }
    });


    // Add sorting stage
    const sortCriteria = {};
    if (sortBy && sortType) {
        sortCriteria[sortBy] = sortType === 'asc' ? 1 : -1;
        pipeline.push({ $sort: sortCriteria });
    }
    else {
        // Default sort by createdAt if not specified
        pipeline.push({ $sort: { createdAt: -1 } });
    }

    const videoAggregate = Video.aggregate(pipeline);

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        customLabels: { // Optional: customize labels for pagination results
            totalDocs: 'totalVideos',
            docs: 'videos',
        }
    };

    const videos = await Video.aggregatePaginate(videoAggregate, options);

    if (!videos || videos.videos.length === 0 && parseInt(page, 10) > 1) {
        // If page is > 1 and no videos, it means user requested a page that doesn't exist
        return res
        .status(200)
        .json(new ApiResponse(
                200, 
                { 
                    videos: [], 
                    nextPage: null
                },
                "No more videos found"
            )
        );
    }
    
    if (!videos || videos.videos.length === 0) {
        return res
        .status(200)
        .json(new ApiResponse(
            200, 
            [], 
            "No videos found matching your criteria"
        ));
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200, 
            videos, 
            "Videos fetched successfully"
        )
    );
});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;

    if (!title || title.trim() === "") {
        throw new ApiError(400, "Title is required");
    }
    if (!description || description.trim() === "") {
        throw new ApiError(400, "Description is required");
    }

    const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

    if (!videoFileLocalPath) {
        throw new ApiError(400, "Video file is required");
    }
    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail file is required");
    }

    const videoFile = await uploadOnCloudinary(videoFileLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!videoFile || !videoFile.url) {
        throw new ApiError(500, "Error uploading video file to Cloudinary");
    }
    if (!thumbnail || !thumbnail.url) {
        throw new ApiError(500, "Error uploading thumbnail to Cloudinary");
    }

    const video = await Video.create({
        title,
        description,
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        duration: videoFile.duration, // Assuming cloudinary returns duration
        owner: req.user?._id,
        isPublished: true // Default to published, can be changed later
    });

    if (!video) {
        throw new ApiError(500, "Something went wrong while publishing the video");
    }

    return res.status(201).json(
        new ApiResponse(201, video, "Video published successfully")
    );
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video ID format");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    // Optionally, increment view count if the video is published
    // and the user is not the owner (or based on other logic)
    if (video.isPublished) {
        // This is a simplified view increment. In a real app, you might want to avoid
        // incrementing views for the same user repeatedly in a short time.
        video.views += 1;
        await video.save({ validateBeforeSave: false });
    }
    
    // Add aggregation to fetch owner details and like/subscription status if needed
    const videoDetails = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
            }
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
                            fullName: 1
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $addFields: {
                owner: { $first: "$ownerDetails" },
                likeCount: { $size: "$likes" },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$likes.likedBy"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                videoFile: 1,
                title: 1,
                description: 1,
                views: 1,
                createdAt: 1,
                duration: 1,
                owner: 1,
                likeCount: 1,
                isLiked: 1,
                isPublished: 1,
                thumbnail: 1
            }
        }
    ]);

    if (!videoDetails?.length) {
        throw new ApiError(404, "Video not found after aggregation");
    }


    return res.status(200).json(
        new ApiResponse(200, videoDetails[0], "Video fetched successfully")
    );
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { title, description } = req.body;
    const thumbnailLocalPath = req.file?.path; // For new thumbnail

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video ID format");
    }

    if (!title && !description && !thumbnailLocalPath) {
        throw new ApiError(400, "At least one field (title, description, or thumbnail) must be provided for update.");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    // Check if the logged-in user is the owner of the video
    if (video.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this video");
    }

    const updateFields = {};
    if (title && title.trim() !== "") {
        updateFields.title = title;
    }
    if (description && description.trim() !== "") {
        updateFields.description = description;
    }

    let newThumbnailUrl = video.thumbnail;
    if (thumbnailLocalPath) {
        const thumbnailUploadResult = await uploadOnCloudinary(thumbnailLocalPath);
        if (!thumbnailUploadResult || !thumbnailUploadResult.url) {
            throw new ApiError(500, "Error uploading new thumbnail to Cloudinary");
        }
        newThumbnailUrl = thumbnailUploadResult.url;
        updateFields.thumbnail = newThumbnailUrl;
        // TODO: Optionally delete the old thumbnail from Cloudinary
    }
    
    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        { $set: updateFields },
        { new: true, runValidators: true }
    ).select("-owner"); // Exclude owner from the returned object for brevity

    if (!updatedVideo) {
        throw new ApiError(500, "Something went wrong while updating the video details");
    }

    return res.status(200).json(
        new ApiResponse(200, updatedVideo, "Video details updated successfully")
    );
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video ID format");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (video.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this video");
    }

    // TODO: Implement a robust way to delete from Cloudinary
    // This might involve storing public_ids or creating a helper function
    // For now, we'll just delete the DB record.
    // Example: await deleteFromCloudinary(video.videoFile);
    // Example: await deleteFromCloudinary(video.thumbnail);

    const deletionResult = await Video.findByIdAndDelete(videoId);

    if (!deletionResult) {
        throw new ApiError(500, "Something went wrong while deleting the video");
    }

    // Additionally, you might want to delete associated likes, comments etc.
    // This can be handled via database triggers, middleware, or explicitly here.
    // For example: await Like.deleteMany({ video: videoId });
    // await Comment.deleteMany({ video: videoId });


    return res.status(200).json(
        new ApiResponse(200, { videoId }, "Video deleted successfully")
    );
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video ID format");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (video.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorized to change the publish status of this video");
    }

    video.isPublished = !video.isPublished;
    await video.save({ validateBeforeSave: false });

    return res.status(200).json(
        new ApiResponse(
            200,
            { videoId: video._id, isPublished: video.isPublished },
            "Video publish status toggled successfully"
        )
    );
});

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
};