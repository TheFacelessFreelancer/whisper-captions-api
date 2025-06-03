import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { OpenAI } from 'openai';

import { uploadToCloudinary } from './utils/cloudinary.js';
import { renderSubtitledVideo } from './utils/ffmpeg.js';
import { buildAssSubtitle } from './utils/subtitleBuilder.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;
const upload = multer({ dest: 'uploads/' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

app.post('/generate', upload.single('file'), async (req, res) => {
  try {
    const {
      video_url,
      font_name,
      font_size,
      font_color,
      position,
      background_box,
      custom_margin_top,
      custom_margin_bottom,
      animation,
    } = req.body;

    // Download video from URL to local path
    const inputPath = `downloads/input_${Date.now()}.mp4`;
    const outputPath = `outputs/output_${Date.now()}.mp4`;

    const response = await fetch(video_url);
    const buffer = await response.arrayBuffer();
    fs.mkdirSync('downloads', { recursive: true });
    fs.writeFileSync(inputPath, Buffer.from(buffer));

    // Transcribe audio
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(inputPath),
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['word'],
    });

    const segments = transcription.words;

    // Build subtitle track
    const subtitlePath = `subtitles/${Date.now()}.ass`;
    fs.mkdirSync('subtitles', { recursive: true });
    buildAssSubtitle(segments, {
      path: subtitlePath,
      font_name,
      font_size,
      font_color,
      position,
      background_box,
      custom_margin_top,
      custom_margin_bottom,
      animation,
    });

    // Render video with subtitles
    fs.mkdirSync('outputs', { recursive: true });
    await renderSubtitledVideo(inputPath, subtitlePath, outputPath);

    // Upload result
    const publicId = `captioned_${Date.now()}`;
    const finalUrl = await uploadToCloudinary(outputPath, publicId);

    // Cleanup
    [inputPath, subtitlePath, outputPath].forEach((f) => fs.existsSync(f) && fs.unlinkSync(f));

    res.json({ video_url: finalUrl });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Something went wrong.', details: err.message });
  }
});

app.get('/', (req, res) => {
  res.send('Caption Generator API is running.');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
