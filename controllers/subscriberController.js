const Subscriber = require('../models/Subscriber');
const Course = require('../models/Course');
const User = require('../models/User');

const createSubscriber = async (req, res) => {
  const { userId } = req;
  const { courseId } = req.body;

  try {
    // Check if the user is already subscribed to the course
    const existingSubscriber = await Subscriber.findOne({ userId, courseId });
    if (existingSubscriber) {
      return res.status(400).json({ message: "User is already subscribed to this course." });
    }

    // Fetch the course details
    const course = await Course.findOne({ _id: courseId }).lean();
    if (!course) {
      return res.status(404).json({ message: "Course not found." });
    }

    // Extract video IDs from the modules
    const videosArray = course.modules.map(module => module.video.id);
    // Create a new subscriber with progress for each video
    const newSubscriber = new Subscriber({
      userId,
      courseId,
      progress: videosArray.map(videoId => ({
        videoId,
        watchedPercentage: 0,
        completed: false,
      })),
    });

    // Save the new subscriber
    await newSubscriber.save();
    res.status(201).json(newSubscriber);
  } catch (error) {
    console.error("Error creating subscriber:", error);
    res.status(400).json({ message: error.message });
  }
};

const unsubscribe = async (req, res) => {
  const { userId } = req;
  const { courseId } = req.body;

  try {
    // Find and delete the subscriber document
    const deletedSubscriber = await Subscriber.findOneAndDelete({ userId, courseId });

    if (!deletedSubscriber) {
      return res.status(404).json({ message: 'Subscription not found.' });
    }

    res.status(200).json({ message: 'Unsubscribed successfully.' });
  } catch (error) {
    console.error("Error unsubscribing:", error);
    res.status(400).json({ message: error.message });
  }
};

const checkSubscription = async (req, res) => {
  const { userId } = req;
  const { courseId } = req.query;

  try {
    const subscription = await Subscriber.findOne({ userId, courseId });

    if (subscription) {
      return res.status(200).json({ isSubscribed: true, subscription });
    } else {
      return res.status(200).json({ isSubscribed: false });
    }
  } catch (error) {
    console.error("Error checking subscription:", error);
    res.status(400).json({ message: error.message });
  }
};

const updateProgress = async (req, res) => {
  const { userId } = req
  const { courseId, progress } = req.body;

  try {
    const subscriber = await Subscriber.findOneAndUpdate(
      { userId, courseId },
      { progress },
      { new: true }
    );

    if (subscriber) {
      return res.status(200).json(subscriber);
    } else {
      return res.status(404).json({ message: "Subscriber not found" });
    }
  } catch (error) {
    console.error("Error updating progress:", error);
    res.status(400).json({ message: error.message });
  }
}

const listSubscription = async (req, res) => {
  const { userId } = req;
  try {
    const subscriptions = await Subscriber.find({ userId });
    const courseIds = subscriptions.map(sub => sub.courseId);
    const learningPaths = await LearningPath.find({ _id: { $in: courseIds } });

    const coursesWithProgress = subscriptions.map(sub => {
      const learningPath = learningPaths.find(lp => lp._id.equals(sub.courseId));

      // Calculate progress percentage
      const totalVideos = sub.progress.length;
      const completedVideos = sub.progress.filter(video => video.completed).length;
      const progressPercentage = totalVideos > 0 ? (completedVideos / totalVideos) * 100 : 0;

      // Determine progress status based on percentage
      const progress = progressPercentage === 100 ? 'Completed' : 'In Progress';

      return {
        id: sub.courseId,
        title: learningPath ? learningPath.title : 'Unknown Title',
        progress, // Updated progress status
        progressPercentage, // Progress percentage
      };
    });

    return res.status(200).json(coursesWithProgress);
  } catch (error) {
    console.error("Error checking subscription:", error);
    res.status(400).json({ message: error.message });
  }
};

const getAllProgress = async (req, res) => {
  try {
    // Fetch all subscriptions
    const subscriptions = await Subscriber.find({});

    // Use Promise.all to fetch user details for all subscriptions
    // const allProgress = await Promise.all(
    //   subscriptions.map(async (subscription) => {
    //     const totalVideos = subscription.progress.length;
    //     const completedVideos = subscription.progress.filter(video => video.completed).length;

    //     // Calculate the progress percentage
    //     const progressPercentage = totalVideos > 0 ? (completedVideos / totalVideos) * 100 : 0;

    //     // Fetch user details
    //     const user = await User.findById(subscription.userId);
    //     const username = user ? user.username : 'Unknown'; // Fallback to 'Unknown' if user not found

    //     return {
    //       userId: subscription.userId,
    //       username, // Add the username to the response
    //       courseId: subscription.courseId,
    //       totalVideos,
    //       completedVideos,
    //       progressPercentage
    //     };
    //   })
    // );

    return res.status(200).json(subscriptions);
  } catch (error) {
    console.error("Error checking subscription:", error);
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  createSubscriber,
  unsubscribe,
  checkSubscription,
  updateProgress,
  listSubscription,
  getAllProgress,
};