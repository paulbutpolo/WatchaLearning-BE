// controllers/userController.js
const { minioClient, bucketName } = require('../config/minio');
const Video = require('../models/Video');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const SRTParser2 = require('srt-parser-2').default;
const parser = new SRTParser2();


const transcodingProgress = {};
let isProcessing = false;

const uploadVideo = async (req, res) => {
  const { userId } = req;
  const { description } = req.body;
  
  console.log("Starting Upload");

  if (isProcessing) {
    return res.status(409).json({ error: "An upload/transcoding is already in progress" });
  }

  isProcessing = true;

  const file = req.file;
  if (!file) {
    isProcessing = false;
    return res.status(400).json({ error: "No file uploaded" });
  }

  const filename = file.originalname; // Use original filename for progress tracking
  const parsedFilename = path.parse(file.filename).name;
  const originalExtension = path.extname(file.originalname);
  const hlsFolder = `uploads/${parsedFilename}_hls`;

  if (!fs.existsSync(hlsFolder)) fs.mkdirSync(hlsFolder);

  // Mark video as 'processing' in MongoDB
  await Video.findOneAndUpdate(
    { title: filename },
    { title: filename, description, status: "processing", originalExtension, createdBy: userId},
    { upsert: true, new: true }
  );

  const resolutions = [
    { folder: "1080p", scale: "1920x1080", bitrate: "1500k", maxrate: "2000k", bufsize: "3000k" },
    { folder: "720p", scale: "1280x720", bitrate: "800k", maxrate: "1200k", bufsize: "1600k" },
    { folder: "480p", scale: "854x480", bitrate: "400k", maxrate: "600k", bufsize: "800k" },
  ];

  resolutions.forEach((res) => {
    const folderPath = path.join(hlsFolder, res.folder);
    if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath);
  });

  // Initialize transcoding progress
  transcodingProgress[filename] = 0;

  // Send initial response
  res.json({ 
    message: "Video upload started", 
    parsedFilename: parsedFilename,
    originalFilename: filename 
  });

  const ffmpegCommand = ffmpeg(file.path)
    .on("start", () => console.log("FFmpeg process started"))
    .on("progress", (progress) => {
      // transcodingProgress[filename] = Math.round(progress.percent);
      transcodingProgress[filename] = progress.percent;
      
    })
    .on("end", async () => {
      console.log("Transcoding finished");
      transcodingProgress[filename] = 100;
      
      const masterPlaylist = resolutions
        .map((res) => `#EXT-X-STREAM-INF:BANDWIDTH=${parseInt(res.bitrate) * 1000},RESOLUTION=${res.scale}\n${res.folder}/index.m3u8`)
        .join("\n");
      fs.writeFileSync(path.join(hlsFolder, "master.m3u8"), `#EXTM3U\n#EXT-X-VERSION:3\n${masterPlaylist}`);

      const uploadFiles = async (pathToFileOrFolder) => {
        const MAX_CONCURRENT_UPLOADS = 10; // Limit the number of concurrent uploads
        let activeUploads = 0;
        const queue = [];
      
        const processQueue = async () => {
          while (queue.length > 0 && activeUploads < MAX_CONCURRENT_UPLOADS) {
            const { filePath, objectName } = queue.shift();
            activeUploads++;
      
            const fileStream = fs.createReadStream(filePath);
            minioClient.putObject(bucketName, objectName, fileStream, async (err) => {
              if (err) {
                console.error("Upload error:", err);
              } else {
                fs.unlink(filePath, (err) => err && console.error("Error deleting file:", err));
              }
      
              activeUploads--;
              await processQueue(); // Process the next file in the queue
            });
          }
        };
      
        if (fs.lstatSync(pathToFileOrFolder).isDirectory()) {
          const files = fs.readdirSync(pathToFileOrFolder);
          for (const file of files) {
            const filePath = path.join(pathToFileOrFolder, file);
            const objectName = `${filename}/${path.basename(pathToFileOrFolder)}/${file}`;
            queue.push({ filePath, objectName });
          }
        } else {
          const objectName = `${filename}/${path.basename(pathToFileOrFolder)}`;
          queue.push({ filePath: pathToFileOrFolder, objectName });
        }
      
        await processQueue(); // Start processing the queue
      };

      resolutions.forEach((res) => uploadFiles(path.join(hlsFolder, res.folder)));
      uploadFiles(path.join(hlsFolder, "master.m3u8"));

      const videoUrl = `http://localhost:9000/${bucketName}/${filename}/master.m3u8`;

      await Video.findOneAndUpdate(
        { title: filename },
        { url: videoUrl, status: "completed" }
      );

      fs.unlink(file.path, (err) => err && console.error("Error deleting original file:", err));

      setTimeout(() => {
        console.log(`Clearing progress for ${filename}`);
        delete transcodingProgress[filename];
        isProcessing = false;
      }, 10000);
    })
    .on("error", async (err) => {
      console.error("FFmpeg error:", err);

      await Video.findOneAndUpdate(
        { title: filename },
        { status: "failed" }
      );

      // Clear the transcoding progress
      delete transcodingProgress[filename];

      // Release the lock
      isProcessing = false;
    });

  resolutions.forEach((res) => {
    ffmpegCommand
      .output(path.join(hlsFolder, res.folder, "index.m3u8"))
      .videoCodec("libx264") // Use CPU for encoding
      .size(res.scale)
      .outputOptions([
        `-preset veryfast`, // Faster encoding
        `-g 48`,
        `-sc_threshold 0`,
        `-hls_time 4`,
        `-hls_playlist_type vod`,
        `-b:v ${res.bitrate}`,
        `-maxrate ${res.maxrate}`,
        `-bufsize ${res.bufsize}`,
        `-threads 12`, // Use all CPU threads
        `-bf 0`, // Disable B-frames
        `-movflags +faststart`, // Enable fast start
        `-hls_segment_filename ${path.join(hlsFolder, res.folder, "segment_%03d.ts")}`,
      ]);
  });
  
  ffmpegCommand.run();
};

