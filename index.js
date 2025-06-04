import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs-extra';
import path from 'path';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { buildAssSubtitle } from './utils/subtitleBuilder.js';
import whisperTranscribe from './utils/whisper.js';
import uploadToCloudinary from './utils/cloudinary.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 10000;

app.use(bodyParser.json({ limit: '100mb' }));

app.post('/subtitles', async (req, res) => {
  const {
    videoUrl,
    fontSize = 42,
    fontColor = '&H00FFFFFF',
    fontName = 'Arial',
    outlineColor = '&H00000000',
    outlineWidth = 4,
    alignment = 8,
    marginV = 300,
    animation = true,
    box = true,
    boxColor = '&H00000000'
  } = req.body;

  const id = Date.now();
  const videoPath = `uploads/input-${id}.mp4`;
  const audioPath = `uploads/input-${id}.mp3`;
  const subtitlePath = `uploads/${id}.ass`;
  const outputPath = `uploads/output-${id}.mp4`;

  try {
    if (!videoUrl || !videoUrl.startsWith('http')) {
      throw new Error('Invalid video URL. Must be an absolute URL.');
    }

    console.log(`📥 Downloading video from: ${videoUrl}`);
    const response = await fetch(videoUrl);
    const buffer = await response.buffer();
    await fs.ensureFile(videoPath);
    await fs.writeFile(videoPath, buffer);
    console.log('✅ Video file saved:', videoPath);

    console.log('🔊 Extracting audio with FFmpeg...');
    await execAsync(`ffmpeg -i "${videoPath}" -q:a 0 -map a "${audioPath}" -y`);

    console.log('📝 Transcribing audio with Whisper...');
    const transcript = await whisperTranscribe(audioPath);
    const events = transcript.segments.map(seg => ({
      start: seg.start,
      end: seg.end,
      text: seg.text
    }));

    console.log('🎨 Building styled subtitle file...');
    const assContent = buildAssSubtitle(events, {
      fontSize,
      fontColor,
      fontName,
      outlineColor,
      outlineWidth,
      alignment,
      marginV,
      animation,
      box,
      boxColor
    });
    await fs.writeFile(subtitlePath, assContent);

    console.log('🎬 Rendering final video with subtitles...');
    await execAsync(`ffmpeg -i "${videoPath}" -vf "ass='${subtitlePath}'" -c:a copy "${outputPath}" -y`);

    console.log('☁️ Uploading final video to Cloudinary...');
    const cloudinaryUrl = await uploadToCloudinary(outputPath);

    console.log('✅ Done! Final video URL:', cloudinaryUrl);
    res.json({ success: true, url: cloudinaryUrl });
  } catch (err) {
    console.error('❌ FULL ERROR STACK:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server is listening on port ${port}`);
});
