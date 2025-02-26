const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const upload = require('../config/multer');
const authMiddleware = require('../middleware/auth');

router.get('/videos', videoController.getVideos);
router.get('/video/:id', videoController.getVideoById);
router.delete('/video/:id', videoController.deleteVideo);
router.post('/videos/upload', authMiddleware, upload.single('video'), videoController.uploadVideo);
router.get('/videos/progress/:filename', videoController.getTranscodingProgress);
router.post('/video/:id/subtitles', upload.single('subtitle'), videoController.uploadSubtitle);
router.post('/video/:id/adjust-subtitle', videoController.adjustSubtitle);
router.get('/video/:id/download/:resolution', videoController.downloadVideo);

module.exports = router;