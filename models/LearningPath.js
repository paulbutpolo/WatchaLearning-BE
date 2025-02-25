// models/Path.js
const mongoose = require('mongoose');

const learningPathSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    videos: [
      {
        videoId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Video', // Reference to the Video model
          required: true,
        },
        order: {
          type: Number,
          required: true,
        },
        _id: false,
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true, // Automatically adds `createdAt` and `updatedAt` fields
  }
);

const LearningPath = mongoose.model('LearningPath', learningPathSchema);

module.exports = LearningPath;