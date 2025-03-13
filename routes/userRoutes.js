const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

// GET /api/users
router.get('/users', authMiddleware, userController.getUsers);

// GET /api/users/role
router.get('/users/role', authMiddleware, userController.getRole);

// GET /api/users/:id
router.get('/users/:id', authMiddleware, userController.getUser);

// PUT /api/users/:id
router.put('/users/:id', authMiddleware, userController.updateUser);

// DELETE /api/users/:id
router.delete('/users/:id', authMiddleware, userController.deleteUser);

router.post('/users/:id/reset-password', authMiddleware, userController.resetPassword);

module.exports = router;