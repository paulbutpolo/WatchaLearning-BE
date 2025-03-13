const Note = require('../models/Note');

// Create a new note
const createNote = async (req, res) => {
  try {
    const { userId } = req
    const { videoId, courseId, noteText } = req.body;

    const newNote = new Note({
      userId,
      videoId,
      courseId,
      noteText,
    });

    await newNote.save();
    res.status(201).json(newNote);
  } catch (error) {
    res.status(500).json({ message: 'Error creating note', error: error.message });
  }
};

// Get all notes for a specific video
const getNotes = async (req, res) => {
  const { courseId, videoId } = req.params;
  const userId = req.userId;

  try {
    const notes = await Note.find({
      userId: userId,
      courseId: courseId,
      videoId: videoId
    });

    if (!notes) {
      return res.status(200).json({});
    }

    res.status(200).json(notes);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notes', error: error.message });
  }
};

// Update a note
const updateNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { noteText } = req.body;

    // Update the note
    const updatedNote = await Note.findByIdAndUpdate(
      id,
      { noteText },
      { new: true }
    );

    if (!updatedNote) {
      return res.status(404).json({ message: 'Note not found' });
    }

    res.status(200).json(updatedNote);
  } catch (error) {
    res.status(500).json({ message: 'Error updating note', error: error.message });
  }
};

// Delete a note
const deleteNote = async (req, res) => {
  try {
    const { noteId } = req.params;

    const deletedNote = await Note.findByIdAndDelete(noteId);

    if (!deletedNote) {
      return res.status(404).json({ message: 'Note not found' });
    }

    res.status(200).json({ message: 'Note deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting note', error: error.message });
  }
};

module.exports = {
  createNote,
  getNotes,
  updateNote,
  deleteNote,
};