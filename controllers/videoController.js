// VideoController.js
const { minioClient, bucketName, initializeBucket } = require('../config/minio');
const Video = require('../models/Video');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { Worker } = require('bullmq');
const Queue = require('bullmq').Queue;

// Create a queue for video transcoding
const videoQueue = new Queue('videoTranscode', {
  connection: {
    host: 'localhost',
    port: 6379,
  }
});

// Initialize the video controller
const initializeController = async () => {
  try {
    await initializeBucket();
    console.log('Video controller initialized successfully');
  } catch (error) {
    console.error('Failed to initialize video controller:', error);
  }
};

// Upload a video file to MinIO
const uploadVideo = async (req, res) => {
  const { userId } = req
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { originalname, path: filePath, mimetype, size } = req.file;
    const fileExtension = path.extname(originalname);
    const fileId = uuidv4();
    const fileName = `${fileId}${fileExtension}`;

    // Upload file to MinIO
    await minioClient.fPutObject(
      bucketName,
      `uploads/${fileName}`,
      filePath,
      { 'Content-Type': mimetype }
    );

    // Create video record in MongoDB
    const video = new Video({
      fileId,
      originalName: originalname,
      fileName,
      mimeType: mimetype,
      size,
      uploadDate: new Date(),
      status: 'uploaded',
      transcodingProgress: 0,
      formats: [],
      createdBy: userId
    });

    await video.save();

    // Clean up the temporary file
    fs.unlinkSync(filePath);

    // Add transcoding job to queue
    await videoQueue.add('transcode', {
      videoId: video._id,
      fileName
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    });

    return res.status(200).json({
      message: 'Video uploaded successfully',
      video: {
        id: video._id,
        originalName: video.originalName,
        status: video.status,
        uploadDate: video.uploadDate
      }
    });
  } catch (error) {
    console.error('Error uploading video:', error);
    return res.status(500).json({ message: 'Error uploading video', error: error.message });
  }
};

// Get video transcoding status
const getVideoStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const video = await Video.findById(id);
    
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    return res.status(200).json({
      id: video._id,
      originalName: video.originalName,
      status: video.status,
      transcodingProgress: video.transcodingProgress,
      formats: video.formats,
      uploadDate: video.uploadDate,
      completedDate: video.completedDate
    });
  } catch (error) {
    console.error('Error getting video status:', error);
    return res.status(500).json({ message: 'Error getting video status', error: error.message });
  }
};

// Get all videos
const getAllVideos = async (req, res) => {
  const limit = parseInt(req.query.limit);
  const lastCreatedAt = req.query.lastCreatedAt;
  let query = {};

  if (lastCreatedAt) {
    query = { createdAt: { $lt: new Date(lastCreatedAt) } };
  }

  try {
    const videos = await Video.find(query)
        .sort({ uploadDate: -1 })
        .limit(limit);

    const videoData = videos.map(video => ({
      id: video._id,
      originalName: video.originalName,
      status: video.status,
      transcodingProgress: video.transcodingProgress,
      size: video.size,
      type: video.mimeType,
      uploadDate: video.uploadDate,
      completedDate: video.completedDate
    }));

    return res.status(200).json(videoData);
  } catch (error) {
    console.error('Error fetching videos:', error);
    return res.status(500).json({ message: 'Error fetching videos', error: error.message });
  }
};

// Delete a video
const deleteVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const video = await Video.findById(id);
    
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    // Delete from MinIO
    if (video.fileName) {
      await minioClient.removeObject(bucketName, `uploads/${video.fileName}`);
    }

    // Delete HLS segments and manifests
    if (video.hlsPath) {
      try {
        const objects = await listObjects(`hls/${video.fileId}`);
        for (const obj of objects) {
          await minioClient.removeObject(bucketName, obj.name);
        }
      } catch (err) {
        console.error('Error deleting HLS files:', err);
      }
    }

    // Delete from MongoDB
    await Video.findByIdAndDelete(id);

    return res.status(200).json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Error deleting video:', error);
    return res.status(500).json({ message: 'Error deleting video', error: error.message });
  }
};

// Helper function to list objects in MinIO with a prefix
const listObjects = async (prefix) => {
  return new Promise((resolve, reject) => {
    const objects = [];
    const stream = minioClient.listObjects(bucketName, prefix, true);
    
    stream.on('data', (obj) => {
      objects.push(obj);
    });
    
    stream.on('error', (err) => {
      reject(err);
    });
    
    stream.on('end', () => {
      resolve(objects);
    });
  });
};

