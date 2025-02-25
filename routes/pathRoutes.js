// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const learningPathController = require('../controllers/learningPathController');

// POST /api/users
router.post('/paths', learningPathController.createPath);

router.get('/paths', learningPathController.getPaths);

module.exports = router;