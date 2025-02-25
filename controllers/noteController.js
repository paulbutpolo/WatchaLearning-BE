// controllers/userController.js
const Note = require('../models/Note');

// Create a new Path
const createNote = async (req, res) => {
  console.log(req.body)

  try {
    const newNote = new Note({  }); // Meh
    await newNote.save();
    res.status(201).json(newNote);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

module.exports = {
  createNote,
};