// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  },{
  timestamps: true, // Automatically adds `createdAt` and `updatedAt` fields
});

// Create the User model (collection)
const User = mongoose.model('User', userSchema);

module.exports = User;