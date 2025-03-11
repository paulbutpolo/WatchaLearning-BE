const LearningPath = require('../models/LearningPath');

// Create a new Path
const createPath = async (req, res) => {
  const { userId } = req;
  const { title, description, videos } = req.body;
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

const getPathById = async (req, res) => {
  try {
    const path = await LearningPath.findById(req.params.id);
    if (!path) {
      return res.status(404).json({ message: 'Learning path not found' });
    }
    res.json(path);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getNextVideo = async (req, res) => {
  try {
    const learningPath = await LearningPath.findById(req.params.id);
    if (!learningPath) {
      return res.status(404).json({ error: "Learning path not found" });
    }

    const videos = learningPath.videos;
    const currentIndex = videos.findIndex((video) => video.videoId === req.params.videoId);
    if (currentIndex === -1 || currentIndex >= videos.length - 1) {
      return res.status(404).json({ error: "No next video found" });
    }

    const nextVideoId = videos[currentIndex + 1].videoId;
    const nextVideo = await Video.findById(nextVideoId);
    if (!nextVideo) {
      return res.status(404).json({ error: "Next video not found" });
    }

    res.json(nextVideo);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch next video" });
  }
};

const deletePath = async (req, res) => {
  console.log("Deleting..", req.params)
  const { id } = req.params;

  try {
    const deletedPath = await LearningPath.findByIdAndDelete(id);

    if (!deletedPath) {
      return res.status(404).json({ message: "Path not found" });
    }

    res.status(200).json({ message: "Path deleted successfully" });
  } catch (error) {
    console.error("Error deleting path:", error);
    res.status(500).json({ message: "Failed to delete path" });
  }
}

const updatePath = async (req, res) => {
  console.log("Updating..", req.params, req.body);
  const { id } = req.params; // Use 'id' instead of 'pathId'
  const { title, description, videos } = req.body; // Extract fields directly from req.body

  try {
    const updatedPath = await LearningPath.findByIdAndUpdate(
      id, // Use 'id' here
      { title, description, videos, updatedAt: Date.now() }, // Update fields directly
      { new: true }
    );

    if (!updatedPath) {
      return res.status(404).json({ message: "Path not found" });
    }

    res.status(200).json(updatedPath);
  } catch (error) {
    console.error("Error updating path:", error);
    res.status(500).json({ message: "Failed to update path" });
  }
};

module.exports = {
  createPath,
  getPaths,
  getPathById,
  getNextVideo,
  deletePath,
  updatePath,
};