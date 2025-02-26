const mongoose = require('mongoose');

const subscriberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LearningPath',
      required: true,
    },
    progress: [
      {
        videoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Video', required: true},
        watchedPercentage: Number,
        completed: Boolean,
        _id: false,
      }
    ],
    courseCompleted: { type: Boolean, required: true },
  },
  {
    timestamps: true,
  }
);

const Resource = mongoose.model('Subscriber', subscriberSchema);
module.exports = Resource;