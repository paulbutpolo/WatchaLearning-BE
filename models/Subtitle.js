const mongoose = require('mongoose');

const subtitleSchema = new mongoose.Schema(
  {
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video', // Reference to the Video model
      required: true,
    },
    languge: {
      type:  String,
      required: true,
    },
    filePath: { type: String, required: true },
  },
  {
    timestamps: true, // Automatically adds `createdAt` and `updatedAt` fields
  }
);

const Subtitle = mongoose.model('Subtitle', subtitleSchema);

module.exports = Subtitle;