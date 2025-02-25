const LearningPath = require('../models/LearningPath');

// Create a new Path
const createPath = async (req, res) => {
  console.log("Path controller createPath variable:", req.body);
  const { userId } = req;
  const { title, description, videos } = req.body;
  console.log(userId)
  // Validate required fields
  if (!title || !description || !videos ) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  // Validate videos array
  if (!Array.isArray(videos) || videos.length === 0) {
    return res.status(400).json({ message: 'Videos must be a non-empty array' });
  }

  // Validate each video in the array
  for (const video of videos) {
    if (!video.videoId || !video.order) {
      return res.status(400).json({ message: 'Each video must have a videoId and order' });
    }
  }

  try {
    // Create a new LearningPath document
    const newPath = new LearningPath({
      title,
      description,
      videos,
      createdBy: userId,
    });

    // Save the document to the database
    await newPath.save();

    // Return the created document
    res.status(201).json(newPath);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getPaths = async (req, res) => {
  try {
    const paths = await LearningPath.find();
    res.json(paths);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createPath,
  getPaths
};