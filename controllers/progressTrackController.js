const ProgressTrack = require('../models/ProgressTrack');

// Save progress for the current user
const saveProgress = async (req, res) => {
  const { videoId, currentProgress } = req.body;
  const { userId } = req; // Get userId from the request (added by authMiddleware)

  try {
    let progress = await ProgressTrack.findOne({ userId, videoId });

    if (progress) {
      // Update existing progress
      progress.currentProgress = currentProgress;
      progress.timestamp = Date.now();
    } else {
      // Create new progress entry
      progress = new ProgressTrack({
        userId,
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

// Get progress for the current user
const getProgress = async (req, res) => {
  const { videoId } = req.query;
  const { userId } = req; // Get userId from the request (added by authMiddleware)

  try {
    const progress = await ProgressTrack.findOne({ userId, videoId });
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
  getProgress,
};