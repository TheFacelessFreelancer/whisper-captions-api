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
import { extractAudio, renderVideoWithSubtitles } from './utils/ffmpeg.js';

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
    lineSpacing = 0,
    shadow = 0,
    animation = 'fade',
    box = true,
    boxColor = '&H00FFFFFF',
    boxPadding = 10,
    preset,
    customX,
    customY
  } = req.body;

  const allowedFonts = [
    'DejaVu Sans',
    'Arial',
    'Impact',
    'Verdana',
    'Liberation Sans',
    'Courier New',
    'Times New Roman',
    'FreeSans'
  ];

  if (!allowedFonts.includes(fontName)) {
    return res.status(400).json({
      success: false,
      error: `Unsupported font: ${fontName}. Use: ${allowedFonts.join(', ')}`
    });
  }

  if (fontSize < 24 || fontSize > 80) {
    return res.status(400).json({ success: false, error: 'Font size must be between 24 and 80' });
  }

  if (!['fade', 'none'].includes(animation)) {
    return res.status(400).json({ success: false, error: 'Invalid animation type' });
  }

  // ✅ POSITIONING LOGIC (preset overrides custom)
  let resolvedX = 540; // default center
  let resolvedY = 960; // default center

  if (preset) {
    switch (preset) {
      case 'top-safe':
        resolvedY = 1710;
        break;
      case 'bottom-safe':
        resolvedY = 610;
        break;
      case 'center':
        resolvedY = 960;
        break;
      default:
        console.warn('⚠ Unknown preset:', preset);
    }
  } else {
    resolvedX = typeof customX === 'number' ? customX : 540;
    resolvedY = typeof customY === 'number' ? customY : 960;
  }

  const id = Date.now();
  const videoPath = `uploads/input-${id}.mp4`;
  const audioPath = `uploads/input-${id}.mp3`;
  const subtitlePath = `uploads/${id}.ass`;
  const outputPath = `uploads/output-${id}.mp4`;

  try {
    console.log('📥 Downloading video:', videoUrl);
    const response = await fetch(videoUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.ensureFile(videoPath);
    await fs.writeFile(videoPath, buffer);

    console.time('🎧 Step 3: Extract audio');
    await extractAudio(videoPath, audioPath);
    console.timeEnd('🎧 Step 3: Extract audio');

    console.time('🧠 Step 4: Transcribe');
    const transcript = await whisperTranscribe(audioPath);
    console.timeEnd('🧠 Step 4: Transcribe');

    const events = transcript.segments.map(seg => ({
      start: seg.start,
      end: seg.end,
      text: seg.text
    }));

    console.time('🧾 Step 5: Generate subtitles');
    const assContent = buildAssSubtitle(events, {
      fontSize,
      fontColor,
      fontName,
      outlineColor,
      outlineWidth,
      lineSpacing,
      shadow,
      animation,
      box,
      boxColor,
      boxPadding,
      customX: resolvedX,
      customY: resolvedY
    });
    await fs.writeFile(subtitlePath, assContent);
    console.timeEnd('🧾 Step 5: Generate subtitles');

    const absoluteSubtitlePath = path.resolve(subtitlePath).replace(/\\/g, '/');

    console.time('🎬 Step 6: Render video');
    await renderVideoWithSubtitles(videoPath, absoluteSubtitlePath, outputPath);
    console.timeEnd('🎬 Step 6: Render video');

    console.log('☁ Uploading to Cloudinary...');
    const cloudinaryUrl = await uploadToCloudinary(outputPath);

    await Promise.allSettled([
      fs.unlink(videoPath),
      fs.unlink(audioPath),
      fs.unlink(subtitlePath),
      fs.unlink(outputPath)
    ]);

    res.json({ success: true, url: cloudinaryUrl });

  } catch (err) {
    console.error('❌ ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
