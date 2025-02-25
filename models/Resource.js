const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema(
  {
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video', // Reference to the Video model
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    filePath: { type: String, required: true },
  },
  {
    timestamps: true, // Automatically adds `createdAt` and `updatedAt` fields
  }
);

const Resource = mongoose.model('Resource', resourceSchema);

module.exports = Resource;