const getTranscodingProgress = (req, res) => {
  console.log("Progress endpoint", req.params);
  const filename = req.params.filename;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Send initial progress
  sendUpdate();
  
  function sendUpdate() {
    // Get current progress, defaulting to 0 if not found
    const currentProgress = transcodingProgress[filename] !== undefined 
      ? transcodingProgress[filename] 
      : 0;
    
    // Round to one decimal place for display
    const displayProgress = Math.round(currentProgress * 10) / 10;
    
    console.log(`Progress endpoint ${filename}: ${displayProgress}%`);
    
    // Send to client
    res.write(`data: ${JSON.stringify({ progress: displayProgress })}\n\n`);
    
    // Close connection if we've reached 100%
    if (displayProgress >= 100) {
      console.log(`Sending final 100% progress for ${filename}`);
      clearInterval(interval);
      res.end();
    }
  }

  const interval = setInterval(sendUpdate, 1000);

  req.on("close", () => {
    console.log("Client disconnected");
    clearInterval(interval);
    res.end();
  });
};

const getVideos = async (req, res) => {
  try {
    const videos = await Video.find();
    res.json(videos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteVideo = async (req, res) => {
  const videoId = req.params.id;

  try {
    // Find the video in MongoDB
    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    // Delete the video files from MinIO
    const objectsList = await minioClient.listObjects(bucketName, video.title + "/");
    const deleteObjects = [];
    for await (const obj of objectsList) {
      deleteObjects.push(obj.name);
    }
    if (deleteObjects.length > 0) {
      await minioClient.removeObjects(bucketName, deleteObjects);
    }

    // Delete the video metadata from MongoDB
    await Video.findByIdAndDelete(videoId);

    res.json({ message: "Video deleted successfully" });
  } catch (err) {
    console.error("Error deleting video:", err);
    res.status(500).json({ error: "Failed to delete video" });
  }
};

const uploadSubtitle = async (req, res) => {
  const videoId = req.params.id;
  const subtitleFile = req.file;
  const language = req.body.language || "en"; // Get language from form or default to English

  if (!subtitleFile) {
    return res.status(400).json({ error: "No subtitle file uploaded" });
  }

  try {
    // Find the video in MongoDB
    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    // Create subtitle folder if it doesn't exist
    const subtitleDir = `${video.title}/subtitles`;
    
    // Upload the subtitle file to MinIO
    const subtitleFileName = `${language}.vtt`;
    const subtitlePath = `${subtitleDir}/${subtitleFileName}`;
    const fileStream = fs.createReadStream(subtitleFile.path);
    await minioClient.putObject(bucketName, subtitlePath, fileStream);
    
    // Create a subtitle playlist (required for HLS)
    const subtitlePlaylistContent = 
`#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:0
#EXT-X-PLAYLIST-TYPE:VOD
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:0,
${subtitleFileName}
#EXT-X-ENDLIST`;

    const playlistPath = `${subtitleDir}/${language}.m3u8`;
    const playlistStream = Readable.from([subtitlePlaylistContent]);
    await minioClient.putObject(bucketName, playlistPath, playlistStream);

    // Update the video document to include the subtitle
    const subtitleUrl = `http://localhost:9000/${bucketName}/${subtitleDir}/${language}.m3u8`;
    await Video.findByIdAndUpdate(videoId, {
      $push: { subtitles: { language, url: subtitleUrl } },
    });

    // Fetch the master playlist from MinIO
    const masterPlaylistPath = `${video.title}/master.m3u8`;
    let masterPlaylist = "";

    try {
      const dataStream = await minioClient.getObject(bucketName, masterPlaylistPath);
      masterPlaylist = await streamToString(dataStream);
    } catch (error) {
      console.error("Error fetching master playlist from MinIO:", error);
      return res.status(500).json({ error: "Failed to fetch master playlist" });
    }

    // Check if subtitle group exists in the master playlist
    if (!masterPlaylist.includes('GROUP-ID="subs"')) {
      // Add subtitle group to master playlist
      const subtitleEntry = `\n#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="${language.toUpperCase()}",DEFAULT=YES,AUTOSELECT=YES,FORCED=NO,LANGUAGE="${language}",URI="subtitles/${language}.m3u8"`;
      
      // Add subtitle group association to each variant stream
      const lines = masterPlaylist.split('\n');
      let updatedLines = [];
      
      for (const line of lines) {
        if (line.startsWith('#EXT-X-STREAM-INF:')) {
          updatedLines.push(`${line},SUBTITLES="subs"`);
        } else {
          updatedLines.push(line);
        }
      }
      
      masterPlaylist = updatedLines.join('\n') + subtitleEntry;
      
      // Upload the updated master playlist back to MinIO
      const updatedPlaylistStream = Readable.from([masterPlaylist]);
      await minioClient.putObject(bucketName, masterPlaylistPath, updatedPlaylistStream);
    }

    // Clean up local file
    fs.unlink(subtitleFile.path, (err) => {
      if (err) console.error("Error deleting temp subtitle file:", err);
    });

    res.json({ message: "Subtitle uploaded successfully" });
  } catch (error) {
    console.error("Error uploading subtitle:", error);
    res.status(500).json({ error: "Failed to upload subtitle" });
  }
};

const adjustSubtitle = async (req, res) => {
  try {
    const { id } = req.params;
    const { language, timeOffset } = req.body;

    if (!language || typeof timeOffset !== 'number') {
      return res.status(400).json({ error: 'Invalid request parameters' });
    }

    const subtitlePath = `${id}/subtitles/${language}.vtt`;
    const tempFilePath = path.join(__dirname, `${language}.vtt`);

    // 1. Download VTT from MinIO
    const fileStream = fs.createWriteStream(tempFilePath);
    await new Promise((resolve, reject) => {
      minioClient.getObject(bucketName, subtitlePath, (err, dataStream) => {
        if (err) return reject(err);
        dataStream.pipe(fileStream);
        dataStream.on('end', resolve);
        dataStream.on('error', reject);
      });
    });

    // Log the downloaded VTT content
    let vttContent = fs.readFileSync(tempFilePath, 'utf8');
    console.log('Downloaded VTT Content:', vttContent);

    // 2. Convert VTT to SRT format
    const srtContent = vttContent
      .replace(/WEBVTT\s+/, '') // Remove WEBVTT header
      .replace(/(\d{2}:\d{2})\.(\d{3})/g, '$1,$2'); // Replace periods with commas for milliseconds
    console.log('Converted SRT Content:', srtContent);
    
    // Parse SRT content
    let subtitles = parser.fromSrt(srtContent);
    console.log('Parsed Subtitles (Before Adjustment):', subtitles);

    if (subtitles.length === 0) {
      console.log('Using manual parser...');
      subtitles = manualParseSRT(srtContent);
      console.log('Manually Parsed Subtitles:', subtitles);
    }

    // 3. Adjust timestamps
    subtitles = subtitles.map(sub => {
      const startTimeMs = timeToMilliseconds(sub.startTime) + timeOffset;
      const endTimeMs = timeToMilliseconds(sub.endTime) + timeOffset;
    
      sub.startTime = millisecondsToTime(startTimeMs);
      sub.endTime = millisecondsToTime(endTimeMs);
      return sub;
    });
    console.log('Parsed Subtitles (After Adjustment):', subtitles);

    // 4. Convert back to VTT format
    let updatedVTT = subtitles
      .map(sub => `${sub.startTime.replace(/,/g, '.')} --> ${sub.endTime.replace(/,/g, '.')}\n${sub.text}`)
      .join('\n\n');
    updatedVTT = `WEBVTT\n\n${updatedVTT}`;
    console.log('Updated VTT Content:', updatedVTT);

    // 5. Save updated file
    fs.writeFileSync(tempFilePath, updatedVTT, 'utf-8');

    // 6. Upload back to MinIO
    await minioClient.fPutObject(bucketName, subtitlePath, tempFilePath, { 'Content-Type': 'text/vtt' });

    // Clean up temp file
    fs.unlinkSync(tempFilePath);

    return res.json({ message: 'Subtitle adjusted successfully' });

  } catch (error) {
    console.error('Error adjusting subtitle:', error);
    return res.status(500).json({ error: 'Internal server error' });
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
    const folderPath = `${video.title}/${resolution}`;
    
    // Create a file to list all TS files for ffmpeg concat
    const concatFilePath = path.join(tempDir, "concat.txt");
    const concatFileStream = fs.createWriteStream(concatFilePath);
    
    // Get all TS files in order from the resolution folder
    const tsFiles = [];
    try {
      const objectsList = minioClient.listObjectsV2(bucketName, folderPath, true);
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
    const sanitizedFilename = video.title.replace(/[^a-zA-Z0-9_.-]/g, "_");
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
          
          // // Clean up after download completes or errors
          // setTimeout(() => {
          //   fs.rm(tempDir, { recursive: true, force: true }, (rmErr) => {
          //     if (rmErr) console.error(`Error cleaning up temp directory: ${rmErr}`);
          //     else console.log(`Cleaned up temp directory: ${tempDir}`);
          //   });
          // }, 1000); // 1-second delay before cleanup
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

const getVideoById = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }
    res.json(video);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch video" });
  }
};

// Things needed here
const streamToString = (stream) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    stream.on("error", reject);
  });
};

