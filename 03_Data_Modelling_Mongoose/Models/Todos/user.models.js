import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    // username: String,
    // password: String,
    // email: String,

    // Professional/Industry --> use as a object

    username: {
        type: String,
        required: true,
        unique: true,
        unique: true,
        lowercase: true,
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
    },

    password: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
    },
    
}, { timestamps: true });

export const User = mongoose.model('User', UserSchema);