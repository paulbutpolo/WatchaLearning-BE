// controllers/userController.js
const ProgressTrack = require('../models/ProgressTrack');

// Create a new Path
const createProgressTrack = async (req, res) => {
  console.log(req.body)

  try {
    const newProgressTrack = new ProgressTrack({  }); // Meh
    await newProgressTrack.save();
    res.status(201).json(newProgressTrack);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

module.exports = {
  createProgressTrack,
};