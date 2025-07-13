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
 * 5. CAPTION STYLE PRESET HANDLER
 * 6. POST ENDPOINT: /subtitles
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
import { logInfo, logProgress, logError } from './utils/logger.js';

// ────────────────────────────────────────────────
// 2. IN-MEMORY CACHE FOR JOB RESULTS
// ────────────────────────────────────────────────
const jobResults = {};

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
// 5. CAPTION STYLE PRESET HANDLER
// ────────────────────────────────────────────────
function getStylePreset(name) {
  switch (name) {
    case 'Hero Pop':
      return {
        fontColorHex: '#FFE600',
        outlineColorHex: '#000000',
        outlineWidth: 4,
        shadow: 2,
        box: false,
        boxColorHex: '#000000',
        boxPadding: 0,
        effects: { bold: true, italic: false, underline: false },
        caps: 'allcaps',
        animation: 'word-by-word'
      };
    case 'Emoji Pop':
      return {
        fontColorHex: '#FFFFFF',
        outlineColorHex: '#FF00FF',
        outlineWidth: 3,
        shadow: 2,
        box: true,
        boxColorHex: '#000000',
        boxPadding: 8,
        effects: { bold: true, italic: false, underline: false },
        caps: 'titlecase',
        animation: 'pop',
        enableEmojis: true
      };
    case 'Cinematic Fade':
      return {
        fontColorHex: '#DDDDDD',
        outlineColorHex: '#000000',
        outlineWidth: 2,
        shadow: 3,
        box: true,
        boxColorHex: '#00000080',
        boxPadding: 10,
        effects: { bold: false, italic: true, underline: false },
        caps: 'normal',
        animation: 'fade'
      };
    default:
      return {};
  }
}

// ────────────────────────────────────────────────
// 6. POST ENDPOINT: /subtitles
// ────────────────────────────────────────────────
app.post('/subtitles', async (req, res) => {
  try {
    const {
      videoUrl,
      fileName,
      fontName,
      fontSize,
      captionStyle,
      alignment,
      caps,
      customX,
      customY
    } = req.body;

    const jobId = uuidv4();
    const safeFileName = fileName || jobId;

    const presetOverrides = getStylePreset(captionStyle) || {};

    const resolvedFontColorHex = presetOverrides.fontColorHex;
    const resolvedOutlineColorHex = presetOverrides.outlineColorHex;
    const resolvedBoxColorHex = presetOverrides.boxColorHex;
    const resolvedOutlineWidth = presetOverrides.outlineWidth;
    const resolvedShadow = presetOverrides.shadow;
    const resolvedBox = presetOverrides.box;
    const resolvedBoxPadding = presetOverrides.boxPadding;
    const resolvedEffects = presetOverrides.effects || {};
    const resolvedCaps = caps || presetOverrides.caps;
    const resolvedAnimation = presetOverrides.animation;
    const resolvedEnableEmojis = presetOverrides.enableEmojis || false;

    // 🔁 Override positioning using alignment presets
    let finalCustomY = customY;
    if (alignment === 'top-safe') finalCustomY = 750;
    else if (alignment === 'bottom-safe') finalCustomY = -350;
    else if (alignment === 'center') finalCustomY = 0;

    logInfo("🚀 Sending response to Make", { jobId, success: true });
    res.json({ jobId, success: true });

    // ────────────────────────────────────────────────
    // BACKGROUND VIDEO RENDERING (ASYNC)
    // ────────────────────────────────────────────────
    setTimeout(async () => {
      try {
        await fs.promises.mkdir('output', { recursive: true });

        const audioPath = `output/${safeFileName}.mp3`;
        await extractAudio(videoUrl, audioPath);

        const whisperResponse = await whisperTranscribe(audioPath);
        const captions = whisperResponse.segments.map(segment => ({
          start: secondsToAss(segment.start),
          end: secondsToAss(segment.end),
          text: segment.text.trim()
        }));

        logProgress("Captions Generated", captions);

        const subtitleFilePath = await buildSubtitlesFile({
          jobId,
          fontName,
          fontSize,
          fontColor: resolvedFontColorHex,
          styleMode: resolvedBox ? 'box' : 'outline',
          boxColor: resolvedBoxColorHex,
          enablePadding: true,
          outlineColorHex: resolvedOutlineColorHex,
          outlineWidth: resolvedOutlineWidth,
          shadow: resolvedShadow,
          shadowColorHex: '#000000',
          lineSpacing: 0,
          animation: resolvedAnimation,
          customX,
          customY: finalCustomY,
          effects: resolvedEffects,
          caps: resolvedCaps,
          lineLayout: 'single',
          enableEmojis: resolvedEnableEmojis,
          captions
        });

        const videoOutputPath = `output/${safeFileName}.mp4`;
        await renderVideoWithSubtitles(videoUrl, subtitleFilePath, videoOutputPath);
        const videoUrlFinal = await uploadToCloudinary(videoOutputPath, `captions-app/${safeFileName}`);

        jobResults[jobId] = {
          success: true,
          videoUrl: videoUrlFinal
        };
      } catch (err) {
        logError("Background processing error", err);
      }
    }, 10);

  } catch (err) {
    logError("Server error", err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// ────────────────────────────────────────────────
// 7. JOB STATUS LOOKUP ENDPOINT: /results/:jobId
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
  logInfo(`🚀 Server running on port ${port}`);
});
