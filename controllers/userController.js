const User = require('../models/User');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Get all users
const getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a single user by ID
const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user role
const getRole = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('role');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ role: user.role });
  } catch (error) {
    console.error('Error fetching user role:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update a user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, role } = req.body;

    const user = await User.findByIdAndUpdate(
      id,
      { username, email, role },
      { new: true } // Return the updated document
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createDefaultUser = async () => {
  const defaultUser = {
    username: process.env.DEFAULT_USER_USERNAME, // Use environment variable
    email: process.env.DEFAULT_USER_EMAIL, // Use environment variable
    password: await bcrypt.hash(process.env.DEFAULT_USER_PASSWORD, 10), // Hash the password from .env
    role: process.env.DEFAULT_USER_ROLE, // Use environment variable
  };

  try {
    const userExists = await User.findOne({ username: defaultUser.username });
    if (!userExists) {
      await User.create(defaultUser);
      console.log('Default user created successfully.');
    } else {
      console.log('Default user already exists.');
    }
  } catch (error) {
    console.error('Error creating default user:', error);
  }
};

module.exports = {
  createDefaultUser,
  getUsers,
  getUser,
  getRole,
  updateUser,
  deleteUser,
};