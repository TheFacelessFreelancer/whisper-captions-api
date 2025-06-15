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
 * 2. IN-MEMORY CACHE FOR JOB RESULTS
 * 3. EXPRESS SERVER SETUP
 * 4. TIMECODE FORMATTER: seconds → ASS time
 * 5. POST ENDPOINT: /subtitles
 * 6. BACKGROUND VIDEO RENDERING (ASYNC)
 * 7. JOB STATUS LOOKUP ENDPOINT: /results/:jobId
 * 8. EXPRESS SERVER LISTENER
 */

// ────────────────────────────────────────────────
// 1. IMPORTS AND DEPENDENCIES
// ────────────────────────────────────────────────
import path from 'path';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import morgan from 'morgan';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { buildSubtitlesFile } from './utils/subtitleBuilder.js';
import { hexToASS } from './utils/colors.js';
import { uploadToCloudinary } from './utils/cloudinary.js';
import { renderVideoWithSubtitles, extractAudio } from './utils/ffmpeg.js';
import whisperTranscribe from './utils/whisper.js';

// ────────────────────────────────────────────────
// 2. In-memory cache for completed jobs
// ────────────────────────────────────────────────
const jobResults = {}; // Store completed job results in memory

// ────────────────────────────────────────────────
// 3. EXPRESS SERVER SETUP
// ────────────────────────────────────────────────
const app = express();
const port = process.env.PORT || 3000;
app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.json({ limit: '50mb' }));

// ────────────────────────────────────────────────
// 4. TIMECODE FORMATTER: seconds → ASS time
// ────────────────────────────────────────────────
const secondsToAss = (seconds) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100).toString().padStart(2, '0');
  return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
};

// ────────────────────────────────────────────────
// 5. POST ENDPOINT: /subtitles
// ────────────────────────────────────────────────
app.post('/subtitles', async (req, res) => {
  try {
    const {
      videoUrl,
      fileName,
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
      preset,
      effects,
      caps,
      lineLayout
    } = req.body;

    const jobId = uuidv4();
    const safeFileName = fileName || jobId;

    const fontColorAss = hexToASS(fontColor);
    const outlineColorAss = hexToASS(outlineColor);
    const boxColorAss = hexToASS(boxColor);

    // 🔁 Override positioning using preset (bottom-safe, top-safe, etc.)
    let finalCustomY = customY;
    if (preset === 'top-safe') finalCustomY = 750;
    else if (preset === 'bottom-safe') finalCustomY = -350;
    else if (preset === 'center') finalCustomY = 0;

    // ✅ Respond to Make immediately
    console.log("🚀 Sending response to Make:", { jobId, success: true });
    res.json({ jobId, success: true });

    // ────────────────────────────────────────────────
    // 6. BACKGROUND VIDEO RENDERING
    // ────────────────────────────────────────────────
    setTimeout(async () => {
      try {
        await fs.promises.mkdir('output', { recursive: true });

        // Step 1: Extract audio from video
        const audioPath = `output/${safeFileName}.mp3`;
        await extractAudio(videoUrl, audioPath);

        // Step 2: Transcribe with Whisper
        const whisperResponse = await whisperTranscribe(audioPath);

        // Step 3: Format Whisper segments into captions[]
        const captions = whisperResponse.segments.map(segment => ({
          start: secondsToAss(segment.start),
          end: secondsToAss(segment.end),
          text: segment.text.trim()
        }));

        console.log("📺 Captions Generated:", captions);

        // Step 4: Build .ass subtitle file
        const subtitleFilePath = await buildSubtitlesFile({
          jobId,
          fontName,
          fontSize,
          fontColor: fontColorAss,
          lineSpacing,
          animation,
          outlineColor: outlineColorAss,
          outlineWidth,
          shadow,
          box,
          boxColor: boxColorAss,
          boxPadding,
          customX,
          customY: finalCustomY,
          effects,
          caps,
          lineLayout,
          captions
        });

        // Step 5: Render and upload
        const videoOutputPath = `output/${safeFileName}.mp4`;
        await renderVideoWithSubtitles(videoUrl, subtitleFilePath, videoOutputPath);
        const videoUrlFinal = await uploadToCloudinary(videoOutputPath, `captions-app/${safeFileName}`);

        jobResults[jobId] = {
          success: true,
          videoUrl: videoUrlFinal
        };

      } catch (err) {
        console.error("❌ Background processing error:", err.message);
      }
    }, 10); // Background task starts after response

  } catch (err) {
    console.error("❌ Server error:", err.message);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// ────────────────────────────────────────────────
// 7. JOB STATUS LOOKUP ENDPOINT
// ────────────────────────────────────────────────
app.get('/results/:jobId', (req, res) => {
  const jobId = req.params.jobId;
  const result = jobResults[jobId];

  if (!result) {
    return res.json({
      success: false,
      videoUrl: null,
      message: 'Job not ready yet'
    });
  }

  res.json({
    jobId,
    success: true,
    videoUrl: result.videoUrl
  });
});

// ────────────────────────────────────────────────
// 8. EXPRESS SERVER LISTENER
// ────────────────────────────────────────────────
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
