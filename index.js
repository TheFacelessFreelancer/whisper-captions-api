import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import { exec } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { buildSubtitlesFile } from './utils/subtitleBuilder.js';
import { hexToASS } from './utils/colors.js';
import cloudinary from './utils/cloudinary.js';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json({ limit: '50mb' }));

// In-memory job tracker (used for polling)
const jobQueue = {};

app.post('/subtitles', async (req, res) => {
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
      preferredFilename
    } = req.body;

    const jobId = uuidv4();
    jobQueue[jobId] = { status: 'processing' };

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

    const outputDir = path.join('output');
    await fs.promises.mkdir(outputDir, { recursive: true });

    const outputFileName = preferredFilename ? `${preferredFilename}.mp4` : `${jobId}.mp4`;
    const outputPath = path.join(outputDir, outputFileName);

    const command = `ffmpeg -y -i "${videoUrl}" -vf "subtitles=${subtitleFilePath},scale=720:-2" -c:v libx264 -preset ultrafast -crf 28 -c:a copy "${outputPath}"`;

    console.log(`▶ Running: ${command}`);

    exec(command, async (error, stdout, stderr) => {
      if (error) {
        console.error("❌ FFmpeg error:", error.message);
        jobQueue[jobId] = { status: 'error', error: error.message };
        fs.writeFileSync(`results/${jobId}.json`, JSON.stringify({ success: false, error: error.message }, null, 2));
        return;
      }

      console.log(`✅ Render complete: ${outputPath}`);

      // Upload to Cloudinary
      const cloudResult = await cloudinary.uploader.upload(outputPath, {
        resource_type: 'video',
        folder: 'captions-app',
        public_id: preferredFilename || jobId
      });

      const cloudUrl = cloudResult.secure_url;

      // Update job status
      jobQueue[jobId] = { status: 'ready', url: cloudUrl };
      fs.writeFileSync(`results/${jobId}.json`, JSON.stringify({ success: true, url: cloudUrl }, null, 2));

      console.log(`🌐 Uploaded to Cloudinary: ${cloudUrl}`);
    });

    // Return jobId immediately
    res.json({
      success: true,
      jobId: jobId
    });

  } catch (err) {
    console.error("❌ Server error:", err.message);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// Status Tracker route for polling
app.get('/results/:jobId', (req, res) => {
  const { jobId } = req.params;
  const resultFile = path.join('results', `${jobId}.json`);

  if (fs.existsSync(resultFile)) {
    const data = fs.readFileSync(resultFile, 'utf-8');
    res.setHeader('Content-Type', 'application/json');
    res.end(data);
  } else {
    res.json({ success: false, status: 'processing' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
