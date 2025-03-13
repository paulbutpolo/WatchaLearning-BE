// const Resource = require('../models/Resource');
// const LearningPath = require('../models/LearningPath');

// // Add a resource to a learning path
// const addResource = async (req, res) => {
//   const { learningPathId } = req.params;
//   const { title, description, url } = req.body;

//   try {
//     // Create the resource
//     const newResource = new Resource({
//       title,
//       description,
//       url,
//       learningPath: learningPathId,
//     });

//     // Save the resource
//     const savedResource = await newResource.save();

//     // Add the resource to the learning path (optional)
//     await LearningPath.findByIdAndUpdate(
//       learningPathId,
//       { $push: { resources: savedResource._id } },
//       { new: true }
//     );

//     res.status(201).json(savedResource);
//   } catch (error) {
//     console.error('Error adding resource:', error);
//     res.status(500).json({ message: 'Failed to add resource' });
//   }
// };

// // Get all resources for a learning path
// const getResourcesByLearningPath = async (req, res) => {
//   const { learningPathId } = req.params;

//   try {
//     const resources = await Resource.find({ learningPath: learningPathId });
//     res.status(200).json(resources);
//   } catch (error) {
//     console.error('Error fetching resources:', error);
//     res.status(500).json({ message: 'Failed to fetch resources' });
//   }
// };

// // Update a resource
// const updateResource = async (req, res) => {
//   const { resourceId } = req.params;
//   const { title, description, url } = req.body;

//   try {
//     const updatedResource = await Resource.findByIdAndUpdate(
//       resourceId,
//       { title, description, url, updatedAt: Date.now() },
//       { new: true }
//     );

//     if (!updatedResource) {
//       return res.status(404).json({ message: 'Resource not found' });
//     }

//     res.status(200).json(updatedResource);
//   } catch (error) {
//     console.error('Error updating resource:', error);
//     res.status(500).json({ message: 'Failed to update resource' });
//   }
// };

// // Delete a resource
// const deleteResource = async (req, res) => {
//   const { resourceId } = req.params;

//   try {
//     const deletedResource = await Resource.findByIdAndDelete(resourceId);

//     if (!deletedResource) {
//       return res.status(404).json({ message: 'Resource not found' });
//     }

//     // Remove the resource reference from the learning path (optional)
//     await LearningPath.findByIdAndUpdate(
//       deletedResource.learningPath,
//       { $pull: { resources: resourceId } }
//     );

//     res.status(200).json({ message: 'Resource deleted successfully' });
//   } catch (error) {
//     console.error('Error deleting resource:', error);
//     res.status(500).json({ message: 'Failed to delete resource' });
//   }
// };

// module.exports = {
//   addResource,
//   getResourcesByLearningPath,
//   updateResource,
//   deleteResource,
// };


const Resource = require('../models/Resource');

// Get all resources
const getAllResources = async (req, res) => {
  try {
    const resources = await Resource.find();
    res.status(200).json(resources);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new resource
const createResource = async (req, res) => {
  try {
    const newResource = new Resource(req.body);
    await newResource.save();
    res.status(201).json(newResource);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getResourceURL = async (req, res) => {
  const { resourceIds } = req.body;

  try {
    // Query the Resource collection to get URLs
    const resources = await Resource.find({ _id: { $in: resourceIds } }).select('_id url');
    const resourceMap = resources.reduce((acc, resource) => {
      acc[resource._id.toString()] = resource.url;
      return acc;
    }, {});

    res.status(200).json(resourceMap);
  } catch (error) {
    console.error('Error fetching resource URLs:', error);
    res.status(500).json({ error: 'Failed to fetch resource URLs' });
  }
}

module.exports = {
  getAllResources,
  createResource,
  getResourceURL
};