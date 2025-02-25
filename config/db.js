const mongoose = require('mongoose');

// Add Authentication here: Low Prio
const connectDB = async () => {
  try {
    const conn = await mongoose.connect('mongodb://localhost:27017/VideoHub', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;