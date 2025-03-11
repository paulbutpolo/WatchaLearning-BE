const mongoose = require("mongoose");

const CourseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    duration: { type: String, required: true },
    level: { type: String, required: true },
    students: { type: Number, default: 0 },
    modules: [
      {
        _id: { type: mongoose.Schema.Types.ObjectId, auto: true }, // Auto-generate module ID
        title: { type: String, required: true },
        description: { type: String, required: true },
        video: {
          id: { type: mongoose.Schema.Types.ObjectId, ref: "Video", required: true }, // Reference Video
          title: { type: String, required: true }
        },
        resources: [
          {
            id: { type: mongoose.Schema.Types.ObjectId, ref: "Resource" },
            title: { type: String, required: true }
          }
        ], // Reference Resource
        duration: { type: String, required: true }
      }
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Reference to User who created it
    imageUrl: { type: String, required: true }
  }, { timestamps: true }
);

const Course = mongoose.model("Course", CourseSchema);
module.exports = Course;
