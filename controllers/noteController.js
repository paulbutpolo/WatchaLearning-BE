// controllers/noteController.js
const Note = require('../models/Note');

// Create a new note
const createNote = async (req, res) => {
  const { userId, videoId, noteText } = req.body;

  try {
    const newNote = new Note({ userId, videoId, noteText });
    await newNote.save();
    res.status(201).json(newNote);
  } catch (error) {
    console.error("Error creating note:", error);
    res.status(500).json({ message: "Failed to create note" });
  }
};

// Get all notes for a specific video
const getNotes = async (req, res) => {
  const { videoId } = req.params;

  try {
    const notes = await Note.find({ videoId });
    res.status(200).json(notes);
  } catch (error) {
    console.error("Error fetching notes:", error);
    res.status(500).json({ message: "Failed to fetch notes" });
  }
};

// Update a note
const updateNote = async (req, res) => {
  const { noteId } = req.params;
  const { noteText } = req.body;

  try {
    const updatedNote = await Note.findByIdAndUpdate(
      noteId,
      { noteText, updatedAt: Date.now() },
      { new: true }
    );

    if (!updatedNote) {
      return res.status(404).json({ message: "Note not found" });
    }

    res.status(200).json(updatedNote);
  } catch (error) {
    console.error("Error updating note:", error);
    res.status(500).json({ message: "Failed to update note" });
  }
};

// Delete a note
const deleteNote = async (req, res) => {
  const { noteId } = req.params;

  try {
    const deletedNote = await Note.findByIdAndDelete(noteId);

    if (!deletedNote) {
      return res.status(404).json({ message: "Note not found" });
    }

    res.status(200).json({ message: "Note deleted successfully" });
  } catch (error) {
    console.error("Error deleting note:", error);
    res.status(500).json({ message: "Failed to delete note" });
  }
};

module.exports = {
  createNote,
  getNotes,
  updateNote,
  deleteNote,
};