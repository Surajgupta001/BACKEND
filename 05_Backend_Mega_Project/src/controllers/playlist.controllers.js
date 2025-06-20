import mongoose from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { Video } from "../models/video.model.js"; // Added Video import
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body;
    const userId = req.user?._id;

    if (!name || name.trim() === "") {
        throw new ApiError(400, "Playlist name is required");
    }

    const playlist = await Playlist.create({
        name,
        description: description || "",
        owner: userId,
        videos: []
    });

    if (!playlist) {
        throw new ApiError(500, "Something went wrong while creating the playlist");
    }

    return res.status(201).json(
        new ApiResponse(201, playlist, "Playlist created successfully")
    );
});

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid user ID format");
    }

    // Optional: Check if user exists
    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const playlistAggregate = Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "videos", // Collection to join
                localField: "videos", // Field from the input documents (Playlist)
                foreignField: "_id", // Field from the documents of the "from" collection (Video)
                as: "playlistVideosDetails", // Output array field
                pipeline: [ // Optional pipeline to run on the joined documents
                    {
                        $project: { // Select only necessary fields from videos
                            _id: 1,
                            thumbnail: 1, // Assuming you want to show thumbnails
                            title: 1,
                            duration: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                totalVideos: { $size: "$videos" }, // Count of video ObjectIds
                // Get first 3 video thumbnails for a preview, if needed
                previewThumbnails: { $slice: ["$playlistVideosDetails.thumbnail", 3] }
            }
        },
        {
            $project: { // Define the final structure of each playlist document
                _id: 1,
                name: 1,
                description: 1,
                createdAt: 1,
                updatedAt: 1,
                owner: 1, // Keep owner ID
                totalVideos: 1,
                previewThumbnails: 1
                // playlistVideosDetails: 1 // Uncomment if you want full video details in response
            }
        },
        {
            $sort: { updatedAt: -1 } // Sort by most recently updated
        }
    ]);

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        customLabels: {
            totalDocs: 'totalPlaylists',
            docs: 'playlists'
        }
    };

    const userPlaylists = await Playlist.aggregatePaginate(playlistAggregate, options);

    if (!userPlaylists || userPlaylists.playlists.length === 0 && parseInt(page, 10) > 1) {
        return res.status(200).json(new ApiResponse(200, { playlists: [], nextPage: null }, "No more playlists found for this user"));
    }
    
    if (!userPlaylists || userPlaylists.playlists.length === 0) {
        return res.status(200).json(new ApiResponse(200, [], "User has no playlists yet"));
    }

    return res.status(200).json(
        new ApiResponse(200, userPlaylists, "User playlists fetched successfully")
    );
});

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID format");
    }

    const playlist = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videosDetails",
                pipeline: [
                    {
                        $lookup: { // Lookup owner for each video
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "ownerInfo",
                            pipeline: [
                                {
                                    $project: { username: 1, avatar: 1, fullName: 1 }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: { // Add owner object to each video
                            owner: { $first: "$ownerInfo" }
                        }
                    },
                    { // Project necessary fields from videos
                        $project: {
                            _id: 1, title: 1, thumbnail: 1, duration: 1, views: 1, createdAt: 1, owner: 1
                        }
                    }
                ]
            }
        },
        {
            $lookup: { // Lookup playlist owner details
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "playlistOwnerDetails",
                pipeline: [
                    {
                        $project: { username: 1, avatar: 1, fullName: 1 }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: { $first: "$playlistOwnerDetails" },
                totalVideos: { $size: "$videosDetails" } // Count of videos in the playlist
            }
        },
        { // Final projection for the playlist
            $project: {
                name: 1,
                description: 1,
                createdAt: 1,
                updatedAt: 1,
                owner: 1,
                videos: "$videosDetails", // Embed full video details
                totalVideos: 1
            }
        }
    ]);


    if (!playlist || playlist.length === 0) {
        throw new ApiError(404, "Playlist not found");
    }

    return res.status(200).json(
        new ApiResponse(200, playlist[0], "Playlist fetched successfully")
    );
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(playlistId) || !mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid Playlist or Video ID format");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    if (playlist.owner.toString() !== userId.toString()) {
        throw new ApiError(403, "You are not authorized to add videos to this playlist");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }
    if (!video.isPublished) {
        throw new ApiError(400, "Cannot add an unpublished video to playlist");
    }

    // Check if video already exists in the playlist
    if (playlist.videos.includes(videoId)) {
        throw new ApiError(400, "Video already exists in this playlist");
    }

    playlist.videos.push(videoId);
    const updatedPlaylist = await playlist.save();

    if (!updatedPlaylist) {
        throw new ApiError(500, "Something went wrong while adding video to the playlist");
    }

    return res.status(200).json(
        new ApiResponse(200, updatedPlaylist, "Video added to playlist successfully")
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(playlistId) || !mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid Playlist or Video ID format");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    if (playlist.owner.toString() !== userId.toString()) {
        throw new ApiError(403, "You are not authorized to remove videos from this playlist");
    }

    // Check if video exists in the playlist before trying to remove
    const videoIndex = playlist.videos.indexOf(videoId);
    if (videoIndex === -1) {
        throw new ApiError(404, "Video not found in this playlist");
    }

    playlist.videos.pull(videoId); // Mongoose .pull() removes the item from array
    const updatedPlaylist = await playlist.save();

    if (!updatedPlaylist) {
        throw new ApiError(500, "Something went wrong while removing video from the playlist");
    }

    return res.status(200).json(
        new ApiResponse(200, updatedPlaylist, "Video removed from playlist successfully")
    );
});

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID format");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    if (playlist.owner.toString() !== userId.toString()) {
        throw new ApiError(403, "You are not authorized to delete this playlist");
    }

    const deletionResult = await Playlist.findByIdAndDelete(playlistId);

    if (!deletionResult) {
        throw new ApiError(500, "Something went wrong while deleting the playlist");
    }

    // Note: Deleting a playlist does not delete the videos themselves,
    // as they might exist in other playlists or independently.

    return res.status(200).json(
        new ApiResponse(200, { playlistId }, "Playlist deleted successfully")
    );
});

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const { name, description } = req.body;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID format");
    }

    if ((!name || name.trim() === "") && (!description || description.trim() === "")) {
        throw new ApiError(400, "Either name or description must be provided to update the playlist");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    if (playlist.owner.toString() !== userId.toString()) {
        throw new ApiError(403, "You are not authorized to update this playlist");
    }

    const updateFields = {};
    if (name && name.trim() !== "") {
        updateFields.name = name;
    }
    // Allow setting description to an empty string if explicitly provided
    if (description !== undefined) {
        updateFields.description = description;
    }


    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        { $set: updateFields },
        { new: true, runValidators: true }
    );

    if (!updatedPlaylist) {
        throw new ApiError(500, "Something went wrong while updating the playlist");
    }

    return res.status(200).json(
        new ApiResponse(200, updatedPlaylist, "Playlist updated successfully")
    );
});

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
};