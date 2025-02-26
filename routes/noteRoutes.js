// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const noteController = require('../controllers/noteController');
const authMiddleware = require('../middleware/auth');

// POST /api/users
router.post("/notes", authMiddleware, noteController.createNote);
router.get("/notes/:videoId", authMiddleware, noteController.getNotes);
router.put("/notes/:noteId", authMiddleware, noteController.updateNote);
router.delete("/notes/:noteId", authMiddleware, noteController.deleteNote);

module.exports = router;