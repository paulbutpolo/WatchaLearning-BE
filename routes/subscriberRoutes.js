const express = require('express');
const router = express.Router();
const subscriberController = require('../controllers/subscriberController')
const authMiddleware = require('../middleware/auth');

router.post('/subscriber/create', authMiddleware, subscriberController.createSubscriber)
router.post('/subscriber/delete', authMiddleware, subscriberController.unsubscribe);
router.get('/subscriber/check', authMiddleware, subscriberController.checkSubscription);
router.put('/subscriber/update-progress', authMiddleware, subscriberController.updateProgress);
router.get('/subscriber', authMiddleware, subscriberController.listSubscription);

module.exports = router;