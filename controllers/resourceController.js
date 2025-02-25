// controllers/userController.js
const Resource = require('../models/Resource');

// Create a new Path
const createResource = async (req, res) => {
  console.log(req.body)

  try {
    const newResource = new Resource({  }); // Meh
    await newResource.save();
    res.status(201).json(newResource);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

module.exports = {
  createResource,
};