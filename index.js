import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import { exec } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { buildSubtitlesFile } from './utils/subtitleBuilder.js';
import { hexToASS } from './utils/colors.js';
import path from 'path';

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json({ limit: '50mb' }));

const jobsDir = path.join('jobs');
fs.promises.mkdir(jobsDir, { recursive: true }); // ensure jobs folder exists

// ✅ CREATE CAPTIONS – start job & return jobId immediately
app.post('/subtitles', async (req, res) => {
  const jobId = uuidv4();

  // Immediately return the jobId
  res.json({ jobId });

  // Start rendering in background
  processRenderJob(req.body, jobId);
});

// ✅ STATUS TRACKER – poll for job results
app.get('/results/:jobId', async (req, res) => {
  const jobId = req.params.jobId;
  const jobPath = path.join(jobsDir, `${jobId}.json`);

  try {
    const data = await fs.promises.readFile(jobPath, 'utf-8');
    res.json(JSON.parse(data));
  } catch (err) {
    res.status(404).json({ success: false, status: 'not_found', message: 'Job not found.' });
  }
});

// ✅ BACKGROUND RENDER WORKER
async function processRenderJob(settings, jobId) {
  const {
    videoUrl,
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
    preset
  } = settings;

  try {
    const fontColor = hexToASS(fontColorHex);
    const outlineColor = hexToASS(outlineColorHex);
    const boxColor = hexToASS(boxColorHex);

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
      preset
    });

    const videoOutputPath = `output/${jobId}.mp4`;
    await fs.promises.mkdir('output', { recursive: true });

    const command = `ffmpeg -y -i "${videoUrl}" -vf "subtitles=${subtitleFilePath}" -c:a copy "${videoOutputPath}"`;

    console.log(`🎬 Starting FFmpeg: ${command}`);

    exec(command, async (error, stdout, stderr) => {
      if (error) {
        console.error("❌ FFmpeg error:", error.message);
        await saveJobStatus(jobId, {
          success: false,
          status: 'failed',
          error: error.message
        });
        return;
      }

      // 🔁 Replace this with actual upload logic if needed
      const cloudinaryUrl = `https://res.cloudinary.com/YOUR_CLOUD_NAME/video/upload/v123456789/${jobId}.mp4`;

      console.log('✅ Render complete:', cloudinaryUrl);

      await saveJobStatus(jobId, {
        success: true,
        status: 'ready',
        url: cloudinaryUrl
      });
    });

  } catch (err) {
    console.error("❌ Background render failed:", err.message);
    await saveJobStatus(jobId, {
      success: false,
      status: 'failed',
      error: err.message
    });
  }
}

// ✅ Save job status to disk
async function saveJobStatus(jobId, data) {
  const filePath = path.join(jobsDir, `${jobId}.json`);
  await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
}

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
