// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

// GET /api/users
router.get('/users', authMiddleware, userController.getUsers);

router.get('/users/role', authMiddleware, userController.getRole);

module.exports = router;