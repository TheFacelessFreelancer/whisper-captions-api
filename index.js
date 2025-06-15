/**
 * index.js - Express server for dynamic subtitle rendering
 *
 * Handles:
 * - Subtitle creation via ASS styling
 * - FFmpeg rendering (modularized)
 * - Cloudinary video delivery
 * - Job ID returns for polling (immediate response)
 * - Cross-origin and logging support
 * - Non-blocking background rendering (Make.com safe)
 *
 * ────────────────────────────────────────────────
 * TABLE OF CONTENTS
 * ────────────────────────────────────────────────
 * 1. IMPORTS AND DEPENDENCIES
 * 2. EXPRESS SERVER SETUP
 * 3. POST ENDPOINT: /subtitles
 * 4. BACKGROUND VIDEO RENDERING (DETACHED)
 * 5. EXPRESS SERVER LISTENER
 */

// ────────────────────────────────────────────────
// 1. IMPORTS AND DEPENDENCIES
// ────────────────────────────────────────────────
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import morgan from 'morgan';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { buildSubtitlesFile } from './utils/subtitleBuilder.js';
import { hexToASS } from './utils/colors.js';
import { uploadToCloudinary } from './utils/cloudinary.js';
import { renderVideoWithSubtitles } from './utils/ffmpeg.js';

// ────────────────────────────────────────────────
// 2. EXPRESS SERVER SETUP
// ────────────────────────────────────────────────
const app = express();
const port = process.env.PORT || 3000;
app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.json({ limit: '50mb' }));

// ────────────────────────────────────────────────
// 3. POST ENDPOINT: /subtitles
// ────────────────────────────────────────────────
app.post('/subtitles', async (req, res) => {
  try {
    const {
      videoUrl,
      fileName,
      fontName,
      fontSize,
      fontColorHex,
      lineSpacing,
      animation,
      outlineColorHex,
      outlineWidth,
      shadow,
      box,
      boxColorHex,
      boxPadding,
      customX,
      customY,
      preset,
      effects,
      caps,
      lineLayout,
      captions
    } = req.body;

    const jobId = uuidv4();
    const safeFileName = fileName || jobId;

    const fontColor = hexToASS(fontColorHex);
    const outlineColor = hexToASS(outlineColorHex);
    const boxColor = hexToASS(boxColorHex);

    // ✅ Immediate response to Make (non-blocking)
    console.log("🚀 Sending response to Make:", { jobId, success: true });
    res.json({ jobId, success: true });

    // ────────────────────────────────────────────────
    // 4. BACKGROUND VIDEO RENDERING (DETACHED)
    // ────────────────────────────────────────────────
    setTimeout(async () => {
  try {
    await fs.promises.mkdir('output', { recursive: true });

    // Step 1: Download audio from video
    const audioPath = `output/${safeFileName}.mp3`;
    const videoPath = videoUrl; // Cloudinary-hosted URL
    await extractAudio(videoPath, audioPath);

    // Step 2: Transcribe audio to captions using Whisper
    const whisperResponse = await whisperTranscribe(audioPath);

    const captions = whisperResponse.segments.map(segment => ({
      start: Number(segment.start).toFixed(2).replace('.', ':'),
      end: Number(segment.end).toFixed(2).replace('.', ':'),
      text: segment.text.trim()
    }));

    console.log("📺 Captions Generated from Whisper:", captions);

    // Step 3: Generate subtitles and render video
    const subtitleFilePath = await buildSubtitlesFile({
      jobId,
      fontName,
      fontSize,
      fontColor,
      lineSpacing,
      animation,
      outlineColor,
      outlineWidth,
      shadow,
      box,
      boxColor,
      boxPadding,
      customX,
      customY,
      effects,
      caps,
      lineLayout,
      captions
    });

    const videoOutputPath = `output/${safeFileName}.mp4`;

    await renderVideoWithSubtitles(videoUrl, subtitleFilePath, videoOutputPath);

    await uploadToCloudinary(videoOutputPath, `captions-app/${safeFileName}`);

  } catch (err) {
    console.error("❌ Error in background rendering:", err.message);
  }
}, 10); // Ensure response is flushed first

// ────────────────────────────────────────────────
// 5. EXPRESS SERVER LISTENER
// ────────────────────────────────────────────────
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