// Start the worker to process the queue
const startWorker = () => {
  const worker = new Worker('videoTranscode', async job => {
    const { videoId, fileName } = job.data;
    
    try {
      // Update status to transcoding
      await Video.findByIdAndUpdate(videoId, { 
        status: 'transcoding',
        transcodingProgress: 0
      });

      // Get the video from MinIO
      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const inputPath = path.join(tempDir, fileName);
      await minioClient.fGetObject(bucketName, `uploads/${fileName}`, inputPath);

      // Create HLS output directory
      const fileId = path.parse(fileName).name;
      const hlsOutputDir = path.join(tempDir, fileId); // Adjusted directory name
      if (!fs.existsSync(hlsOutputDir)) {
        fs.mkdirSync(hlsOutputDir, { recursive: true });
      }

      // Define resolutions for adaptive streaming
      const aspectRatio = 16 / 9;
      const resolutions = [
        { name: '1080p', width: Math.round(1080 * aspectRatio), height: 1080, bitrate: '5000k' },
        { name: '720p', width: Math.round(720 * aspectRatio), height: 720, bitrate: '2800k' },
        { name: '480p', width: Math.round(480 * aspectRatio), height: 480, bitrate: '1400k' }
      ];

      // Extract video duration to calculate overall progress
      const videoInfo = await getVideoInfo(inputPath);
      const videoDuration = videoInfo.duration;

      // Create master playlist
      let masterPlaylist = '#EXTM3U\n#EXT-X-VERSION:3\n';

      // Generate variants
      for (const resolution of resolutions) {
        masterPlaylist += `#EXT-X-STREAM-INF:BANDWIDTH=${parseInt(resolution.bitrate) * 1000},RESOLUTION=${resolution.width}x${resolution.height},NAME="${resolution.name}"\n`;
        masterPlaylist += `${resolution.name}/playlist.m3u8\n`;
      }
      
      // Write master playlist to file
      fs.writeFileSync(path.join(hlsOutputDir, 'master.m3u8'), masterPlaylist);

      // Track progress
      let overallProgress = 0;
      const progressWeight = 100 / resolutions.length;

      // Process each resolution
      for (const [index, resolution] of resolutions.entries()) {
        // Create directory for this resolution
        const resolutionDir = path.join(hlsOutputDir, resolution.name);
        if (!fs.existsSync(resolutionDir)) {
          fs.mkdirSync(resolutionDir, { recursive: true });
        }

        // Transcode to HLS
        await new Promise((resolve, reject) => {
          ffmpeg(inputPath)
            .outputOptions([
              '-c:v libx264',
              `-b:v ${resolution.bitrate}`,
              `-maxrate ${resolution.bitrate}`,
              `-bufsize ${parseInt(resolution.bitrate) * 2}k`,
              `-vf scale=-2:${resolution.height}`,
              '-c:a aac',
              '-b:a 128k',
              '-hls_time 6',
              '-hls_list_size 0',
              '-hls_segment_filename',
              path.join(resolutionDir, 'segment_%03d.ts'),
              '-threads 12', // Use all 12 CPU threads
              '-preset faster', // Use a faster preset for better performance
              '-f hls'
            ])
            .on('progress', progress => {
              // Calculate progress for this resolution
              const percent = Math.min(Math.round(progress.percent || 0), 100);
              const currentResolutionProgress = (index * progressWeight) + ((percent / 100) * progressWeight);
              
              // Update progress in MongoDB
              Video.findByIdAndUpdate(videoId, { 
                transcodingProgress: Math.round(currentResolutionProgress)
              }).catch(err => console.error('Error updating progress:', err));
            })
            .on('end', () => {
              overallProgress += progressWeight;
              resolve();
            })
            .on('error', (err) => {
              console.error(`Error transcoding ${resolution.name}:`, err);
              reject(err);
            })
            .save(path.join(resolutionDir, 'playlist.m3u8'));
        });
      }

      // Upload HLS segments and playlists to MinIO
      const uploadTasks = [];
      
      // Function to recursively upload all files in a directory
      const uploadDirectory = async (dir, baseDir) => {
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          
          if (stat.isDirectory()) {
            await uploadDirectory(filePath, baseDir);
          } else {
            // Determine the relative path for MinIO
            const relativePath = path.relative(baseDir, filePath);
            // Construct the MinIO path without the extra directory level
            const minioPath = `hls/${fileId}/${relativePath.replace(/\\/g, '/')}`;
            // Set content type based on file extension
            let contentType = 'application/octet-stream';
            if (file.endsWith('.m3u8')) {
              contentType = 'application/vnd.apple.mpegurl';
            } else if (file.endsWith('.ts')) {
              contentType = 'video/mp2t';
            }
            
            // Upload file to MinIO
            await minioClient.fPutObject(
              bucketName,
              minioPath,
              filePath,
              { 'Content-Type': contentType }
            );
          }
        }
      };

      // Upload all HLS files
      await uploadDirectory(hlsOutputDir, hlsOutputDir);

      // Update MongoDB with completed HLS path
      await Video.findByIdAndUpdate(videoId, {
        status: 'completed',
        transcodingProgress: 100,
        hlsPath: `hls/${fileId}/master.m3u8`,
        formats: resolutions.map(resolution => ({
          name: resolution.name,
          resolution: `${resolution.height}p`,
          bitrate: resolution.bitrate,
          path: `hls/${fileId}/${resolution.name}/playlist.m3u8`
        })),
        completedDate: new Date()
      });

      // Clean up
      fs.unlinkSync(inputPath);
      fs.rmSync(hlsOutputDir, { recursive: true, force: true });
      
      console.log(`HLS transcoding completed for video ${videoId}`);
    } catch (error) {
      console.error('Transcoding error:', error);
      
      // Update video status to failed
      await Video.findByIdAndUpdate(videoId, { 
        status: 'failed',
        error: error.message
      });
      
      throw error;
    }
  }, { 
    connection: {
      host: 'localhost',
      port: 6379
    },
    concurrency: 2 // Process 2 videos at a time
  });

  worker.on('completed', job => {
    console.log(`Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed with error ${err.message}`);
  });

  return worker;
};

