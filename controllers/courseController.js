const Course = require('../models/Course');
const Resource = require('../models/Resource');
const Video = require('../models/Video');

// Get all courses
const getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find(); // .populate('modules.video modules.resources')
    res.status(200).json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a single course by ID
const getCourseById = async (req, res) => {
  // console.log(req.params.id)
  try {
    const course = await Course.findById(req.params.id); // .populate('modules.video modules.resources')
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    res.status(200).json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new course
const createCourse = async (req, res) => {
  const { userId } = req;
  try {
    const courseData = {
      ...req.body,
      imageUrl: `https://placehold.co/600x400/404550/FFFFFF?text=${req.body.title}`,
      students: 0,
      createdBy: userId,
    };
    const newCourse = new Course(courseData);
    await newCourse.save();

    res.status(201).json(newCourse);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update a course by ID
const updateCourse = async (req, res) => {
  try {
    const updatedCourse = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedCourse) {
      return res.status(404).json({ message: 'Course not found' });
    }
    res.status(200).json(updatedCourse);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete a course by ID
const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    res.status(200).json({ message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse
};