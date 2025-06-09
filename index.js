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

  // ✅ CENTER-BASED COORDINATE LOGIC
  let resolvedX = 540; // center
  let resolvedY = 960; // center

  if (preset) {
    let yOffset = 0;

    switch (preset) {
      case 'top-safe':
        yOffset = +750; // above center
        break;
      case 'bottom-safe':
        yOffset = -350; // below center
        break;
      case 'center':
        yOffset = 0;
        break;
      default:
        console.warn('⚠ Unknown preset:', preset);
    }

    resolvedY = 960 - yOffset;
  } else {
    resolvedX = typeof customX === 'number' ? customX : 540;
    resolvedY = typeof customY === 'number' ? customY : 960;
  }

  const jobId = `${Date.now()}`;
  res.json({
    success: true,
    status: "processing",
    jobId,
    message: "Rendering started in background. Poll /results/:jobId for status."
  });

  const videoPath = `uploads/input-${jobId}.mp4`;
  const audioPath = `uploads/input-${jobId}.mp3`;
  const subtitlePath = `uploads/${jobId}.ass`;
  const outputPath = `uploads/output-${jobId}.mp4`;
  const resultPath = `uploads/result-${jobId}.json`;

  try {
    setTimeout(async () => {
      console.log(`🚀 [${jobId}] Starting render...`);

      const response = await fetch(videoUrl);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await fs.ensureFile(videoPath);
      await fs.writeFile(videoPath, buffer);

      await extractAudio(videoPath, audioPath);

      const transcript = await whisperTranscribe(audioPath);

      const events = transcript.segments.map(seg => ({
        start: seg.start,
        end: seg.end,
        text: seg.text
      }));

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

      const absoluteSubtitlePath = path.resolve(subtitlePath).replace(/\\/g, '/');
      await renderVideoWithSubtitles(videoPath, absoluteSubtitlePath, outputPath);

      const cloudinaryUrl = await uploadToCloudinary(outputPath);

      await fs.writeFile(resultPath, JSON.stringify({
        success: true,
        url: cloudinaryUrl,
        completedAt: Date.now()
      }));

      console.log(`✅ [${jobId}] Render complete:`, cloudinaryUrl);

      await Promise.allSettled([
        fs.unlink(videoPath),
        fs.unlink(audioPath),
        fs.unlink(subtitlePath),
        fs.unlink(outputPath)
      ]);
    }, 0);

  } catch (err) {
    console.error(`❌ [${jobId}] Error:`, err);
    await fs.writeFile(resultPath, JSON.stringify({
      success: false,
      error: err.message
    }));
  }
});

app.get('/results/:jobId', async (req, res) => {
  const resultPath = `uploads/result-${req.params.jobId}.json`;
  if (await fs.pathExists(resultPath)) {
    const data = await fs.readJson(resultPath);
    res.json(data);
  } else {
    res.status(202).json({ success: false, status: "processing" });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
