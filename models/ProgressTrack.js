const mongoose = require('mongoose');

const trackSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Reference to the User model
      required: true,
    },
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video', // Reference to the Video model
      required: true,
    },
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LearningPath', // Reference to the Video model
      required: true,
    },
    currentProgress: { type: Number, required: true },
    timestamp: { type: Number, required: true }
  },
  {
    timestamps: true, // Automatically adds `createdAt` and `updatedAt` fields
  }
);

const ProgressTracker = mongoose.model('ProgressTracker', trackSchema);

module.exports = ProgressTracker;