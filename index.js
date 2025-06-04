import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs-extra';
import path from 'path';
import fetch import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs-extra';
import path from 'path';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { buildAssSubtitle } from './utils/subtitleBuilder.js';
import whisperTranscribe from './utils/whisper.js';
import { uploadToCloudinary } from './utils/cloudinary.js';
import { renderSubtitledVideo } from './utils/ffmpeg.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 10000;
const uploadDir = path.join(__dirname, 'uploads');

await fs.ensureDir(uploadDir);
app.use(bodyParser.json({ limit: '100mb' }));

app.post('/subtitles', async (req, res) => {
  const {
    videoUrl,
    fontName = 'Arial',
    fontSize = 42,
    textColor = 'FFFFFF',
    outlineColor = '000000',
    alignment = 2,
    marginV = 100,
    blockStyle = true,
    blockColor = '000000',
    animation = 'fade',
    shadow = 1
  } = req.body;

  const id = Date.now();
  const videoPath = `${uploadDir}/input-${id}.mp4`;
  const audioPath = `${uploadDir}/audio-${id}.mp3`;
  const subtitlePath = `${uploadDir}/${id}.ass`;
  const outputPath = `${uploadDir}/output-${id}.mp4`;

  try {
    console.log(`📥 Downloading video from: ${videoUrl}`);
    const response = await fetch(videoUrl);
    const buffer = await response.buffer();
    await fs.writeFile(videoPath, buffer);

    console.log('🔊 Extracting audio...');
    await execAsync(`ffmpeg -i "${videoPath}" -q:a 0 -map a "${audioPath}" -y`);

    console.log('📝 Transcribing audio...');
    const transcript = await whisperTranscribe(audioPath);
    const events = transcript.segments.map(s => ({
      start: s.start,
      end: s.end,
      text: s.text
    }));

    console.log('🎨 Generating styled subtitles...');
    const assContent = buildAssSubtitle(events, {
      fontName,
      fontSize,
      textColor,
      outlineColor,
      alignment,
      marginV,
      blockStyle,
      blockColor,
      animation,
      shadow
    });
    await fs.writeFile(subtitlePath, assContent);

    console.log('🎬 Rendering video with subtitles...');
    await renderSubtitledVideo({
      inputPath: videoPath,
      subtitlePath,
      outputPath
    });

    console.log('☁️ Uploading final video...');
    const video_url = await uploadToCloudinary(outputPath);

    res.json({ success: true, video_url });
  } catch (err) {
    console.error('❌ FULL ERROR STACK:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/ping', (req, res) => {
  res.send('Server is up!');
});

app.listen(port, () => {
  console.log(`🚀 Server is listening on port ${port}`);
});
 'node-fetch';
import { fileURLToPath } from 'url';
import { buildAssSubtitle } from './utils/subtitleBuilder.js';
import whisperTranscribe from './utils/whisper.js';
import { uploadToCloudinary } from './utils/cloudinary.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 10000;

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
    boxColor = '&H00000000',
  } = req.body;

  const id = Date.now();
  const videoPath = `uploads/input-${id}.mp4`;
  const audioPath = `uploads/input-${id}.mp3`;
  const subtitlePath = `uploads/${id}.ass`;
  const outputPath = `uploads/output-${id}.mp4`;

  try {
    const response = await fetch(videoUrl);
    const buffer = await response.buffer();
    await fs.ensureFile(videoPath);
    await fs.writeFile(videoPath, buffer);

    await execAsync(`ffmpeg -i "${videoPath}" -q:a 0 -map a "${audioPath}" -y`);

    const transcript = await whisperTranscribe(audioPath);

    const events = transcript.segments.map((segment) => ({
      start: segment.start,
      end: segment.end,
      text: segment.text,
    }));

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
      boxColor,
    });

    await fs.writeFile(subtitlePath, assContent);

    await execAsync(`ffmpeg -i "${videoPath}" -vf "ass='${subtitlePath}'" -c:a copy "${outputPath}" -y`);

    const cloudinaryUrl = await uploadToCloudinary(outputPath);

    res.json({ success: true, url: cloudinaryUrl });
  } catch (err) {
    console.error('❌ FULL ERROR STACK:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server is listening on port ${port}`);
});
