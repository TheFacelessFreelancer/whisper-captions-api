// index.js
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

    console.time('⏱️ Total Time');

    console.log(`\n📥 Downloading video from: ${videoUrl}`);
    console.time('⬇️ Download video');
    const response = await fetch(videoUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.ensureFile(videoPath);
    await fs.writeFile(videoPath, buffer);
    console.timeEnd('⬇️ Download video');

    console.log('🔊 Extracting audio with FFmpeg...');
    console.time('🎧 Extract audio');
    await execAsync(`ffmpeg -i "${videoPath}" -vn -acodec libmp3lame -ar 44100 -b:a 192k "${audioPath}" -y`);
    console.timeEnd('🎧 Extract audio');

    console.log('📝 Transcribing audio with Whisper...');
    console.time('🧠 Transcribe audio');
    const transcript = await whisperTranscribe(audioPath);
    console.timeEnd('🧠 Transcribe audio');

    const events = transcript.segments.map(seg => ({
      start: seg.start,
      end: seg.end,
      text: seg.text
    }));

    console.log('🎨 Building styled subtitle file...');
    console.time('🧾 Generate subtitles');
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
    console.timeEnd('🧾 Generate subtitles');

    console.log('🎬 Rendering final video with subtitles...');
    console.time('📽️ Render final video');
    await execAsync(`ffmpeg -i "${videoPath}" -vf "ass='${subtitlePath}'" -c:v libx264 -preset fast -crf 23 -c:a copy "${outputPath}" -y`);
    console.timeEnd('📽️ Render final video');

    console.log('☁️ Uploading final video to Cloudinary...');
    console.time('☁️ Upload to Cloudinary');
    const cloudinaryUrl = await uploadToCloudinary(outputPath);
    console.timeEnd('☁️ Upload to Cloudinary');

    console.timeEnd('⏱️ Total Time');
    console.log('✅ Done! Final video URL:', cloudinaryUrl);
    res.json({ success: true, url: cloudinaryUrl });

  } catch (err) {
    console.error('❌ FULL ERROR STACK:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(port, () => {
  console.log(`\n🚀 Server is listening on port ${port}`);
});