function manualParseSRT(srtContent) {
  const subtitles = [];
  const blocks = srtContent.split('\n\n'); // Split into subtitle blocks

  blocks.forEach((block, index) => {
    const lines = block.split('\n');
    if (lines.length >= 2) {
      const [timeRange, ...textLines] = lines;
      const [startTime, endTime] = timeRange.split(' --> ');

      subtitles.push({
        id: index + 1,
        startTime,
        endTime,
        text: textLines.join('\n'),
      });
    }
  });

  return subtitles;
}

function timeToMilliseconds(time) {
  const [hms, ms] = time.split(','); // Split into hours:minutes:seconds and milliseconds
  const timeParts = hms.split(':'); // Split hours, minutes, seconds

  let hours = 0, minutes = 0, seconds = 0;

  if (timeParts. length === 3) {
    // HH:MM:SS format
    [hours, minutes, seconds] = timeParts;
  } else if (timeParts.length === 2) {
    // MM:SS format
    [minutes, seconds] = timeParts;
  } else {
    throw new Error(`Invalid time format: ${time}`);
  }

  return (+hours * 3600 + +minutes * 60 + +seconds) * 1000 + +ms; // Convert to milliseconds
}

function millisecondsToTime(ms) {
  const hours = Math.floor(ms / 3600000); // 1 hour = 3600000 ms
  const minutes = Math.floor((ms % 3600000) / 60000); // 1 minute = 60000 ms
  const seconds = Math.floor((ms % 60000) / 1000); // 1 second = 1000 ms
  const milliseconds = ms % 1000; // Remainder is milliseconds
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
}

