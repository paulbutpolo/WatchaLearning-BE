// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const progressTrackController = require('../controllers/progressTrackController');

// POST /api/users
// router.post('/tracks', progressTrackController.createProgressTrack);

router.post('/tracks/save-progress', progressTrackController.saveProgress);

// Get progress
router.get('/tracks/get-progress', progressTrackController.getProgress);

module.exports = router;