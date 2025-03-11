// const express = require('express');
// const router = express.Router();
// const videoController = require('../controllers/videoController');
// const upload = require('../config/multer');
// const authMiddleware = require('../middleware/auth');

// router.get('/videos', videoController.getVideos);
// router.get('/video/:id', videoController.getVideoById);
// router.delete('/video/:id', videoController.deleteVideo);
// router.post('/videos/upload', authMiddleware, upload.single('video'), videoController.uploadVideo);
// router.get('/videos/progress/:filename', videoController.getTranscodingProgress);
// router.post('/video/:id/subtitles', upload.single('subtitle'), videoController.uploadSubtitle);
// router.post('/video/:id/adjust-subtitle', videoController.adjustSubtitle);
// router.get('/video/:id/download/:resolution', videoController.downloadVideo);

// module.exports = router;

const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const subtitleController = require('../controllers/subtitleController');
const upload = require('../config/multer');
const authMiddleware = require('../middleware/auth');

router.get('/videos/', videoController.getAllVideos);
router.get('/videos/:id/status', videoController.getVideoStatus);
router.get('/videos/:id/subtitles', subtitleController.getSubtitlesByVideo);
router.get('/video/:id/download/:resolution', videoController.downloadVideo);
router.get('/videos/:id/hls-info', videoController.getHlsInfo);
router.get('/videos/:id/hls', videoController.streamHls);
router.get('/videos/:id/hls/*', (req, res) => {
  // Extract the file path from the URL
  const id = req.params.id;
  const filePath = req.path.replace(`/${id}/hls/`, '');
  
  // Set params for the controller
  req.params.id = id;
  req.params.file = filePath;
  
  // Call the stream controller
  videoController.streamHls(req, res);
});

router.post('/videos/upload', authMiddleware, upload.single('video'), videoController.uploadVideo);

router.delete('/videos/:id', videoController.deleteVideo);


module.exports = router;