/**
 * index.js - Express server for dynamic subtitle rendering
 *
 * Handles:
 * - Subtitle creation via ASS styling
 * - FFmpeg rendering
 * - Cloudinary video delivery
 * - Job ID returns for polling
 *
 * ────────────────────────────────────────────────
 * TABLE OF CONTENTS
 * ────────────────────────────────────────────────
 * 1. IMPORTS AND DEPENDENCIES
 * 2. EXPRESS SERVER SETUP
 * 3. POST ENDPOINT: /subtitles
 * 4. SUBTITLE FILE CREATION
 * 5. VIDEO RENDERING WITH FFMPEG
 * 6. RESPONSE WITH JOB ID
 */

// ────────────────────────────────────────────────
// 1. IMPORTS AND DEPENDENCIES
// ────────────────────────────────────────────────
import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import { exec } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { buildSubtitlesFile } from './utils/subtitleBuilder.js';
import { hexToASS } from './utils/colors.js';

// ────────────────────────────────────────────────
// 2. EXPRESS SERVER SETUP
// ────────────────────────────────────────────────
const app = express();
const port = process.env.PORT || 3000;
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

    // ────────────────────────────────────────────────
    // 4. SUBTITLE FILE CREATION
    // ────────────────────────────────────────────────
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

    // ────────────────────────────────────────────────
    // 5. VIDEO RENDERING WITH FFMPEG
    // ────────────────────────────────────────────────
    const videoOutputPath = `output/${safeFileName}.mp4`;
    await fs.promises.mkdir('output', { recursive: true });

    const command = `ffmpeg -y -i "${videoUrl}" -vf "subtitles=${subtitleFilePath},scale=720:-2" -c:v libx264 -preset ultrafast -crf 28 -c:a copy "${videoOutputPath}"`;
    console.log(`▶ Running: ${command}`);

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error("❌ FFmpeg error:", error.message);
        return res.status(500).json({ error: 'Failed to process video with subtitles.' });
      }

      // ────────────────────────────────────────────────
      // 6. RESPONSE WITH JOB ID
      // ────────────────────────────────────────────────
      console.log(`✅ Render complete: https://res.cloudinary.com/de3ip4mlt/video/upload/v123456789/${safeFileName}.mp4`);
      res.json({
        success: true,
        jobId: jobId,
        url: `https://res.cloudinary.com/de3ip4mlt/video/upload/v123456789/${safeFileName}.mp4`,
        status: 'ready'
      });
    });

  } catch (err) {
    console.error("❌ Server error:", err.message);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// ────────────────────────────────────────────────
// EXPRESS SERVER LISTENER
// ────────────────────────────────────────────────
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
