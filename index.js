import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import { exec } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { buildSubtitlesFile } from './utils/subtitleBuilder.js';
import { hexToASS } from './utils/colors.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json({ limit: '50mb' }));

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
      preset
    } = req.body;

    const jobId = uuidv4();

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

    console.time("🎧 Extract audio");

    const command = `ffmpeg -y -i "${videoUrl}" -vf "subtitles=${subtitleFilePath}" -c:a copy "${videoOutputPath}"`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error("❌ FFmpeg error:", error.message);
        return res.status(500).json({ error: 'Failed to process video with subtitles.' });
      }

      console.timeEnd("🎧 Extract audio");

      res.json({
        success: true,
        url: `https://res.cloudinary.com/YOUR_CLOUD_NAME/video/upload/v123456789/${jobId}.mp4`,
        jobId,
        status: 'ready'
      });
    });

  } catch (err) {
    console.error("❌ Server error:", err.message);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
