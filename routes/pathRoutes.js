// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const learningPathController = require('../controllers/learningPathController');
const authMiddleware = require('../middleware/auth');

// POST /api/users
router.post('/paths', authMiddleware, learningPathController.createPath);

router.get('/paths', learningPathController.getPaths);

module.exports = router;