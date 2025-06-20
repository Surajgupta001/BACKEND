import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    const subscriberId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(channelId)) {
        throw new ApiError(400, "Invalid channel ID format");
    }

    if (channelId.toString() === subscriberId.toString()) {
        throw new ApiError(400, "Users cannot subscribe to their own channel");
    }

    const channel = await User.findById(channelId);
    if (!channel) {
        throw new ApiError(404, "Channel (user) not found");
    }

    const existingSubscription = await Subscription.findOne({
        subscriber: subscriberId,
        channel: channelId,
    });

    let subscribed;
    let message;

    if (existingSubscription) {
        // User is already subscribed, so unsubscribe
        await Subscription.findByIdAndDelete(existingSubscription._id);
        subscribed = false;
        message = "Unsubscribed successfully";
    } else {
        // User is not subscribed, so subscribe
        await Subscription.create({
            subscriber: subscriberId,
            channel: channelId,
        });
        subscribed = true;
        message = "Subscribed successfully";
    }
    
    // Optionally, get the new subscriber count for the channel
    const subscriberCount = await Subscription.countDocuments({ channel: channelId });


    return res.status(200).json(
        new ApiResponse(200, { channelId, subscribed, subscriberCount }, message)
    );
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(channelId)) {
        throw new ApiError(400, "Invalid channel ID format");
    }

    const channel = await User.findById(channelId);
    if (!channel) {
        throw new ApiError(404, "Channel not found");
    }

    const subscribersAggregate = Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriberDetails",
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
            $unwind: "$subscriberDetails" // Each subscription doc will now have one subscriberDetail
        },
        {
            $replaceRoot: { newRoot: "$subscriberDetails" } // Promote subscriberDetails to root
        },
        {
           $sort: {createdAt: -1} // Or sort by subscriber's username, etc.
        }
    ]);
    
    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        customLabels: {
            totalDocs: 'totalSubscribers',
            docs: 'subscribers'
        }
    };

    const subscribers = await Subscription.aggregatePaginate(subscribersAggregate, options);

    if (!subscribers || subscribers.subscribers.length === 0 && parseInt(page, 10) > 1) {
        return res.status(200).json(new ApiResponse(200, { subscribers: [], nextPage: null }, "No more subscribers found for this channel"));
    }
    
    if (!subscribers || subscribers.subscribers.length === 0) {
        return res.status(200).json(new ApiResponse(200, [], "Channel has no subscribers yet"));
    }

    return res.status(200).json(
        new ApiResponse(200, subscribers, "Subscribers fetched successfully")
    );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    // If this route is meant for the currently logged-in user to see their subscriptions,
    // it's better to use req.user._id instead of taking subscriberId from params for security.
    // However, sticking to the current route definition which uses subscriberId from params.
    const { subscriberId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(subscriberId)) {
        throw new ApiError(400, "Invalid subscriber ID format");
    }
    
    // Optional: Check if the subscriber (User) exists
    const subscriberUser = await User.findById(subscriberId);
    if (!subscriberUser) {
        throw new ApiError(404, "Subscriber (user) not found");
    }

    const subscribedChannelsAggregate = Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup: {
                from: "users", // The collection to join with (channels are users)
                localField: "channel", // Field from the Subscription collection
                foreignField: "_id",   // Field from the User collection (channel's _id)
                as: "channelDetails",
                pipeline: [
                    { // Project only necessary fields from the channel (User)
                        $project: {
                            username: 1,
                            avatar: 1,
                            fullName: 1,
                            // You could also add a subscriber count for each channel here if needed
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$channelDetails" // Deconstruct the channelDetails array
        },
        {
            $replaceRoot: { newRoot: "$channelDetails" } // Promote channelDetails to the root
        },
        {
            $sort: {username: 1} // Sort by channel username, for example
        }
    ]);

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        customLabels: {
            totalDocs: 'totalSubscribedChannels',
            docs: 'subscribedChannels'
        }
    };

    const subscribedChannels = await Subscription.aggregatePaginate(subscribedChannelsAggregate, options);
    
    if (!subscribedChannels || subscribedChannels.subscribedChannels.length === 0 && parseInt(page, 10) > 1) {
        return res.status(200).json(new ApiResponse(200, { subscribedChannels: [], nextPage: null }, "No more subscribed channels found"));
    }

    if (!subscribedChannels || subscribedChannels.subscribedChannels.length === 0) {
        return res.status(200).json(new ApiResponse(200, [], "User has not subscribed to any channels yet"));
    }

    return res.status(200).json(
        new ApiResponse(200, subscribedChannels, "Subscribed channels fetched successfully")
    );
});

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
};