import dotenv from 'dotenv';
dotenv.config();

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
  console.log("📨 FULL REQUEST BODY:", req.body);

  const {
    videoUrl,
    fontSize = 42,
    fontColor = '&H00FFFFFF',
    fontName = 'Arial',
    outlineColor = '&H00000000',
    outlineWidth = 4,
    alignment = 2,
    marginV = 100,
    lineSpacing = 0,
    shadow = 0,
    animation = 'fade',
    box = true,
    boxColor = '&H00FFFFFF',
    boxPadding = 10,
    customX,
    customY,
    preset
  } = req.body;

  // Input validation
  if (fontSize < 24 || fontSize > 80) {
    return res.status(400).json({ success: false, error: 'Font size must be between 24 and 80' });
  }
  if (!['fade', 'none'].includes(animation)) {
    return res.status(400).json({ success: false, error: 'Invalid animation type' });
  }

  const id = Date.now();
  const videoPath = `uploads/input-${id}.mp4`;
  const audioPath = `uploads/input-${id}.mp3`;
  const subtitlePath = `uploads/${id}.ass`;
  const outputPath = `uploads/output-${id}.mp4`;

  try {
    console.log('📦 Raw videoUrl from Make:', videoUrl);
    if (!videoUrl || typeof videoUrl !== 'string' || !videoUrl.startsWith('http')) {
      console.error('❌ Invalid video URL:', { receivedValue: videoUrl, receivedType: typeof videoUrl });
      throw new Error('Invalid video URL. Must be an absolute URL starting with http/https');
    }

    console.log('✅ Step 1 complete: Video URL is valid');
    console.log(`📥 Step 2: Downloading video from: ${videoUrl}`);
    const response = await fetch(videoUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.ensureFile(videoPath);
    await fs.writeFile(videoPath, buffer);
    console.log('✅ Step 2 complete: Video file saved:', videoPath);

    console.time('🎧 Step 3: Extract audio');
    await execAsync([
      'ffmpeg',
      '-i', videoPath,
      '-vn',
      '-acodec', 'libmp3lame',
      '-ar', '44100',
      '-b:a', '192k',
      audioPath,
      '-y'
    ], { shell: false });
    console.timeEnd('🎧 Step 3: Extract audio');

    console.time('🧠 Step 4: Transcribe audio');
    const transcript = await whisperTranscribe(audioPath);
    console.timeEnd('🧠 Step 4: Transcribe audio');

    const events = transcript.segments.map(seg => ({
      start: seg.start,
      end: seg.end,
      text: seg.text
    }));

    console.time('🧾 Step 5: Generate subtitles');
