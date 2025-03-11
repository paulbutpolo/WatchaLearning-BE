// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const subtitleController = require('../controllers/subtitleController');
const upload = require('../config/multer');

// POST /api/users
router.post('/subtitles', upload.single('file'), subtitleController.createSubtitle);
router.delete('/subtitles/:id', subtitleController.deleteSubtitle);


module.exports = router;