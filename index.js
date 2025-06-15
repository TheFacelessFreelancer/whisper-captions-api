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
import { renderVideoWithSubtitles, extractAudio } from './utils/ffmpeg.js';
import whisperTranscribe from './utils/whisper.js';

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
      lineLayout
    } = req.body;

    const jobId = uuidv4();
    const safeFileName = fileName || jobId;

    const fontColor = hexToASS(fontColorHex);
    const outlineColor = hexToASS(outlineColorHex);
    const boxColor = hexToASS(boxColorHex);

    console.log("🚀 Sending response to Make:", { jobId, success: true });
    res.json({ jobId, success: true });

    // ────────────────────────────────────────────────
    // 4. BACKGROUND VIDEO RENDERING (DETACHED)
    // ────────────────────────────────────────────────
    setTimeout(async () => {
      try {
        await fs.promises.mkdir('output', { recursive: true });

        const audioPath = `output/${safeFileName}.mp3`;
        await extractAudio(videoUrl, audioPath);

        const whisperResponse = await whisperTranscribe(audioPath);

        const captions = whisperResponse.segments.map(segment => ({
          start: new Date(segment.start * 1000).toISOString().substr(11, 12),
          end: new Date(segment.end * 1000).toISOString().substr(11, 12),
          text: segment.text.trim()
        }));

        console.log("📺 Captions Generated:", captions);

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
        console.error("❌ Background processing error:", err.message);
      }
    }, 10); // Background task starts after response

  } catch (err) {
    console.error("❌ Server error:", err.message);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// ────────────────────────────────────────────────
// 5. EXPRESS SERVER LISTENER
// ────────────────────────────────────────────────
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