// Helper function to get video information
const getVideoInfo = (filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        return reject(err);
      }
      
      const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
      const duration = parseFloat(metadata.format.duration || 0);
      
      resolve({
        duration,
        width: videoStream ? videoStream.width : 0,
        height: videoStream ? videoStream.height : 0,
        bitrate: metadata.format.bit_rate
      });
    });
  });
};

// Stream HLS video
// http://localhost:5000/api/videos1/67cb0b0a4005aeb1299fa25f/hls
// http://localhost:9000/videos/hls/45fdc58a-5166-46eb-bf3f-1be0877ea77b/hls_45fdc58a-5166-46eb-bf3f-1be0877ea77b/master.m3u8
const streamHls = async (req, res) => {
  try {
    const { id, file } = req.params;
    const video = await Video.findById(id);
    
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    if (video.status !== 'completed') {
      return res.status(400).json({ message: 'Video is not ready for streaming' });
    }

    // Determine the file path in MinIO
    let objectPath;
    
    if (!file) {
      // If no specific file is requested, return the master playlist
      console.log("using master playlist")
      objectPath = video.hlsPath;
    } else {
      console.log("using specific playlist")
      // For segment files or resolution-specific playlists
      objectPath = `hls/${video.fileId}/${file}`;
    }

    console.log(objectPath)
    // Get content type based on file extension
    let contentType = 'application/octet-stream';
    if (objectPath.endsWith('.m3u8')) {
      contentType = 'application/vnd.apple.mpegurl';
    } else if (objectPath.endsWith('.ts')) {
      contentType = 'video/mp2t';
    }

    // Set appropriate headers
    res.setHeader('Content-Type', contentType);
    
    // Check if file exists
    try {
      await minioClient.statObject(bucketName, objectPath);
    } catch (err) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Create a stream from MinIO
    const stream = await minioClient.getObject(bucketName, objectPath);
    
    // Pipe the stream to the response
    stream.pipe(res);
  } catch (error) {
    console.error('Error streaming video:', error);
    return res.status(500).json({ message: 'Error streaming video', error: error.message });
  }
};

// Get HLS information
const getHlsInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const video = await Video.findById(id);
    
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    if (video.status !== 'completed') {
      return res.status(400).json({ message: 'Video is not ready for streaming' });
    }

    return res.status(200).json({
      id: video._id,
      masterPlaylist: `${bucketName}/${video.hlsPath}`, // `/api/videos1/${video._id}/hls`
      formats: video.formats.map(format => ({
        name: format.name,
        resolution: format.resolution,
        playlist: `${bucketName}/${format.path}`// `/api/videos1/${video._id}/hls/${format.name}/playlist.m3u8`
      }))
    });
  } catch (error) {
    console.error('Error getting HLS info:', error);
    return res.status(500).json({ message: 'Error getting HLS info', error: error.message });
  }
};

