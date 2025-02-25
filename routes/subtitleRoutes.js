// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const subtitleController = require('../controllers/subtitleController');

// POST /api/users
router.post('/subtitles', subtitleController.createSubtitle);

module.exports = router;