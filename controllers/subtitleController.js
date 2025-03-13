const Subtitle = require('../models/Subtitle');
const Video = require('../models/Video');
const fs = require('fs');
const path = require('path');
const { minioClient, bucketName } = require('../config/minio');

// Helper function to read M3U8 file and update it to include subtitles
async function updateManifestFile(videoId, subtitleLanguage, subtitleManifestFileName) {
  try {
    // Get video info to locate the HLS files
    const video = await Video.findById(videoId);
    if (!video || !video.hlsPath) {
      throw new Error('Video not found or HLS path not available');
    }

    // Download the master manifest file
    const masterPlaylistData = await minioClient.getObject(bucketName, video.hlsPath);
    let masterPlaylistContent = await streamToString(masterPlaylistData);

    // Check if this subtitle is already in the manifest
    const subtitleEntry = `#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",LANGUAGE="${subtitleLanguage}",NAME="${getLanguageName(subtitleLanguage)}",DEFAULT=NO,AUTOSELECT=NO,FORCED=NO,URI="subtitle/${subtitleManifestFileName}"`;
    
    if (!masterPlaylistContent.includes(subtitleEntry)) {
      // Find the insertion point - typically before the first variant stream
      const variantIndex = masterPlaylistContent.indexOf('#EXT-X-STREAM-INF');
      
      if (variantIndex !== -1) {
        // If there are already subtitle entries, add after the last one
        const lastSubtitleIndex = masterPlaylistContent.lastIndexOf('#EXT-X-MEDIA:TYPE=SUBTITLES');
        
        if (lastSubtitleIndex !== -1) {
          const insertionPoint = masterPlaylistContent.indexOf('\n', lastSubtitleIndex) + 1;
          masterPlaylistContent = 
            masterPlaylistContent.substring(0, insertionPoint) + 
            subtitleEntry + '\n' + 
            masterPlaylistContent.substring(insertionPoint);
        } else {
          // If no subtitle entries yet, add before the first variant
          masterPlaylistContent = 
            masterPlaylistContent.substring(0, variantIndex) + 
            subtitleEntry + '\n' + 
            masterPlaylistContent.substring(variantIndex);
        }
        
        // Update all stream variants to include subtitle group
        masterPlaylistContent = masterPlaylistContent.replace(
          /^(#EXT-X-STREAM-INF:.+)$/gm, 
          (match) => {
            if (match.includes('SUBTITLES=')) {
              return match; // Already has subtitle info
            } else {
              return match + ',SUBTITLES="subs"';
            }
          }
        );

        // Upload the updated manifest back to MinIO
        await minioClient.putObject(
          bucketName,
          video.hlsPath,
          Buffer.from(masterPlaylistContent),
          { 'Content-Type': 'application/vnd.apple.mpegurl' }
        );
        
        console.log('Master playlist updated successfully');
      } else {
        throw new Error('Invalid master playlist format');
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error updating manifest file:', error);
    throw error;
  }
}

async function updateSubtitleManifestFile(directory, language) {
  const manifestPath = directory.split('/');
  const hls = manifestPath[0]; 
  const fileId = manifestPath[1];
  const subtitleFolder = manifestPath[2];
  const vttFileName = manifestPath[3]; 
  const manifestFileName = `subtitles_${language}.m3u8`;
  const fullPath = `${hls}/${fileId}/${subtitleFolder}/${manifestFileName}`;
  
  try {
    // Get the subtitle playlist data
    const subtitlePlaylistData = await minioClient.getObject(bucketName, fullPath);
    
    // Convert the stream to string properly
    let subtitlePlaylistContent = '';
    for await (const chunk of subtitlePlaylistData) {
      subtitlePlaylistContent += chunk.toString();
    }
    
    // Split by proper newlines based on the original content
    const separator = subtitlePlaylistContent.includes('\r\n') ? '\r\n' : '\n';
    
    // Remove the line containing the .vtt file name
    const lines = subtitlePlaylistContent.split(separator);
    const filteredLines = lines.filter(line => !line.includes(vttFileName));
    const updatedContent = filteredLines.join(separator);
    
    // Convert string to buffer before uploading
    const updatedBuffer = Buffer.from(updatedContent);
    
    // Upload the updated content back to MinIO with content type
    await minioClient.putObject(
      bucketName, 
      fullPath, 
      updatedBuffer, 
      updatedBuffer.length,
      'application/x-mpegURL'  // Specify the correct content type for M3U8 files
    );
    
    console.log('Manifest file updated successfully.');
    return true;
  } catch (error) {
    console.error('Error updating manifest file:', error);
    throw error;
  }
}

// Helper to convert stream to string
function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    stream.on('error', reject);
  });
}

