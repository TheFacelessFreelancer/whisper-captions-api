import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs-extra';
import axios from 'axios';
import ffmpeg from 'fluent-ffmpeg';
import { v4 as uuidv4 } from 'uuid';
import { buildAssSubtitles } from './utils/subtitleBuilder.js';
import uploadToCloudinary from './utils/cloudinary.js';

const app = express();
const port = 10000;

app.use(bodyParser.json({ limit: '100mb' }));

app.post('/generate-subtitles', async (req, res) => {
  const { videoUrl, captions } = req.body;
  const uid = Date.now();

  const videoPath = `uploads/input-${uid}.mp4`;
  const assPath = `uploads/${uid}.ass`;
  const outputPath = `uploads/output-${uid}.mp4`;

  try {
    console.log(`🎬 Starting subtitle generation for: ${videoUrl}`);

    const response = await axios({ method: 'GET', url: videoUrl, responseType: 'stream' });
    await fs.ensureFile(videoPath);
    const writer = fs.createWriteStream(videoPath);
    response.data.pipe(writer);
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    console.log('✅ Video downloaded:', videoPath);

    const assContent = buildAssSubtitles(captions);
    await fs.outputFile(assPath, assContent);
    console.log('✅ ASS file written:', assPath);

    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .videoFilters(`ass='${assPath}'`)
        .outputOptions(['-c:a copy', '-vf scale=720:-2'])
        .on('end', resolve)
        .on('error', reject)
        .save(outputPath);
    });
    console.log('✅ Final video rendered:', outputPath);

    const cloudinaryUrl = await uploadToCloudinary(outputPath);
    console.log('✅ Uploaded to Cloudinary:', cloudinaryUrl);

    res.json({ videoUrl: cloudinaryUrl });
  } catch (error) {
    console.error('❌ FULL ERROR STACK:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  } finally {
    await Promise.all([
      fs.remove(videoPath),
      fs.remove(assPath),
      fs.remove(outputPath),
    ]);
    console.log('🧹 Cleaned up temporary files.');
  }
});

app.listen(port, () => {
  console.log(`🚀 Server is listening on port ${port}`);
});
