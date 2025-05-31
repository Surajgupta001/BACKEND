import mongoose from "mongoose";

const hospitalSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },

    location: {
        type: String,
        required: true
    },

    capacity: {
        type: Number,
        required: true
    },

    departments: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Department",
            required: true
        }
    ],

    city: {
        type: String,
        required: true
    },

    pincode: {
        type: String,
        required: true
    },

    specializedIn: [
        {
            type: String,
            enum: ["Cardiology", "Neurology", "Orthopedics", "Pediatrics", "Oncology", "Dermatology", "Gastroenterology"],
            required: true
        }
    ]


}, {timestamp: true});

export const Hospital = mongoose.model("Hospital", hospitalSchema);