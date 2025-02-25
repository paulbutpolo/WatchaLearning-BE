// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const resourceController = require('../controllers/resourceController');

// POST /api/users
router.post('/resources', resourceController.createResource);

module.exports = router;