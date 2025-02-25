const mongoose = require('mongoose');

const videosSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true }, // Need to add this, also dont forget about subtitle and resources and notes?
    url: { type: String, required: true },
    originalExtension: { type: String, required: true },
    status: { type: String, default: "pending" },
    duration: { type: Date, default: Date.now },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,}
  },
  {
    timestamps: true,
  }
);

const Videos = mongoose.model('Videos', videosSchema);

module.exports = Videos;