// function adjustSubtitleTiming(vttContent, offsetMs) {
//   // Skip if no offset
//   if (offsetMs === 0) return vttContent;
  
//   // Parse and adjust times in the VTT file
//   const lines = vttContent.split('\n');
//   const adjusted = lines.map(line => {
//     // Look for timestamp lines (00:00:00.000 --> 00:00:00.000)
//     if (line.includes('-->')) {
//       const times = line.split('-->');
//       if (times.length === 2) {
//         const startTime = adjustTimeString(times[0].trim(), offsetMs);
//         const endTime = adjustTimeString(times[1].trim(), offsetMs);
//         return `${startTime} --> ${endTime}`;
//       }
//     }
//     return line;
//   });
  
//   return adjusted.join('\n');
// }

// function adjustTimeString(timeStr, offsetMs) {
//   // Parse HH:MM:SS.mmm format
//   const [hours, minutes, secondsMillis] = timeStr.split(':');
//   const [seconds, millis] = secondsMillis.split('.');
  
//   // Convert to milliseconds
//   let totalMs = parseInt(hours) * 3600000 + 
//                 parseInt(minutes) * 60000 + 
//                 parseInt(seconds) * 1000 + 
//                 parseInt(millis || 0);
  
//   // Apply offset
//   totalMs += offsetMs;
//   if (totalMs < 0) totalMs = 0;
  
//   // Convert back to HH:MM:SS.mmm
//   const newHours = Math.floor(totalMs / 3600000);
//   const newMinutes = Math.floor((totalMs % 3600000) / 60000);
//   const newSeconds = Math.floor((totalMs % 60000) / 1000);
//   const newMillis = totalMs % 1000;
  
//   // Format with leading zeros
//   return `${newHours.toString().padStart(2, '0')}:${
//     newMinutes.toString().padStart(2, '0')}:${
//     newSeconds.toString().padStart(2, '0')}.${
//     newMillis.toString().padStart(3, '0')}`;
// }

module.exports = {
  uploadVideo,
  getTranscodingProgress,
  getVideos,
  deleteVideo,
  uploadSubtitle,
  adjustSubtitle,
  downloadVideo,
  getVideoById,
};