const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  url: { type: String, required: true },
  learningPath: { type: mongoose.Schema.Types.ObjectId, ref: 'LearningPath', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Resource = mongoose.model('Resource', resourceSchema);

module.exports = Resource;