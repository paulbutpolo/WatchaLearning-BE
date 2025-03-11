// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const noteController = require('../controllers/noteController');
const authMiddleware = require('../middleware/auth');

// POST /api/users
router.post("/note", authMiddleware, noteController.createNote);
router.get("/notes/:courseId/:videoId", authMiddleware, noteController.getNotes);
router.put("/note/:id", authMiddleware, noteController.updateNote);
router.delete("/note/:noteId", authMiddleware, noteController.deleteNote);

module.exports = router;