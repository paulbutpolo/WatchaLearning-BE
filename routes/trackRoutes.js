// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const progressTrackController = require('../controllers/progressTrackController');
const authMiddleware = require('../middleware/auth');

// POST /api/users
// router.post('/tracks', progressTrackController.createProgressTrack);

router.post('/tracks/save-progress', authMiddleware, progressTrackController.saveProgress);

// Get progress
router.get('/tracks/get-progress', authMiddleware, progressTrackController.getProgress);

router.get('/tracks/last-watched', authMiddleware, progressTrackController.getLastWatchedVideo);
module.exports = router;