import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { ApiError } from './utils/ApiError.js';

// Routes import
import userRouter from './routes/user.routes.js';
import videoRouter from './routes/video.routes.js';
import tweetRouter from './routes/tweet.routes.js';
import commentRouter from './routes/comment.routes.js';
import likeRouter from './routes/like.routes.js';
import playlistRouter from './routes/playlist.routes.js';
import subscriptionRouter from './routes/subscription.routes.js';

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: '16kb'}));
app.use(express.urlencoded({extended: true, limit: '16kb'}));
app.use(express.static('public'));
app.use(cookieParser());

// Routes Declaration
app.use('/api/v1/users', userRouter);
app.use('/api/v1/videos', videoRouter);
app.use('/api/v1/tweets', tweetRouter);
app.use('/api/v1/comments', commentRouter);
app.use('/api/v1/likes', likeRouter);
app.use('/api/v1/playlists', playlistRouter);
app.use('/api/v1/subscriptions', subscriptionRouter);

// http:localhost:8080/api/v1/users/register


export { app }
// Global Error Handling Middleware
app.use((err, req, res, next) => {
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: err.success,
            message: err.message,
            errors: err.errors,
            data: err.data // Usually null for errors, but good to include if ApiError structure supports it
        });
    }

    // For unhandled errors
    console.error('Unhandled Error:', err); // Log the full error for debugging
    return res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        errors: [err.message] // Provide a generic error message to the client
    });
});