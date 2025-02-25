const mongoose = require('mongoose');

const videosSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    parsedFilename: String,
    url: String,
    originalExtension: String,
    status: { type: String, default: "pending" },
    uploadedAt: { type: Date, default: Date.now },
    subtitles: [
      {
        language: String,
        url: String,
      },
    ],
    // qualityOptions: [{
    //   quality: String,
    //   filePath: String,
    // },],
    resources: [{
      resourceType: String,
      filePath: String,
    },],
    duration: Number,
  },
  {
    timestamps: true,
  }
);

const Videos = mongoose.model('Videos', videosSchema);

module.exports = Videos;