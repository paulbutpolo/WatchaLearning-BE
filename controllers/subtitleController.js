// controllers/userController.js
const Subtitle = require('../models/Subtitle');

// Create a new Path
const createSubtitle = async (req, res) => {
  console.log(req.body)

  try {
    const newSubtitle = new Subtitle({  }); // Meh
    await newSubtitle.save();
    res.status(201).json(newSubtitle);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

module.exports = {
  createSubtitle,
};