const downloadVideo = async (req, res) => {
  const videoId = req.params.id;
  const resolution = req.params.resolution;

  try {
    // Find the video in MongoDB
    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    // Create a unique temporary directory
    const tempDirId = `${videoId.substring(0, 8)}-${Date.now()}`;
    const tempDir = path.join(__dirname, "temp", tempDirId);
    
    // Ensure the temporary directory exists
    fs.mkdirSync(tempDir, { recursive: true });
    console.log(`Created temp directory: ${tempDir}`);

    // Construct the path to the resolution folder in MinIO
    // videos/hls/fileid/resolution
    const folderPath = `hls/${video.fileId}/${resolution}`;
    
    // Create a file to list all TS files for ffmpeg concat
    const concatFilePath = path.join(tempDir, "concat.txt");
    const concatFileStream = fs.createWriteStream(concatFilePath);
    
    // Get all TS files in order from the resolution folder
    const tsFiles = [];
    try {
      const objectsList = minioClient.listObjectsV2(bucketName, folderPath, true);
      console.log(objectsList)
      for await (const obj of objectsList) {
        if (obj.name && obj.name.endsWith(".ts")) {
          tsFiles.push(obj.name);
        }
      }
      
      // Sort TS files by segment number
      tsFiles.sort((a, b) => {
        const segmentA = parseInt(a.match(/segment_(\d+)\.ts/)?.[1] || '0');
        const segmentB = parseInt(b.match(/segment_(\d+)\.ts/)?.[1] || '0');
        return segmentA - segmentB;
      });
      
      if (tsFiles.length === 0) {
        throw new Error(`No TS files found in ${folderPath}`);
      }
      
      console.log(`Found ${tsFiles.length} TS files`);
    } catch (err) {
      console.error("Error listing objects:", err);
      return res.status(500).json({ error: "Failed to list video segments" });
    }
    
    // Download each TS file and add to the concat list
    for (const tsFile of tsFiles) {
      const localFilePath = path.join(tempDir, path.basename(tsFile));
      
      try {
        // Download the file
        await new Promise((resolve, reject) => {
          minioClient.getObject(bucketName, tsFile, (err, dataStream) => {
            if (err) return reject(err);
            
            const fileStream = fs.createWriteStream(localFilePath);
            dataStream.pipe(fileStream);
            
            fileStream.on('finish', () => {
              // Add to concat file (escaped path for ffmpeg)
              concatFileStream.write(`file '${localFilePath.replace(/'/g, '\\\'')}'\n`);
              resolve();
            });
            
            fileStream.on('error', (err) => {
              reject(err);
            });
          });
        });
      } catch (err) {
        console.error(`Error downloading ${tsFile}:`, err);
        return res.status(500).json({ error: "Failed to download video segments" });
      }
    }
    
    // Close the concat file
    concatFileStream.end();
    
    // Output file path
    const outputFilePath = path.join(tempDir, "output.mp4");
    const sanitizedFilename = video.originalName.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const downloadFilename = `${sanitizedFilename}_${resolution}.mp4`;
    
    // Use fluent-ffmpeg to combine the files
    ffmpeg()
      .input(concatFilePath)
      .inputOptions(['-f concat', '-safe 0'])
      .outputOptions('-c copy')
      .output(outputFilePath)
      .on('start', (commandLine) => {
        console.log('Started ffmpeg with command:', commandLine);
      })
      .on('progress', (progress) => {
        console.log(`Processing: ${progress.percent ? progress.percent.toFixed(1) : 0}% done`);
      })
      .on('end', () => {
        console.log('FFmpeg processing finished');
        console.log(`File created at: ${outputFilePath}`);
        
        // Check if the file exists
        if (!fs.existsSync(outputFilePath)) {
          console.error(`Output file not found: ${outputFilePath}`);
          return res.status(500).json({ error: "Failed to create output file" });
        }
        
        // Get file stats to ensure it's not empty
        const stats = fs.statSync(outputFilePath);
        console.log(`File size: ${stats.size} bytes`);
        
        if (stats.size === 0) {
          console.error(`Output file is empty: ${outputFilePath}`);
          return res.status(500).json({ error: "Output file is empty" });
        }
        
        // Serve the combined .mp4 file for download
        res.download(outputFilePath, downloadFilename, (err) => {
          if (err) {
            console.error(`Error sending file: ${err}`);
          }
          
          // Clean up after download completes or errors
          setTimeout(() => {
            fs.rm(tempDir, { recursive: true, force: true }, (rmErr) => {
              if (rmErr) console.error(`Error cleaning up temp directory: ${rmErr}`);
              else console.log(`Cleaned up temp directory: ${tempDir}`);
            });
          }, 1000); // 1-second delay before cleanup
        });
      })
      .on('error', (err) => {
        console.error('FFmpeg processing error:', err);
        res.status(500).json({ error: "Failed to process video" });
        
        // Clean up on error
        setTimeout(() => {
          fs.rm(tempDir, { recursive: true, force: true }, (rmErr) => {
            if (rmErr) console.error(`Error cleaning up after error: ${rmErr}`);
          });
        }, 1000); // 1-second delay before cleanup
      })
      .run();
      
  } catch (error) {
    console.error("Error in download process:", error);
    res.status(500).json({ error: "Failed to download video: " + error.message });
  }
};

// Initialize controller when module is loaded
initializeController();

// Start the worker
const worker = startWorker();

module.exports = {
  uploadVideo,
  getVideoStatus,
  getAllVideos,
  deleteVideo,
  streamHls,
  getHlsInfo,
  downloadVideo
};