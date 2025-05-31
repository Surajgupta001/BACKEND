import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    age: {
      type: Number,
      required: true,
    },

    specialization: {
      type: String,
      required: true,
    },

    experience: {
      type: Number,
      required: true,
    },

    address: {
      type: String,
      required: true,
    },

    salary: {
      type: Number,
      required: true,
    },

    qualification: {
      type: String,
      required: true,
    },

    worksInHostipitals: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Hospital",
            required: true,
        }
    ],
  },
  { timestamp: true }
);

export const Doctor = mongoose.model("Doctor", doctorSchema);