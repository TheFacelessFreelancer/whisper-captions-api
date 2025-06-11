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

app.post('/subtitles', async (req, res) => {
  const jobId = uuidv4();

  // ✅ Return the jobId immediately
  res.json({ jobId });

  // 🔁 Continue processing in the background
  handleJob(req.body, jobId);
});

async function handleJob(body, jobId) {
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
    } = body;

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

    console.time("🎧 Render video");

    const command = `ffmpeg -y -i "${videoUrl}" -vf "subtitles=${subtitleFilePath},scale=720:-2" -c:a copy "${videoOutputPath}"`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error("❌ FFmpeg error:", error.message);
        return;
      }

      console.timeEnd("🎧 Render video");
      console.log("✅ Final video written:", videoOutputPath);
    });

  } catch (err) {
    console.error("❌ Render job error:", err.message);
  }
}

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
