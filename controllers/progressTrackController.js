const ProgressTrack = require('../models/ProgressTrack');
const Video = require('../models/Video');

// Save progress for the current user
const saveProgress = async (req, res) => {
  const { videoId, courseId, currentProgress } = req.body;
  const { userId } = req; // Get userId from the request (added by authMiddleware)

  try {
    let progress = await ProgressTrack.findOne({ userId, videoId, courseId });

    if (progress) {
      // Update existing progress
      progress.currentProgress = currentProgress;
      progress.timestamp = Date.now();
    } else {
      // Create new progress entry
      progress = new ProgressTrack({
        userId,
        videoId,
        courseId,
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
  const { courseId, videoId } = req.query; // Extract courseId and videoId from query parameters
  const { userId } = req; // Assuming userId is attached to the request (e.g., from authentication middleware)
  // Validate required fields
  if (!courseId || !videoId || !userId) {
    return res.status(400).json({ message: 'Missing required fields: courseId, videoId, or userId' });
  }

  try {
    // Find progress in the database
    const progress = await ProgressTrack.findOne({ userId, videoId, courseId });

    if (progress) {
      // Return the progress if found
      res.status(200).json({ currentProgress: progress.currentProgress });
    } else {
      // Return a 404 if no progress is found
      res.status(404).json({ message: 'No progress found' });
    }
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ message: 'Failed to fetch progress' });
  }
};

const getLastWatchedVideo = async (req, res) => {
  const { userId } = req;
  try {
    const tracker = await ProgressTrack.findOne({ userId }).sort({ updatedAt: -1 });

    if (!tracker) {
      return res.status(200).json({}); // Return an empty object instead of 404
    }

    const video = await Video.findOne({ _id: tracker.videoId });

    if (!video) {
      return res.status(200).json({}); // Handle case where video does not exist
    }

    const lastWatched = {
      courseId: tracker.courseId,
      videoId: tracker.videoId,
      videoTitle: video.title,
    };

    res.status(200).json(lastWatched);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching last watched video', error });
  }
};

module.exports = {
  saveProgress,
  getProgress,
  getLastWatchedVideo,
};