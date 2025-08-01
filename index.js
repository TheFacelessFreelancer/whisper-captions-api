/**
 * index.js - Express server for dynamic subtitle rendering
 *
 * Handles:
 * - Subtitle creation via ASS styling
 * - FFmpeg rendering (modularized)
 * - Whisper transcription
 * - Cloudinary video delivery
 * - Job ID returns for polling (immediate response)
 * - Cross-origin and logging support
 * - Non-blocking background rendering (Make.com safe)
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
import { renderVideoWithSubtitles, extractAudio } from './utils/ffmpeg.js';
import { uploadToCloudinary } from './utils/cloudinary.js';
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
  const cs = Math.floor((seconds % 1) * 100).toString().padStart(2, '0');
  return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${cs}`;
};

// ────────────────────────────────────────────────
// 5. POST ENDPOINT: /subtitles
// ────────────────────────────────────────────────
app.post('/subtitles', async (req, res) => {
  try {
    const {
      videoUrl,
      fileName,
      captionStyle,
      alignment,
      fontName,
      fontSize,
      fontColorHex,
      boxColorHex,
      outlineColorHex,
      outlineWidth,
      shadow,
      lineSpacing,
      caps,
      customX = 0,
      customY = 0
    } = req.body;

    const jobId = uuidv4();
    const safeFileName = fileName || jobId;

    res.json({ jobId, success: true });
    logInfo('🚀 Queued job', { jobId });

    setTimeout(async () => {
      try {
        await fs.promises.mkdir('output', { recursive: true });

        // 1️⃣ Extract audio
        const audioPath = `output/${safeFileName}.mp3`;
        await extractAudio(videoUrl, audioPath);

        // 2️⃣ Transcription
        const whisperRes = await whisperTranscribe(audioPath);
        const captions = whisperRes.segments.map(s => ({
          start: secondsToAss(s.start),
          end: secondsToAss(s.end),
          text: s.text.trim()
        }));
        logProgress('Captions Generated', captions);

        // 3️⃣ Build subtitle file
        const subtitleFilePath = await buildSubtitlesFile({
          jobId,
          captionStyle,
          alignment,
          fontName,
          fontSize,
          fontColor: fontColorHex,
          boxColorHex,
          outlineColorHex,
          outlineWidth,
          shadow,
          lineSpacing,
          caps,
          customX,
          customY,
          captions
        });

        // 4️⃣ Render video with subtitles
        const videoOutput = `output/${safeFileName}.mp4`;
        await renderVideoWithSubtitles(videoUrl, subtitleFilePath, videoOutput);

        // 5️⃣ Upload to Cloudinary
        const finalUrl = await uploadToCloudinary(videoOutput, `captions-app/${safeFileName}`);
        jobResults[jobId] = { success: true, videoUrl: finalUrl };
        logInfo('🎬 Rendering complete', { jobId, videoUrl: finalUrl });

      } catch (bgErr) {
        logError('Background processing error', bgErr);
        jobResults[jobId] = { success: false, error: bgErr.message };
      }
    }, 10);

  } catch (err) {
    logError('Server error', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// ────────────────────────────────────────────────
// 6. JOB STATUS LOOKUP ENDPOINT: /results/:jobId
// ────────────────────────────────────────────────
app.get('/results/:jobId', (req, res) => {
  const jobId = req.params.jobId;
  const result = jobResults[jobId];
  if (!result) {
    return res.json({ success: false, videoUrl: null, message: 'Job not ready yet' });
  }
  res.json({ jobId, success: true, videoUrl: result.videoUrl });
});

// ────────────────────────────────────────────────
// 7. EXPRESS SERVER LISTENER
// ────────────────────────────────────────────────
app.listen(port, () => {
  logInfo(`🚀 Server running on port ${port}`);
});
