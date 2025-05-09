const express = require('express');
const cors = require("cors");
const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes');
// const pathRoutes = require('./routes/pathRoutes');
const courseRoutes = require('./routes/courseRoutes')
const videoRoutes = require('./routes/videoRoutes');
const noteRoutes = require('./routes/noteRoutes');
const trackRoutes = require('./routes/trackRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const subtitleRoutes = require('./routes/subtitleRoutes');
const authRoutes = require('./routes/authRoutes');  
const subscriberRoutes = require('./routes/subscriberRoutes');
// const newVideoRoutes = require('./routes/newVideoRoutes');

const app = express();
const port = process.env.PORT;
app.use(cors());

// Connect to MongoDB
connectDB();

// Middleware to parse JSON
app.use(express.json());

// Routes
app.use('/api', authRoutes); // /
app.use('/api', userRoutes); // /users
// app.use('/api', pathRoutes); // /paths
app.use('/api', courseRoutes);
app.use('/api', videoRoutes); // /videos
app.use('/api', noteRoutes); // /notes
app.use('/api', trackRoutes); // tracks
app.use('/api', resourceRoutes); // resources
app.use('/api', subtitleRoutes); // subtitles
app.use('/api', subscriberRoutes); // subscriber
// app.use('/api/videos1', newVideoRoutes); // Test

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});