// Get readable language name
function getLanguageName(code) {
  const languages = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'zh': 'Chinese',
    'ja': 'Japanese',
    'ko': 'Korean',
    'ar': 'Arabic'
  };
  
  return languages[code] || code;
}

exports.createSubtitle = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { videoId, language } = req.body;
    if (!videoId || !language) {
      return res.status(400).json({ message: 'Video ID and language are required' });
    }

    // Check if video exists
    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    // Check for duplicate subtitle language
    const existingSubtitle = await Subtitle.findOne({ videoId, language });
    if (existingSubtitle) {
      return res.status(400).json({ message: `Subtitle for ${language} already exists for this video` });
    }

    const subtitleFile = req.file; // Use req.file instead of req.files.file
    
    // Validate file extension
    if (!subtitleFile.originalname.toLowerCase().endsWith('.vtt')) {
      return res.status(400).json({ message: 'Only .vtt files are supported' });
    }

    // Create a unique filename for the subtitle file
    const subtitleFileName = `${language}_${Date.now()}.vtt`;
    
    // Determine the path where the video's HLS files are stored
    // Assuming hlsPath in video model contains the full path like 'bucketname/hls/fileid/master.m3u8'
    const hlsPathParts = video.hlsPath.split('/');
    const objectDir = path.dirname(hlsPathParts.slice(1).join('/'));
    
    // Read the subtitle file from the temporary location
    const fileData = fs.readFileSync(subtitleFile.path);

    // Upload the subtitle file to MinIO in the same directory as the video
    const subtitleFilePath = `${hlsPathParts[0]}/${hlsPathParts[1]}/subtitle/${subtitleFileName}`;
    await minioClient.putObject(
      bucketName, 
      subtitleFilePath,
      fileData,
      { 'Content-Type': 'text/vtt' }
    );

    // Generate the subtitle manifest file content
    const subtitleManifestContent = `#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-VERSION:7
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PLAYLIST-TYPE:VOD
#EXTINF:10.000,
${subtitleFileName}
#EXT-X-ENDLIST
`;

    // Create a unique filename for the subtitle manifest file
    const subtitleManifestFileName = `subtitles_${language}.m3u8`;

    // Upload the subtitle manifest file to MinIO
    const subtitleManifestPath = `${hlsPathParts[0]}/${hlsPathParts[1]}/subtitle/${subtitleManifestFileName}`;
    await minioClient.putObject(
      bucketName,
      subtitleManifestPath,
      Buffer.from(subtitleManifestContent),
      { 'Content-Type': 'application/vnd.apple.mpegurl' }
    );

    // Update the master playlist to include the subtitle manifest file
    await updateManifestFile(videoId, language, subtitleManifestFileName);

    // Save subtitle record in database
    const subtitle = new Subtitle({
      videoId,
      language,
      filePath: subtitleFilePath, // Path to the .vtt file
      manifestPath: subtitleManifestPath, // Path to the .m3u8 file
    });

    await subtitle.save();

    // Delete the temporary file
    fs.unlinkSync(subtitleFile.path);

    return res.status(201).json({ 
      message: 'Subtitle uploaded successfully',
      subtitle
    });
  } catch (error) {
    console.error('Error uploading subtitle:', error);
    return res.status(500).json({ message: 'Error uploading subtitle', error: error.message });
  }
};

exports.getSubtitlesByVideo = async (req, res) => {
  try {
    const videoId = req.params.id;
    const subtitles = await Subtitle.find({ videoId }).sort({ createdAt: -1 });
    return res.status(200).json(subtitles);
  } catch (error) {
    console.error('Error fetching subtitles:', error);
    return res.status(500).json({ message: 'Error fetching subtitles', error: error.message });
  }
};

exports.deleteSubtitle = async (req, res) => {
  try {
    const { id } = req.params;
    
    const subtitle = await Subtitle.findById(id);
    if (!subtitle) {
      return res.status(404).json({ message: 'Subtitle not found' });
    }

    // Get video information
    const video = await Video.findById(subtitle.videoId);
    if (!video) {
      return res.status(404).json({ message: 'Associated video not found' });
    }

    // Delete the subtitle file from MinIO
    await minioClient.removeObject(bucketName, subtitle.filePath);

    // Remove the subtitle entry from the manifest file
    await updateSubtitleManifestFile(subtitle.filePath, subtitle.language);

    // Delete the subtitle record from the database
    await subtitle.deleteOne();

    return res.status(200).json({ message: 'Subtitle deleted successfully' });
  } catch (error) {
    console.error('Error deleting subtitle:', error);
    return res.status(500).json({ message: 'Error deleting subtitle', error: error.message });
  }
};