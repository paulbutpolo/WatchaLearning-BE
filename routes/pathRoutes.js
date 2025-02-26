// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const learningPathController = require('../controllers/learningPathController');
const authMiddleware = require('../middleware/auth');

// POST /api/users
router.post('/paths', authMiddleware, learningPathController.createPath);
router.get('/paths', learningPathController.getPaths);
router.put('/paths/:id', learningPathController.updatePath);
router.delete('/paths/:id', learningPathController.deletePath);
router.get('/paths/:id', learningPathController.getPathById);
router.get('/paths/:id/next-video/:videoId', learningPathController.getNextVideo);

module.exports = router;