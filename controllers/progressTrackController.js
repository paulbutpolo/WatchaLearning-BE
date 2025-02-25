// controllers/userController.js
const ProgressTrack = require('../models/ProgressTrack');

const STATIC_USER_ID = '64f1b1b1b1b1b1b1b1b1b1b1'; // Replace with a valid ObjectId

// Create a new Path
const saveProgress = async (req, res) => {
  const { videoId, currentProgress } = req.body;

  try {
    let progress = await ProgressTrack.findOne({ userId: STATIC_USER_ID, videoId });

    if (progress) {
      // Update existing progress
      progress.currentProgress = currentProgress;
      progress.timestamp = Date.now();
    } else {
      // Create new progress entry
      progress = new ProgressTrack({
        userId: STATIC_USER_ID,
        videoId,
        currentProgress,
        timestamp: Date.now(),
      });
    }

    await progress.save();
    res.status(200).json({ message: 'Progress saved successfully' });
  } catch (error) {
    console.error('Error saving progress:', error);
    res.status(500).json({ message: 'Failed to save progress' });
  }
};

const getProgress = async (req, res) => {
  const { videoId } = req.query;

  try {
    const progress = await ProgressTrack.findOne({ userId: STATIC_USER_ID, videoId });
    if (progress) {
      res.status(200).json({ currentProgress: progress.currentProgress });
    } else {
      res.status(404).json({ message: 'No progress found' });
    }
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ message: 'Failed to fetch progress' });
  }
};

module.exports = {
  saveProgress,
  getProgress
};

