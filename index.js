import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import { exec } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { buildSubtitlesFile } from './utils/subtitleBuilder.js';
import { hexToASS } from './utils/colors.js';

const app = express();
const port = process.env.PORT || 3000;

await fs.promises.mkdir('output', { recursive: true });
await fs.promises.mkdir('jobs', { recursive: true });

app.use(bodyParser.json({ limit: '50mb' }));

// ✅ Module 1: Create Captions
app.post('/subtitles', async (req, res) => {
  const jobId = uuidv4();

  // Return the jobId immediately
  res.json({ jobId });

  // Start background render
  handleJob(req.body, jobId);
});

// ✅ Module 2: Status Tracker
app.get('/results/:jobId', async (req, res) => {
  const jobPath = path.join('jobs', `${req.params.jobId}.json`);

  try {
    const data = await fs.promises.readFile(jobPath, 'utf-8');
    res.json(JSON.parse(data));
  } catch (err) {
    res.status(404).json({
      success: false,
      status: 'not_found',
      message: 'Job not found.'
    });
  }
});

// 🧠 Background renderer
async function handleJob(settings, jobId) {
  try {
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
      preset,
      outputFileName
    } = settings;

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

    // ✅ Determine final filename
    const safeFileName = outputFileName?.trim().replace(/[^a-z0-9_-]/gi, "_") || jobId;
    const outputPath = `output/${safeFileName}.mp4`;

    console.time("🎬 FFmpeg render");

    const command = `ffmpeg -y -i "${videoUrl}" -vf "subtitles=${subtitleFilePath},scale=720:-2" -c:v libx264 -preset ultrafast -crf 28 -c:a copy "${outputPath}"`;

    console.log('▶ Running:', command);

    exec(command, async (error, stdout, stderr) => {
      if (error) {
        console.error("❌ FFmpeg error:", error.message);
        return await saveJobStatus(jobId, {
          success: false,
          status: 'failed',
          error: error.message
        });
      }

      const publicUrl = `https://res.cloudinary.com/YOUR_CLOUD_NAME/video/upload/v123456789/${safeFileName}.mp4`;

      console.log("✅ Render complete:", publicUrl);

      await saveJobStatus(jobId, {
        success: true,
        status: 'ready',
        url: publicUrl
      });
    });

  } catch (err) {
    console.error("❌ Job handler failed:", err.message);
    await saveJobStatus(jobId, {
      success: false,
      status: 'failed',
      error: err.message
    });
  }
}

// 💾 Save result JSON for polling
async function saveJobStatus(jobId, data) {
  const filePath = path.join('jobs', `${jobId}.json`);
  await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
}

app.listen(port, () => {
  console.log(`🚀 Caption Factory API running on port ${port}`);
});
