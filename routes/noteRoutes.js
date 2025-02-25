// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const noteController = require('../controllers/noteController');

// POST /api/users
router.post('/notes', noteController.createNote);

module.exports = router;