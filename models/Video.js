// const mongoose = require('mongoose');

// const videosSchema = new mongoose.Schema(
//   {
//     title: { type: String, required: true },
//     description: { type: String, required: true },
//     url: { type: String, required: true },
//     originalExtension: { type: String, required: true },
//     status: { type: String, default: "pending" },
//     duration: { type: Date, default: Date.now },
//     subtitles: [
//       {
//         language: { type: String, required: true },
//         url: { type: String, required: true },
//       },
//     ],
//     createdBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'User',
//       required: true,}
//   },
//   {
//     timestamps: true,
//   }
// );

// const Videos = mongoose.model('Videos', videosSchema);

// // Indexes
// videosSchema.index({ createdAt: -1 }); // single
// videosSchema.index({ title: 1, status: 1 }); // compound
// videosSchema.index({ url: 1}, { unique: true }) // single unique

// module.exports = Videos;

const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema(
  {
    fileId: {
      type: String,
      required: true,
      unique: true
    },
    originalName: {
      type: String,
      required: true
    },
    fileName: {
      type: String,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    uploadDate: {
      type: Date,
      default: Date.now
    },
    completedDate: {
      type: Date
    },
    status: {
      type: String,
      enum: ['uploaded', 'transcoding', 'completed', 'failed'],
      default: 'uploaded'
    },
    transcodingProgress: {
      type: Number,
      default: 0
    },
    hlsPath: {
      type: String
    },
    formats: [{
      name: String,
      path: String,
      resolution: String,
      bitrate: String
    }],
    error: {
      type: String
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true } // Reference to User who created it
  }, { timestamps: true }
);

const Video = mongoose.model('Videos', videoSchema);

module.exports = Video;