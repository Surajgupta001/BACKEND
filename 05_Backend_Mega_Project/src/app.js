import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { ApiError } from './utils/ApiError.js';

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: '16kb'}));
app.use(express.urlencoded({extended: true, limit: '16kb'}));
app.use(express.static('public'));
app.use(cookieParser());

// Routes import
import userRouter from './routes/user.routes.js';

// Routes Declaration
app.use('/api/v1/users', userRouter);

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