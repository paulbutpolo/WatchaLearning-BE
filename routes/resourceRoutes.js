// const express = require('express');
// const router = express.Router();
// const resourceController = require('../controllers/resourceController');

// // Add a resource to a learning path
// router.post('/learning-paths/:learningPathId/resources', resourceController.addResource);

// // Get all resources for a learning path
// router.get('/learning-paths/:learningPathId/resources', resourceController.getResourcesByLearningPath);

// // Update a resource
// router.put('/resources/:resourceId', resourceController.updateResource);

// // Delete a resource
// router.delete('/resources/:resourceId', resourceController.deleteResource);

// module.exports = router;


const express = require('express');
const router = express.Router();
const resourceController = require('../controllers/resourceController');

router.get('/resources/', resourceController.getAllResources);
router.post('/resource/', resourceController.createResource);

module.exports = router;