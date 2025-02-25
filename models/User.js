// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  }, //  { versionKey: '6.9.04.20' }); Add this id you want to bypass the default mongoose __v field 
});

// Create the User model (collection)
const User = mongoose.model('User', userSchema);

module.exports = User;