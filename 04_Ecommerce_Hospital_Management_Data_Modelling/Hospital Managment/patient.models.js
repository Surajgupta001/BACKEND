import mongoose from "mongoose";

const patientSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },

    age: {
        type: Number,
        required: true,
    },

    medicalHistory: {
        type: [String],
        required: true,
    },

    diagonsedWith: {
        type: String,
        required: true,
    },

    address: {
        type: String,
        required: true,
    },

    bloodGroup: {
        type: String,
        Enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
        required: true,
    },

    gender: {
        type: String,
        enum: ["M", "F", "O"],
    },

    admittedIn: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Hospital",
        required: true,      
    }

}, {timestamp: true});

export const Patient = mongoose.model("Patient", patientSchema);