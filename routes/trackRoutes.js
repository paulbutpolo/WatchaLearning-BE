// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const progressTrackController = require('../controllers/progressTrackController');

// POST /api/users
router.post('/tracks', progressTrackController.createProgressTrack);

module.exports = router;