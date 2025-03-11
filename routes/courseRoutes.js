const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const authMiddleware = require('../middleware/auth');

router.get('/courses/', courseController.getAllCourses);
router.get('/course/:id', courseController.getCourseById);
router.post('/course/', authMiddleware, courseController.createCourse);
router.put('/course/:id', courseController.updateCourse);
router.delete('/course/:id', courseController.deleteCourse);

module.exports = router;